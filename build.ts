import fs from 'fs-extra';
import path from 'path';
import { pathToFileURL } from 'url';

const scriptsDir = path.join(process.cwd(), 'scripts');
const tools: any[] = [];

const files = fs.readdirSync(scriptsDir).filter((file: string) => file.endsWith('.js'));

for (const file of files) {
  const filePath = path.join(scriptsDir, file);
  const module = await import(pathToFileURL(filePath).href);
  const toolDef = module.default;
  if (toolDef && toolDef.name && toolDef.description && toolDef.parameters) {
    tools.push({
      type: 'function',
      function: {
        name: toolDef.name,
        description: toolDef.description,
        parameters: toolDef.parameters,
      },
    });
  }
}

fs.writeJsonSync('tools.json', tools);
console.log('tools.json generated');
