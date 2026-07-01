# WhatsApp CLI

A terminal WhatsApp client with a compact **Matrix-style** UI, built with TypeScript, [React](https://react.dev/) + [Ink](https://github.com/vadimdemedes/ink), and [whatsapp-web.js](https://github.com/pedrosans/whatsapp-web.js).

## Features

- Full-screen Ink TUI with cyan/green Matrix theme
- Scrollable chat list and message pane (fixed terminal height)
- QR code authentication in the terminal
- Session persistence under `~/.whatsapp-cli/`
- Auto-reconnect with visible connection status
- In-app logout and re-authentication (no process exit)
- Optional AI message generation (OpenRouter, OpenAI, Gemini)
- Keyboard-driven navigation

## Install

### From npm

```bash
npm install -g @involvex/whatsapp-cli
```

Then run:

```bash
whatsapp-cli
```

### From source

```bash
git clone https://github.com/involvex/whatsapp-cli.git
cd whatsapp-cli
bun install
bun run build
bun start
```

## Prerequisites

- **Node.js** 18+ (required for `npm install -g` and production use)
- **Bun** 1.0+ (optional, for local development)
- **Chrome, Chromium, or Edge** in a standard install location, or Puppeteer-managed Chrome
- **RAM**: ~2 GB minimum (headless browser)

### Browser configuration

The CLI resolves a browser in this order:

1. `PUPPETEER_EXECUTABLE_PATH`
2. `BUN_CHROME_PATH`
3. Standard Chrome/Chromium/Edge paths
4. Puppeteer's managed browser cache

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

If no local browser is found:

```bash
npx puppeteer browsers install chrome
```

## First run

1. Start the CLI: `whatsapp-cli` or `bun start`
2. Scan the QR code with WhatsApp on your phone
3. Session data is saved to `~/.whatsapp-cli/auth/` for later runs

## Usage

### Keyboard shortcuts

| Key           | Action                                  |
| ------------- | --------------------------------------- |
| `↑` / `↓`     | Navigate chat list                      |
| `Enter`       | Open highlighted chat                   |
| `Shift+Enter` | Type a message                          |
| `[1]`         | Refresh chats / reconnect when offline  |
| `[2]`         | Select chat by number                   |
| `[3]`         | Send message                            |
| `[4]`         | Reload chat history                     |
| `[5]`         | Toggle AI                               |
| `[6]`         | Settings                                |
| `[7]`         | About                                   |
| `[8]`         | Logout (clears session, shows QR again) |
| `Q`           | Exit                                    |
| `Esc`         | Cancel message/select input             |

### Configuration

Config file: `~/.whatsapp-cli/config.json`

| Setting              | Description                                       |
| -------------------- | ------------------------------------------------- |
| `theme`              | `matrix` (default), `default`, `dark`, `colorful` |
| `autoReconnect`      | Retry connection on disconnect (default: `true`)  |
| `messageLimit`       | Messages loaded per chat (default: `15`)          |
| `aiProvider`         | AI provider, model, API key, temperature          |
| `chatHistoryEnabled` | Persist chat history locally                      |
| `soundEnabled`       | Terminal bell on new messages                     |

### AI integration

Set API keys in your environment:

```bash
export OPENROUTER_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here
export GEMINI_API_KEY=your_key_here
```

Supported providers: OpenRouter, OpenAI, Google Gemini.

## Development

```bash
bun install
bun dev          # watch mode
bun run build    # dist/cli.js + dist/cli-wrapper.js
bun run typecheck
bun run lint
```

## Publish (maintainers)

```bash
bun run build
npm publish --access public
```

`prepublishOnly` runs the build automatically. The published tarball includes only `dist/`, `README.md`, `LICENSE`, and `Security.md`.

## Project structure

```
src/
├── cli.tsx              # Ink app entry + command handling
├── client.ts            # whatsapp-web.js lifecycle
├── config.ts            # ~/.whatsapp-cli config paths
├── theme.ts             # TUI color themes
├── components/          # App, Sidebar, MainContent, Footer
└── hooks/               # Terminal size + scroll viewport
```

## Troubleshooting

### Chrome not found

1. Install Chrome, Chromium, or Edge.
2. Set `PUPPETEER_EXECUTABLE_PATH` to the browser executable.
3. Or run `npx puppeteer browsers install chrome`.

### Session expired or corrupt

```bash
rm -rf ~/.whatsapp-cli/auth
whatsapp-cli
```

Then scan the QR code again.

### Disconnected / reconnecting

- Footer shows `RECONNECTING (n/3)` during auto-reconnect.
- Press `[1]` to manually refresh or reconnect.
- Set `"autoReconnect": false` in config to disable auto-retry.

### High memory usage

Headless Chrome typically uses 150–300 MB RAM. This is expected.

## Documentation

- [Quick Start](docs/QUICKSTART.md)
- [Session Persistence](docs/SESSION_PERSISTENCE.md)
- [Security Policy](Security.md)

## License

MIT — see [LICENSE](LICENSE).
