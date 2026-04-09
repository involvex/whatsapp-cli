# GEMINI.md - WhatsApp CLI Project Context

This file provides foundational context for AI agents working on the `@involvex/whatsapp-cli` project.

## Project Overview

**@involvex/whatsapp-cli** is a terminal-based WhatsApp client built with TypeScript, [whatsapp-web.js](https://github.com/pedrosans/whatsapp-web.js), and [Ink](https://github.com/vadimdemedes/ink) (React for CLI). It features AI integration for message generation and session persistence.

### Core Technologies

- **Runtime:** [Bun](https://bun.sh/) (preferred) or Node.js (v18+).
- **WhatsApp Integration:** `whatsapp-web.js` using Puppeteer (headless Chrome).
- **UI Framework:** `ink` (React-based terminal UI).
- **Styling/Output:** `chalk` for terminal colors, `qrcode-terminal` for QR display.
- **Language:** TypeScript with strict type checking.

### Architecture

- `src/cli.tsx`: Main entry point and UI orchestrator using Ink.
- `src/client.ts`: Wrapper for the `whatsapp-web.js` client, managing lifecycle events (QR, ready, message, etc.).
- `src/config.ts`: Configuration management using `~/.whatsapp-cli/config.json`.
- `src/components/`: Modular Ink components (`App`, `Sidebar`, `MainContent`, `Footer`).
- `src/logger.ts`: Centralized logging system.
- `src/args.ts`: CLI argument parsing.

## Building and Running

### Development

```bash
# Install dependencies
bun install

# Run with hot-reloading
bun dev
```

### Production

```bash
# Build the project
bun run build

# Start the application
bun start
```

### Key Scripts (package.json)

- `dev`: `bun run --watch src/cli.tsx`
- `build`: `bun build src/cli.tsx --outdir dist --target node`
- `format`: `prettier --write .`
- `typecheck`: `tsc --noEmit`
- `lint`: `eslint .`
- `prebuild`: Runs format, typecheck, and lint:fix.

## Configuration & Environment

### Persistence

Data is stored in `~/.whatsapp-cli/`:

- `config.json`: User settings (AI provider, model, theme).
- `auth/`: WhatsApp session data (Puppeteer profile).
- `logs/`: Application logs.
- `cache/`: WhatsApp Web cache.

### Environment Variables

- `PUPPETEER_EXECUTABLE_PATH`: Path to Chrome/Chromium executable (critical for Puppeteer).
- `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`: API keys for AI features.
- `WHATSAPP_CLI_DIR`: Optional override for the storage directory.

## Development Conventions

### General Rules

- **Bun First:** Use `bun` for package management, running scripts, and building.
- **Strict Typing:** Maintain strict TypeScript types. Avoid `any` where possible.
- **Ink Components:** Keep UI components modular in `src/components/`. Use functional components and hooks.
- **Client Lifecycle:** Always handle client events (disconnected, auth_failure) gracefully to ensure stability.
- **Linting:** Code must pass `bun run lint` and `bun run typecheck` before any changes are finalized.

### Testing

- Currently, the project focuses on manual verification through the CLI.
- TODO: Implement unit tests using `bun test` for core logic in `config.ts` and `client.ts`.

### Security

- Never hardcode API keys.
- Be careful with `.wwebjs_auth_session` or the `auth/` directory; they contain sensitive session tokens.
- Consult `Security.md` for broader security policies.
