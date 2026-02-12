# Claude Code Integration

This project is optimized for development with [Claude Code](https://claude.com/claude-code), Anthropic's AI-powered CLI tool.

## Getting Started with Claude Code

### Installation

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Or using Homebrew
brew install claude-code
```

### Project-Specific Features

This WhatsApp CLI includes Claude Code configurations and custom agents.

## Available Skills

### /commit

Smart commit message generation following project conventions.

```bash
# Stage your changes
git add .

# Ask Claude to commit
"Commit my changes"

# Or use the skill directly
/commit
```

### /review

Review code changes and suggest improvements.

```bash
"Review my recent changes"
/review
```

## Custom Agents

Located in `.github/agents/`

### tui-whatsapp-ai-dev.agent.md

Specialized agent for WhatsApp CLI development with AI features.

**Capabilities:**

- WhatsApp Web.js integration
- Puppeteer configuration
- AI provider setup (OpenRouter, OpenAI, Gemini)
- CLI menu system development
- Session persistence handling

**Usage:**

```bash
# Use the agent for WhatsApp-specific tasks
"Add support for sending media messages"
"Implement AI message generation"
```

## Claude Code Configuration

### Settings (.claude/settings.local.json)

```json
{
  "statusLine": true,
  "autoApprove": false,
  "maxTokens": 8000
}
```

## Project Context for Claude

When working with this project in Claude Code, the following context is automatically available:

- **TypeScript Configuration**: Strict type checking enabled
- **ESLint Rules**: Custom rules for Node.js CLI apps
- **Dependencies**: whatsapp-web.js, puppeteer, qrcode-terminal
- **Build System**: Bun for fast builds and testing

## Common Claude Code Workflows

### 1. Adding New Features

```bash
# Prompt Claude
"Add a new menu option for bulk message sending"
```

Claude will:

1. Read relevant files (cli.ts, ui.ts, client.ts)
2. Suggest implementation approach
3. Write the code
4. Update type definitions
5. Test the changes

### 2. Debugging Issues

```bash
# Prompt Claude
"The QR code isn't displaying properly. Help me debug this."
```

Claude will:

1. Check qrcode-terminal integration
2. Review client.ts event handlers
3. Suggest fixes
4. Verify with test runs

### 3. Type Safety

```bash
# Prompt Claude
"I'm getting TypeScript errors in cli.ts line 150"
```

Claude will:

1. Identify the type mismatch
2. Suggest proper types from whatsapp-web.js
3. Update imports if needed
4. Run typecheck to verify

### 4. Refactoring

```bash
# Prompt Claude
"Refactor the settings menu to use a more modular approach"
```

Claude will:

1. Analyze current settings.ts structure
2. Propose modular architecture
3. Implement changes
4. Ensure no breaking changes

## Best Practices

### 1. Be Specific

```bash
# Good
"Add error handling for network failures in the initializeClient function"

# Less effective
"Fix the client initialization"
```

### 2. Provide Context

```bash
# Good
"When the user selects option 3 from the main menu, add validation to ensure a chat is selected before showing the chat history"

# Less effective
"Fix menu option 3"
```

### 3. Test After Changes

```bash
# Ask Claude to test
"Run the build and verify the changes work"
```

## Claude Code Tips

### Understanding Project Structure

Claude Code can help you navigate the codebase:

```bash
"Show me the file structure for this project"
"Where is the QR code generation handled?"
"What files are involved in sending messages?"
```

### Learning the Codebase

```bash
"Explain how the WhatsApp client initialization works"
"Show me the flow from QR scan to ready state"
"How does session persistence work?"
```

### Troubleshooting

```bash
"I'm getting a Puppeteer timeout error"
"The message isn't being sent to the correct chat"
"The settings aren't being saved"
```

## MIRA Integration

This project supports [MIRA](https://github.com/anthropics/mira) for session context:

- Recent work history is preserved
- Code changes are tracked across sessions
- Decision rationale is documented

### MIRA Commands

```bash
# View recent changes
"What did I change in the last session?"

# Search past decisions
"Show me decisions about Puppeteer configuration"

# Review code evolution
"How has the Message type handling evolved?"
```

## GitHub Copilot Integration

While optimized for Claude Code, this project also works with GitHub Copilot:

```bash
# Assign Copilot to an issue
gh issue create --title "Add message search" --body "Implement search in chat history"
gh issue list --assignee @me
```

## Contributing with Claude Code

When contributing:

1. **Use Claude Code** to understand the codebase before making changes
2. **Run tests** through Claude Code after modifications
3. **Generate commits** using the `/commit` skill
4. **Create PRs** with Claude Code assistance

## Limitations

- Claude Code requires internet connection for API calls
- Large context windows may need context pruning
- Some system-level debugging may require manual intervention

## Resources

- [Claude Code Documentation](https://docs.claude.com/claude-code)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)
- [Project Issues](https://github.com/involvex/whatsapp-cli/issues)
