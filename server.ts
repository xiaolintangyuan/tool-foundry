import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';

dotenv.config();

const app = express();
app.use(express.json());

// Serve PDF files statically
app.use('/pdfs', express.static(path.join(process.cwd(), 'pdfs')));

const PORT = process.env.GATEWAY_PORT || 3000;

// Build TOOL_MAPPING
const scriptsDir = path.join(process.cwd(), 'dist', 'scripts');
const TOOL_MAPPING: Record<string, Function> = {};

const files = fs.readdirSync(scriptsDir).filter((file: string) => file.endsWith('.js'));

for (const file of files) {
    const filePath = path.join(scriptsDir, file);
    const module = await import(pathToFileURL(filePath).href);
    const toolDef = module.default;
    if (toolDef && typeof toolDef === 'object') {
        for (const tool of Object.values(toolDef)) {
            if (tool && (tool as any).name && (tool as any).function) {
                TOOL_MAPPING[(tool as any).name] = (tool as any).function;
            }
        }
    }
}

app.post('/invoke/', async (req: express.Request, res: express.Response) => {
    try {
        const model = process.env.LLM_BASEMODEL;
        const { messages } = req.body;

        if (!Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Invalid messages: must be a non-empty array' });
        }

        // Format messages properly for OpenAI API
        let formattedMessages = messages.map(msg => {
            if (typeof msg === 'string') {
                return { role: 'user', content: msg };
            } else if (typeof msg === 'object' && msg.role && msg.content) {
                return msg;
            } else {
                throw new Error('Invalid message format');
            }
        });

        const tools = fs.readJsonSync('tools.json');

        let currentMessages = formattedMessages;
        let response;

        while (true) {
            const payload = {
                model,
                messages: currentMessages,
                tools,
            };

            const apiResponse = await fetch(`${process.env.LLM_BASEURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.LLM_APIKEY}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://github.com/xiaolintangyuan/tool-foundry',
                    'X-Title': `tool-foundry`
                },
                body: JSON.stringify(payload),
            });

            if (!apiResponse.ok) {
                throw new Error(`API error: ${apiResponse.status}`);
            }

            response = await apiResponse.json();
            const message = response.choices[0].message;

            if (message.tool_calls) {
                currentMessages.push(message);
                for (const toolCall of message.tool_calls) {
                    const { id, function: func } = toolCall;
                    const { name, arguments: argsStr } = func;
                    const args = JSON.parse(argsStr);
                    const result = await TOOL_MAPPING[name](args);
                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: id,
                        content: JSON.stringify(result),
                    });
                }
            } else {
                break;
            }
        }

        res.json({ response: response.choices[0].message });
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
