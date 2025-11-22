# tool-foundry

A self-hosted server that builds available functions from scripts folder into a master 'tools.json', then runs a server to host an API gateway. Users invoking the API gateway connect to a 3rd party LLM provider, which invokes tool calls via the tools.json index or returns text responses.

## Installation

```bash
npm install
```

## Usage

```bash
npm run build
npm run deploy
```

## Configuration

Set the required API keys for the LLM provider in a `.env` file.

## License

MIT

## Author

xiaolintangyuan