# AI Agents for WhatsApp CLI

This project includes custom AI agents for automation and development assistance.

## Available Agents

### TUI WhatsApp AI Developer

**Location:** `.github/agents/tui-whatsapp-ai-dev.agent.md`

A specialized agent for WhatsApp CLI development tasks.

#### Capabilities

- **WhatsApp Integration**
  - whatsapp-web.js API usage
  - Puppeteer configuration for headless Chrome
  - QR code authentication flow
  - Session persistence management

- **CLI Development**
  - readline-based menu systems
  - Terminal UI with chalk colors
  - Input validation and error handling
  - Settings management

- **AI Provider Integration**
  - OpenRouter API integration
  - OpenAI GPT models
  - Google Gemini
  - API key management
  - Temperature and token configuration

- **Message Handling**
  - Sending/receiving messages
  - Chat history management
  - Media message handling
  - Group chat operations

#### Usage Examples

```bash
# Using with Claude Code
"Use the tui-whatsapp-ai-dev agent to add voice message support"

# Direct agent invocation
/agent tui-whatsapp-ai-dev "Implement message search functionality"
```

## Creating Custom Agents

### Agent Template

```markdown
# Agent Name

Brief description of what this agent does.

## Context

The agent should understand:
- Project structure
- Key dependencies
- Relevant code patterns

## Capabilities

- Capability 1
- Capability 2

## Instructions

When invoked, the agent should:
1. Read relevant files
2. Analyze the request
3. Propose solution
4. Implement changes
5. Verify with tests
```

### Example: Message Automation Agent

```markdown
# Message Automation Agent

Automates repetitive messaging tasks while respecting WhatsApp's rate limits.

## Context

- WhatsApp Web API for sending messages
- Rate limiting to prevent account bans
- Message queue management
- Scheduled message support

## Capabilities

- Bulk message sending with delays
- Scheduled message delivery
- Message templates
- Auto-reply rules

## Instructions

1. Validate recipient list
2. Check rate limit compliance
3. Queue messages with appropriate delays
4. Handle delivery failures
5. Log all activity
```

## Agent Configuration

### Agent Metadata

```yaml
name: "tui-whatsapp-ai-dev"
version: "1.0.0"
description: "WhatsApp CLI development specialist"
author: "involvex"
```

### Agent Permissions

Agents may request:
- File read/write access
- Package installation
- Build/compile operations
- Git operations

## Security Considerations

### Agent Sandboxing

- Agents run in isolated environments
- File access is scoped to project directory
- External API calls require confirmation

### Sensitive Data

Agents should NOT:
- Store API keys in code
- Commit credentials
- Share session data
- Expose message content

## Best Practices

### 1. Clear Instructions

Provide specific, actionable requests:

```bash
# Good
"Add a new menu option for exporting chat history to JSON"

# Vague
"Add export feature"
```

### 2. Context Awareness

Include relevant context:

```bash
"Add message search to the main menu (option 9) that searches through loaded chats"
```

### 3. Verification

Ask agents to verify changes:

```bash
"Add the feature and run the build to verify it works"
```

## Agent Development

### Adding New Agents

1. Create agent file in `.github/agents/`
2. Define capabilities and context
3. Test with various requests
4. Document usage examples

### Agent Testing

```bash
# Test agent behavior
"Use the tui-whatsapp-ai-dev agent to explain the message flow"
```

## Troubleshooting

### Agent Not Responding

- Check agent file syntax
- Verify agent is loaded
- Review Claude Code logs

### Agent Misunderstanding

- Provide more context
- Break down complex requests
- Reference specific files

## Future Agents

### Planned Agents

- **Message Automation Agent** - Bulk operations with rate limiting
- **Analytics Agent** - Chat statistics and insights
- **Plugin Agent** - Extensible plugin system
- **Testing Agent** - Automated test generation

## Contributing

To contribute a new agent:

1. Create `.github/agents/your-agent.agent.md`
2. Document capabilities and usage
3. Add examples to this file
4. Submit PR

## Resources

- [Claude Agent Documentation](https://docs.claude.com/agents)
- [Project GitHub](https://github.com/involvex/whatsapp-cli)
- [Issues](https://github.com/involvex/whatsapp-cli/issues)
