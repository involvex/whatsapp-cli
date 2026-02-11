# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes    |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not open a public issue**. Instead, send an email to the maintainer or use a private vulnerability disclosure channel.

### How to Report

1. **Email**: security@involvex.dev
2. **Private Advisory**: Use GitHub's private vulnerability reporting feature

Please include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Detailed Assessment**: Within 7 days
- **Fix Release**: Within 14 days (for critical vulnerabilities)

## Security Best Practices

### API Keys and Credentials

This CLI may store API keys for AI providers. Follow these best practices:

1. **Never commit API keys** to version control
2. **Use environment variables** when possible
3. **Rotate keys regularly**
4. **Use separate keys** for development and production

```bash
# Example: Set API keys via environment
export OPENROUTER_API_KEY=your_key_here
export OPENAI_API_KEY=your_key_here
export GEMINI_API_KEY=your_key_here
```

### Session Data

The WhatsApp session is stored locally in `.wwebjs_auth_session/`:

- **Contains**: Authentication tokens for WhatsApp Web
- **Protection**: Add to `.gitignore`
- **Cleanup**: Delete directory when logging out

#### Protecting Session Data

```bash
# Add to .gitignore
.wwebjs_auth_session/
.whatsapp-cli-config.json
.env
*.local
```

### Chrome/Puppeteer Security

This application uses Puppeteer to control Chrome:

- **Headless Mode**: Chrome runs without visible UI
- **Sandbox Disabled**: Required for some environments
- **Executable Path**: Configured via environment variable

#### Recommended Chrome Configuration

```typescript
const puppeteerOptions: LaunchOptions = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-web-security", // ⚠️ Required for WhatsApp Web
    "--disable-features=VizDisplayCompositor"
  ]
};
```

### WhatsApp Security Considerations

- **Rate Limiting**: WhatsApp may block accounts that send messages too quickly
- **Account Safety**: Use a dedicated test account for development
- **Message Content**: Be careful with automated message content

### Network Security

- **HTTPS Only**: All AI provider APIs should use HTTPS
- **Proxy Support**: Configure proxies if required by your environment
- **Firewall Rules**: Ensure outbound connections to:
  - `web.whatsapp.com` (WhatsApp Web)
  - AI provider endpoints

## Vulnerability Types

### Critical

- Remote code execution
- Authentication bypass
- Session hijacking
- Data exposure of sensitive messages

### High

- API key leakage
- Unauthorized access to session data
- Cross-site scripting (if web features added)

### Medium

- Denial of service
- Information disclosure
- Rate limiting bypass

### Low

- Minor configuration issues
- UI inconsistencies

## Security Auditing

### Dependencies

```bash
# Check for vulnerable dependencies
bun audit
npm audit

# Update dependencies regularly
bun update
```

### Code Review

- All code changes should be reviewed
- Use TypeScript for type safety
- Enable ESLint with security rules
- Run tests before deployment

## Disclosure Policy

### Coordinated Disclosure

1. Reporter submits vulnerability
2. Maintainer confirms and assesses severity
3. Maintainer develops fix
4. Fix is released
5. Advisory is published (with credit)

### Credits

Security researchers who report vulnerabilities will be credited in the release notes (if desired).

## License

This security policy is part of the WhatsApp CLI project and follows the same MIT license.

## Contact

For security-related questions not involving vulnerability disclosure, please open a GitHub Discussion with the `security` tag.
