# Feature Suggestions for WhatsApp CLI

This document captures potential features and improvements for the WhatsApp CLI project, organized by category and priority. Each suggestion includes a brief rationale and implementation notes.

---

## High Priority

### 1. AI Provider Implementation

**Status:** Configured but not implemented. The `aiProvider` config exists with provider/model/apiKey/temperature/maxTokens, and the Footer shows AI status, but no actual API calls are made. Pressing `[5]` toggles a state that has no effect on message sending.

**Suggested approach:**

- Create `src/ai-provider.ts` with provider-specific adapters for OpenRouter, OpenAI, and Gemini.
- Add streaming support where possible (OpenRouter/OpenAI SSE) so responses appear progressively.
- Include a simple system prompt / context mechanism that can inject recent chat history.
- Handle errors gracefully: if the provider fails, fall back to sending the original text rather than dropping the message.
- Add a confirmation step or "press Enter to send AI response" mode so users can edit before sending.

**Files to touch:** `src/ai-provider.ts` (new), `src/cli.tsx`, `src/config.ts`

---

### 2. Interactive Settings Editor

**Status:** The `[6]` key switches to a `settings` view, but `MainContent.tsx` renders a static read-only display. The docs (`docs/CLI_ENHANCEMENTS.md`) describe an 8-option interactive menu that does not exist.

**Suggested approach:**

- Build an interactive settings screen inside `MainContent.tsx` or a new `Settings.tsx` component.
- Allow editing `theme`, `messageLimit`, `autoReconnect`, `soundEnabled`, and AI fields.
- Use Ink's `useInput` to navigate options and edit values inline.
- Persist changes immediately via `saveConfig()`.

**Files to touch:** `src/components/MainContent.tsx`, `src/components/Settings.tsx` (new)

---

### 3. Media Message Handling

**Status:** Media messages (images, videos, documents, stickers) are displayed as `[Media]` or `[Media/Sticker]` placeholders. There is no download, preview, or upload capability.

**Suggested approach:**

- Detect media message types via `message.type` and `message.hasMedia`.
- For inbound media: offer download to `~/.whatsapp-cli/downloads/` with a keyboard shortcut or automatic save.
- For outbound media: add a "send media" option that accepts a file path and uses `client.sendMessage(chatId, { media: filePath })`.
- Show media type icon and file size in the chat bubble.
- Optionally render image previews in the terminal (convert to ASCII or use a terminal image protocol like iTerm2 inline images).

**Files to touch:** `src/components/MainContent.tsx`, `src/cli.tsx`, `src/chatPersistence.ts`

---

### 4. Message Search

**Status:** No search functionality exists. Users cannot grep through loaded chats or persisted history.

**Suggested approach:**

- Add a search input mode triggered by a new key binding (e.g., `[/` or `[F]`).
- Search across `recentMessages` for the active chat and optionally across `chatHistory`.
- Highlight matching messages and allow jumping between results with `↑`/`↓`.
- Support basic filters: by sender, by date range, by media type.

**Files to touch:** `src/components/MainContent.tsx`, `src/cli.tsx`, `src/chatPersistence.ts`

---

### 5. Remove Unused Dependencies

**Status:** `package.json` lists `@aws-sdk/client-s3`, `dotenv`, and `react-devtools-core` as dependencies, but none are imported anywhere in `src/`.

**Suggested approach:**

- Remove `@aws-sdk/client-s3` and `react-devtools-core` from `dependencies` in `package.json`.
- Remove `dotenv` if environment variables are only read directly via `process.env` (which they are).
- Run `bun install` and verify the build still passes.

**Files to touch:** `package.json`

---

## Medium Priority

### 6. Message Reactions and Status Indicators

**Status:** Only a simple checkmark for `fromMe` messages is shown. No reaction emojis, delivery receipts, or read-by timestamps.

**Suggested approach:**

- Display reaction emojis below messages that have them (`message.reactions`).
- Show double-checkmark (sent), blue double-checkmark (delivered), and read receipt indicators where available.
- Show "read by" timestamps on hover/selection.

**Files to touch:** `src/components/MainContent.tsx`

---

### 7. Markdown and Link Parsing

**Status:** Messages are rendered as raw plain text. URLs are not clickable and formatting is lost.

**Suggested approach:**

