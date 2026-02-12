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
- **Chrome/Chromium**: Latest version
- **Memory**: Minimum 2GB RAM

### Chrome Configuration

Set the Chrome path for Puppeteer:

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
7. Logout & reset     - Clear auth token and force re-scan QR code
8. Exit               - Close the application
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

Verify Chrome installation and set `PUPPETEER_EXECUTABLE_PATH`.

### Session Expired

Delete `.wwebjs_auth_session/` directory and re-scan QR code.

### High Memory Usage

Chrome headless mode uses ~150-300MB RAM. This is normal.

## License

MIT

---

**Built with** [Claude Code](https://claude.com/claude-code) | [Documentation](docs/)
