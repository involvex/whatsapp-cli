# WhatsApp CLI

A minimal terminal-based WhatsApp client built with TypeScript, [whatsapp-web.js](https://github.com/pedrosans/whatsapp-web.js), and Node.js readline.

## Features

- Clean CLI interface with colored output
- QR code authentication in terminal
- Menu-driven commands with settings panel
- Send and receive messages
- **AI Message Generation** support (OpenRouter, OpenAI, Gemini)
- Session persistence - no re-authentication needed after restart
- Production-ready and minimal

## Quick Start

```bash
# Install dependencies
bun install

# Run in development
bun dev

# Build for production
bun run build

# Start the CLI
bun start
```

## Installation

### Prerequisites

- **Node.js**: v18+ or **Bun**: v1.0+
- **Chrome/Chromium or Edge**: Installed in a standard location, or let Puppeteer manage Chrome
- **Memory**: Minimum 2GB RAM

### Browser Configuration

The CLI now tries browsers in this order:

1. `PUPPETEER_EXECUTABLE_PATH`
2. `BUN_CHROME_PATH`
3. Standard Chrome/Chromium/Edge install locations
4. Puppeteer's managed browser cache

If auto-detection fails, set an explicit path:

**Windows:**

```powershell
$env:PUPPETEER_EXECUTABLE_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

**macOS:**

```bash
export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
```

**Linux:**

```bash
export PUPPETEER_EXECUTABLE_PATH="/usr/bin/google-chrome"
```

If you do not have a local browser install, download Puppeteer's managed Chrome once:

```bash
bunx puppeteer browsers install chrome
```

## First Run

1. Run `bun start`
2. Scan the QR code with your WhatsApp app
3. Session is saved automatically for next time

## Usage

### Main Menu

```
1. List chats         - Show all your WhatsApp chats
2. Select chat        - Choose a chat to work with
3. Send message       - Send a message to the selected chat
4. Show chat history  - Display last 15 messages from chat
5. Toggle AI mode     - Enable/disable AI message generation
6. Settings           - Configure AI provider, model, temperature, tokens
7. About              - Show app information
8. Logout & reset     - Clear auth token and force re-scan QR code
Q. Exit               - Close the application
```

### AI Integration

Configure AI providers in Settings (option 6):

```bash
# Set API keys
export OPENROUTER_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here
export GEMINI_API_KEY=your_key_here
```

Supported providers:

- **OpenRouter** - Multi-model support (Claude, GPT, PaLM)
- **OpenAI** - GPT-3.5, GPT-4 models
- **Google Gemini** - Gemini AI models

## Development

```bash
# Format code
bun run format

# Type check
bun run typecheck

# Lint
bun run lint
bun run lint:fix

# Build
bun run build
```

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md)
- [Session Persistence](docs/SESSION_PERSISTENCE.md)
- [Security Policy](Security.md)
- [Claude Code Integration](Claude.md)
- [AI Agents](Agents.md)

## Project Structure

```
src/
├── cli.ts              # Main CLI entry point
├── client.ts           # WhatsApp Web.js wrapper
├── ui.ts               # Chalk-based UI utilities
├── config.ts           # Configuration management
├── settings.ts         # Interactive settings menu
└── readline-utils.ts   # CLI input utilities
```

## Troubleshooting

### Chrome Not Found

The CLI auto-detects Chrome/Chromium/Edge before falling back to Puppeteer's cache.
If startup still fails:

1. Verify a browser is installed.
2. Set `PUPPETEER_EXECUTABLE_PATH` to the exact browser executable.
3. Or install Puppeteer's managed browser: `bunx puppeteer browsers install chrome`
4. If you use a custom cache location, verify `PUPPETEER_CACHE_DIR`.

### DEP0040 Warning

`[DEP0040]` comes from the current `whatsapp-web.js -> node-fetch -> whatwg-url -> tr46`
dependency chain on newer Node versions. The CLI filters that upstream warning during startup,
but the root cause remains upstream until those dependencies are modernized.

### Session Expired

Delete `~/.whatsapp-cli/auth/` and re-scan the QR code.

### High Memory Usage

Chrome headless mode uses ~150-300MB RAM. This is normal.

## License

MIT

---

**Built with** [Claude Code](https://claude.com/claude-code) | [Documentation](docs/)