- Add a lightweight markdown renderer for bold, italic, code blocks, and inline code.
- Detect URLs and display them as truncated, underlined links.
- Optionally open URLs in the system browser when selected (use `Bun.open` or `child_process`).

**Files to touch:** `src/components/MainContent.tsx`, `src/utils/markdown.ts` (new)

---

### 8. Group Chat Management

**Status:** Groups are identified in the sidebar with a `G` prefix, but there are no group-specific operations.

**Suggested approach:**

- Add a group info view that shows participants, group description, and settings.
- Allow leaving groups, toggling notifications, and viewing participant list.
- If the user is an admin, add limited admin controls (add/remove participant, promote/demote).
- Show group subject and creation timestamp.

**Files to touch:** `src/components/MainContent.tsx`, `src/cli.tsx`, `src/client.ts`

---

### 9. Favorites / Pinned Chats

**Status:** All chats are sorted by timestamp. No way to prioritize important conversations.

**Suggested approach:**

- Add a `favorites` list persisted in `config.json` or a separate `~/.whatsapp-cli/favorites.json`.
- Show a `★` indicator in the sidebar for favorited chats.
- Add a "toggle favorite" action when a chat is selected (e.g., press `[F]`).
- Optionally show a separate "Favorites" section at the top of the sidebar.

**Files to touch:** `src/config.ts`, `src/components/Sidebar.tsx`, `src/cli.tsx`

---

### 10. Command History and Input Editing

**Status:** The input field is a single-line `ink-text-input` with no history navigation.

**Suggested approach:**

- Maintain a ring buffer of previous inputs (commands and messages).
- Bind `↑`/`↓` in input mode to cycle through history.
- Support basic readline-style editing: `Ctrl+A` (start), `Ctrl+E` (end), `Ctrl+W` (delete word), `Ctrl+U` (clear line).
- Persist history across sessions in `~/.whatsapp-cli/history.json`.

**Files to touch:** `src/components/App.tsx`, `src/hooks/useCommandHistory.ts` (new)

---

## Low Priority

### 11. Message Forwarding and Quoting

**Status:** No way to forward messages or quote/reply in a threaded context.

**Suggested approach:**

- Add a "forward" action that copies a selected message to another chat.
- Add a "quote" mode that prepends the original message text when replying.
- Use `client.sendMessage(chatId, { text, quotedMessageId })` for proper WhatsApp quoting.

**Files to touch:** `src/cli.tsx`, `src/components/MainContent.tsx`

---

### 12. Chat History Export

**Status:** Chat history is persisted locally but not exportable.

**Suggested approach:**

- Add an export action that dumps the active chat's messages to JSON, CSV, or Markdown.
- Include metadata: sender, timestamp, message type, read status.
- Write exports to `~/.whatsapp-cli/exports/` with timestamped filenames.

**Files to touch:** `src/cli.tsx`, `src/chatPersistence.ts`

---

### 13. Draft Messages

**Status:** No draft persistence. If the user switches chats or exits, unsent text is lost.

**Suggested approach:**

- Save the current input buffer when switching chats or views.
- Restore the draft when returning to the same chat.
- Show a `(draft)` indicator next to chats that have unsent text.

**Files to touch:** `src/cli.tsx`, `src/components/Sidebar.tsx`

---

### 14. Scheduled Messages

**Status:** No scheduling capability.

**Suggested approach:**

- Add a "schedule" input mode where the user provides a time and message.
- Use `setTimeout` or a lightweight job queue (e.g., `node-cron` or a simple file-backed queue) to send at the scheduled time.
- Persist scheduled jobs in `~/.whatsapp-cli/scheduled.json` so they survive restarts.

**Files to touch:** `src/cli.tsx`, `src/scheduler.ts` (new)

---

### 15. Multiple Accounts / Sessions

**Status:** Only a single WhatsApp session is supported.

**Suggested approach:**

- Allow switching between multiple auth directories (e.g., `~/.whatsapp-cli/auth/personal`, `~/.whatsapp-cli/auth/work`).
- Store per-account config overrides.
- Add an account selector on startup or via a key binding.

**Files to touch:** `src/config.ts`, `src/client.ts`, `src/cli.tsx`

---

### 16. Notification Sound Customization

**Status:** Only a terminal bell (`\x07`) is used, with no customization.

