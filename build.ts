import fs from 'fs-extra';
import path from 'path';
import { pathToFileURL } from 'url';

const scriptsDir = path.join(process.cwd(), 'dist', 'scripts');
const tools: any[] = [];

const files = fs.readdirSync(scriptsDir).filter((file: string) => file.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(scriptsDir, file);
  const module = await import(pathToFileURL(filePath).href);
  const toolDef = module.default;
  if (toolDef && typeof toolDef === 'object') {
    for (const tool of Object.values(toolDef)) {
      if (tool && (tool as any).name && (tool as any).description && (tool as any).parameters) {
        tools.push({
          type: 'function',
          function: {
            name: (tool as any).name,
            description: (tool as any).description,
            parameters: (tool as any).parameters,
          },
        });
      }
    }
  }
}

fs.writeJsonSync('tools.json', tools);
console.log('tools.json generated');
