# WhatsApp CLI — Copilot Instructions

## Build, Lint & Type-check

```bash
bun install          # Install dependencies
bun run dev          # Watch mode (src/cli.tsx)
bun run build        # Bundle to dist/ (runs format + typecheck + lint:fix first)
bun run typecheck    # tsc --noEmit only
bun run lint         # ESLint check
bun run lint:fix     # ESLint auto-fix
bun run format       # Prettier write
```

There is no test suite. Validate changes by running `bun run build` (which invokes the full `prebuild` chain: format → typecheck → lint:fix).

## Architecture

The app is a React/[Ink](https://github.com/vadimdemedes/ink) terminal UI compiled with Bun.

```
src/
  cli.tsx          # Root React component (WhatsAppCLI) + CLI entry point
  client.ts        # whatsapp-web.js singleton + Puppeteer config
  config.ts        # CliConfig type, JSON persistence, PATHS constants
  logger.ts        # Singleton Logger, file + console output
  args.ts          # CLI flag parsing (--headless, --log-level, etc.)
  components/
    App.tsx        # Layout shell, keyboard input, view routing
    Sidebar.tsx    # Chat list (fixed 30-col width)
    MainContent.tsx # Chat view / QR code / settings / about
    Footer.tsx     # AI status bar
```

**Data flow:**

1. `cli.tsx` bootstraps the singleton client via `initializeClient()` from `client.ts`, registering callbacks (QR, ready, message, error) before calling `initializeClient()`.
2. The `WhatsAppCLI` React component holds all application state (`chats`, `activeChat`, `isConnected`, `recentMessages`, `currentView`).
3. `App.tsx` handles raw keyboard input via Ink's `useInput` hook and delegates to `onCommand`, `onSendMessage`, `onSelectChat` callbacks.
4. `client.ts` exposes a callback-registration pattern (`setQrCallback`, `setReadyCallback`, etc.) rather than returning an event emitter directly.

**Singleton pattern:** Both `client.ts` and `logger.ts` maintain module-level singleton instances. `createLogger()` / `getLogger()` return the same instance after first creation. `initializeClient()` guards against concurrent initialization with `initPromise`.

**Stale closure guard:** `cli.tsx` uses `activeChatRef` (`useRef`) to expose the current active chat inside event callbacks registered once on mount, avoiding stale closure bugs.

## Key Conventions

**All user data lives in `~/.whatsapp-cli/`** (overridable via `WHATSAPP_CLI_DIR`). The `PATHS` constant in `config.ts` is the single source of truth for file locations (config, auth, logs, cache, chat-history).

**Config is plain JSON** at `~/.whatsapp-cli/config.json`, loaded async at startup and kept in a module-level variable. Use `getConfig()` for synchronous reads after load; use `loadConfig()` / `saveConfig()` for async I/O.

**Ink renders over stdout** — do not use `console.log` in component render paths; it corrupts the TUI. `console.log` is only safe before `render()` is called or inside `client.ts` / `logger.ts` where it's acceptable during the Puppeteer init phase.

**TypeScript strict mode** is on, including `noUncheckedIndexedAccess`. Always check array index results before use. `verbatimModuleSyntax` is enabled — use `import type` for type-only imports.

**ESM only** (`"type": "module"` in package.json). No `require()` or CommonJS.

**Entry point for the binary** is `dist/cli-wrapper.js` (see `bin` in package.json), but the build target is `dist/cli.js` produced by `bun build src/cli.tsx`.

**AI providers** (`openrouter`, `openai`, `gemini`, `none`) are configured in `CliConfig.aiProvider` and currently only stored/displayed — the actual AI call logic is not yet implemented in the codebase.

## Environment Variables

| Variable                    | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `PUPPETEER_EXECUTABLE_PATH` | Path to Chrome/Chromium executable        |
| `OPENROUTER_API_KEY`        | OpenRouter API key                        |
| `OPENAI_API_KEY`            | OpenAI API key                            |
| `GEMINI_API_KEY`            | Google Gemini API key                     |
| `WHATSAPP_CLI_DIR`          | Override `~/.whatsapp-cli` data directory |

## Custom Agent

`.github/agents/tui-whatsapp-ai-dev.agent.md` — specialized agent for WhatsApp CLI development tasks (whatsapp-web.js API, Puppeteer, Ink TUI, AI provider integration).