**Suggested approach:**

- Allow users to specify a custom sound file path in config.
- Play the sound using a system call or Bun's audio APIs.
- Differentiate between message types (text, media, group mention).

**Files to touch:** `src/config.ts`, `src/logger.ts`, `src/cli.tsx`

---

### 17. Keyboard Shortcuts Help Overlay

**Status:** Shortcuts are documented in the README and partially shown in the Footer, but there is no in-app quick reference.

**Suggested approach:**

- Add a `[?]` or `[H]` key binding that opens a full-screen overlay listing all shortcuts.
- Keep the overlay simple: two columns (Navigation, Actions), with category headers.
- Dismiss with `Esc` or `Q`.

**Files to touch:** `src/components/App.tsx`, `src/components/MainContent.tsx`

---

### 18. In-App Updates and Notifications

**Status:** New messages update the sidebar and play a bell, but there is no notification system for mentions, replies, or group events.

**Suggested approach:**

- Highlight chats with unread messages in the sidebar (bold, color change, or `●` indicator).
- Show unread count next to chat names.
- Optionally display a banner or footer message for mentions (`@username`) or replies to the user's own messages.

**Files to touch:** `src/components/Sidebar.tsx`, `src/cli.tsx`, `src/chatPersistence.ts`

---

## Developer Experience

### 19. Test Suite

**Status:** Zero tests. `docs/CLI_ENHANCEMENTS.md` and `GEMINI.md` both note this as a TODO.

**Suggested approach:**

- Add `bun test` configuration for unit tests.
- Start with `config.ts` (load/save/getConfig), `chatPersistence.ts` (save/load history), and `client.ts` callback registration.
- Use snapshot testing for component rendering where practical.

**Files to touch:** `package.json` (add test script), `src/__tests__/` (new directory)

---

### 20. Update Outdated Documentation

**Status:** `docs/CLI_ENHANCEMENTS.md`, `docs/PROJECT_SUMMARY.md`, and `docs/FINAL_STATUS.md` reference an older architecture (`src/settings.ts`, `src/ui.ts`, `src/readline-utils.ts`, `@opentui/core`, `chalk`, `.whatsapp-cli-config.json` in project root) that no longer matches the codebase.

**Suggested approach:**

- Update or archive stale docs to avoid confusion for new contributors.
- Ensure `README.md` is the single source of truth for features.
- Add a `CONTRIBUTING.md` with build/test/lint workflows.

**Files to touch:** `docs/*.md`

---

### 21. Dependency Audit and Cleanup

**Status:** Unused dependencies increase install size and attack surface.

**Suggested approach:**

- Remove `@aws-sdk/client-s3`, `dotenv`, and `react-devtools-core`.
- Audit remaining dependencies for known vulnerabilities (`bun audit`).
- Pin Puppeteer and whatsapp-web.js versions carefully; monitor upstream breaking changes.

**Files to touch:** `package.json`

---

## Summary

| Priority | Suggestion                    | Effort | Impact |
| -------- | ----------------------------- | ------ | ------ |
| High     | AI Provider Implementation    | Medium | High   |
| High     | Interactive Settings Editor   | Medium | High   |
| High     | Media Message Handling        | Medium | High   |
| High     | Message Search                | Medium | High   |
| High     | Remove Unused Dependencies    | Low    | Medium |
| Medium   | Reactions & Status Indicators | Low    | Medium |
| Medium   | Markdown & Link Parsing       | Low    | Medium |
| Medium   | Group Chat Management         | Medium | Medium |
| Medium   | Favorites / Pinned Chats      | Low    | Medium |
| Medium   | Command History               | Low    | Medium |
| Low      | Message Forwarding & Quoting  | Medium | Low    |
| Low      | Chat History Export           | Low    | Low    |
| Low      | Draft Messages                | Low    | Low    |
| Low      | Scheduled Messages            | Medium | Low    |
| Low      | Multiple Accounts             | High   | Low    |
| Low      | Sound Customization           | Low    | Low    |
| Low      | Shortcuts Help Overlay        | Low    | Low    |
| Low      | Unread Notifications          | Low    | Medium |
| DX       | Test Suite                    | High   | High   |
| DX       | Update Outdated Docs          | Medium | Medium |
| DX       | Dependency Audit              | Low    | Medium |
