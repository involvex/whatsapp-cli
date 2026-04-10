# 🚀 WhatsApp CLI Quick Start Guide

## Installation

```bash
# Install Bun (recommended)
curl -fsSL https://bun.sh/install | bash

# Clone and install
git clone <repo>
cd whatsappwebtui
bun install
```

## Browser Setup

The CLI auto-detects browsers in this order:

1. `PUPPETEER_EXECUTABLE_PATH`
2. `BUN_CHROME_PATH`
3. Standard Chrome/Chromium/Edge install locations
4. Puppeteer's managed browser cache

If you want to pin the browser explicitly on Windows:

```powershell
$env:PUPPETEER_EXECUTABLE_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

If you do not have a local browser install, download Puppeteer's managed Chrome once:

```bash
bunx puppeteer browsers install chrome
```

## Running

```bash
# Development with hot reload
bun run dev

# Production build with format, typecheck, lint
bun run build

# Run compiled version
bun run start
```

## First Time Setup

1. Start the app → QR code appears in terminal
2. Open WhatsApp on phone → Settings → Linked Devices → Link Device
3. Scan the QR code
4. Done! Main menu appears

## Main Menu (8 Options)

```
📱 Available Commands:
  1. List chats          - Show all your WhatsApp chats
  2. Select chat         - Choose a chat to work with
  3. Send message        - Send a message to selected chat
  4. Show chat history   - Display last 15 messages
  5. Toggle AI mode      - Enable/disable AI generation
  6. Settings            - Configure AI, theme, models
  7. About               - Show app information
  8. Logout & reset      - Clear auth token
  Q. Exit                - Close application

📬 Recent Messages - Shows last 5 messages on every screen
```

## New Features (Enhanced!)

### 🎨 Beautiful Colored Output

- Success (green), Errors (red), Warnings (yellow), Info (blue), AI (magenta)

### 📬 Real-Time Message Sidebar

- Last 5 messages displayed on every screen
- Shows sender, timestamp, and preview
- Updates as new messages arrive

### ⚙️ Interactive Settings Menu

- Configure AI providers (OpenRouter, OpenAI, Gemini)
- Select models and adjust parameters
- Save API keys securely
- Control temperature and token limits
- All settings persist across restarts

### 💾 Session Persistence

- Login once, use forever
- Session data is stored under `~/.whatsapp-cli/auth/`
- Use Option 8 to logout cleanly

## File Structure

```
src/
├── cli.ts              # Main CLI logic (380 lines)
├── client.ts           # WhatsApp wrapper (230 lines)
├── ui.ts               # Chalk-based UI utilities (100 lines)
├── config.ts           # Configuration management (80 lines)
├── settings.ts         # Interactive settings menu (280 lines)
├── readline-utils.ts   # Terminal helpers (20 lines)
└── ai-provider.ts      # (Future) AI message generation

Config:
└── ~/.whatsapp-cli/config.json  # Settings file (auto-created)
```

## Key Features

✅ QR code authentication in terminal
✅ Load chats and messages
✅ Send/receive messages in real-time
✅ **Beautiful colored output with chalk**
✅ **Real-time message sidebar**
✅ **Interactive settings menu**
✅ **Session persistence** (no re-auth needed)
✅ **AI integration ready**
✅ Simple menu interface
✅ No external UI framework (@opentui removed)
✅ Production-ready

## Quick AI Setup

```
Press 6 → Settings
Press 1 → Configure AI Provider → Choose "openrouter"
Press 2 → Set AI Model → Choose "auto" or specific model
Press 3 → Set API Key → Paste your OPENROUTER_API_KEY
Press 8 → Back to main menu
Press 5 → Toggle AI mode ON
Send messages → AI enhances them!
```

## Troubleshooting

**Chrome not found?**

- Set `PUPPETEER_EXECUTABLE_PATH` to a valid browser executable
- Or install Puppeteer's managed browser: `bunx puppeteer browsers install chrome`
- Verify Chrome/Chromium/Edge is installed: `where chrome` or `where msedge` (Windows)

**DEP0040 warning?**

- This warning comes from the current `whatsapp-web.js` dependency chain on newer Node versions
- The CLI filters the noisy startup warning, but the upstream dependency chain still needs modernization

**No chats showing?**

- Wait 10-20 seconds after QR scan
- Delete `~/.whatsapp-cli/auth/`
- Scan QR code again

**Exit doesn't work?**

- Try pressing 8 again (now fixed!)
- Fallback: Press Ctrl+C

**Colors not showing?**

- Update your terminal emulator
- Enable 256-color mode in terminal settings

**Build fails?**

- Delete `node_modules/` and `bun.lock`
- Run `bun install` again
- Try `bun run build`

**Settings not saving?**

- Check if `~/.whatsapp-cli/config.json` is writable
- Try resetting: Settings → Option 8
- Edit file manually if needed

## Scripts

```bash
bun run dev          # Watch mode for development
bun run build        # Production build (format + typecheck + lint)
bun run start        # Run compiled version
bun run format       # Format code with Prettier
bun run typecheck    # TypeScript type checking
bun run lint         # Lint with ESLint
bun run lint:fix     # Fix linting issues
```

## Dependencies

### Production

- **whatsapp-web.js** (^1.34.6) - WhatsApp automation
- **qrcode-terminal** (^0.12.0) - QR code display in terminal
- **puppeteer** (^24.37.2) - Browser automation
- **chalk** (^5.3.0) - Terminal colors and styling
- **dotenv** (^16.3.1) - Environment variable loading

### Development

- **TypeScript** (^5.9.3) - Type safety
- **ESLint** (^10.0.0) - Code linting
- **Prettier** (^3.8.1) - Code formatting

Removed: `@opentui/core` ✂️ (Replaced with lightweight chalk)

## Configuration File

Auto-created at `.whatsapp-cli-config.json`:

```json
{
  "aiProvider": {
    "provider": "none",
    "model": "auto",
    "apiKey": "",
    "temperature": 0.7,
    "maxTokens": 500
  },
  "theme": "default",
  "messageLimit": 15,
  "autoReconnect": true
}
```

Edit directly or use Settings menu (Press 6).

## Session Management

### Session Files

- `.wwebjs_auth_session/` - WhatsApp session data (auto-created)
- `.wwebjs_cache/` - Cache files (auto-created)

### Logout/Re-authenticate

```
Main Menu → Press 7 → Confirm → Session cleared
Next run → QR code appears again
```

### Force Clean Start

```bash
rm -rf .wwebjs_auth_session
rm -rf .wwebjs_cache
bun run start  # QR code appears
```

## Documentation

See also:

- `README.md` - Full documentation and features
- `SESSION_PERSISTENCE.md` - Session management details
- `CLI_ENHANCEMENTS.md` - Detailed enhancement breakdown

---

**That's it! Start using WhatsApp CLI now! 🚀**

Need help? Check the docs above or enable debug mode (coming soon).
