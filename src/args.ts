export interface CliArgs {
  headless: boolean;
  help: boolean;
  config: boolean;
  chats: boolean;
  about: boolean;
  version: boolean;
  logLevel?: string;
  configPath?: string;
}

export interface PackageInfo {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  homepage?: string;
  repository?: string;
}

export function parseArgs(args: string[]): CliArgs {
  const parsed: CliArgs = {
    headless: false,
    help: false,
    config: false,
    chats: false,
    about: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--headless":
      case "-h":
        parsed.headless = true;
        break;
      case "--help":
        parsed.help = true;
        break;
      case "--config":
      case "-c": {
        parsed.config = true;
        const nextConfigArg = args[i + 1];
        if (nextConfigArg && !nextConfigArg.startsWith("--")) {
          parsed.configPath = nextConfigArg;
          i++;
        }
        break;
      }
      case "--chats":
        parsed.chats = true;
        break;
      case "--about":
      case "-a":
        parsed.about = true;
        break;
      case "--version":
      case "-v":
        parsed.version = true;
        break;
      case "--log-level": {
        const nextLogLevelArg = args[i + 1];
        if (nextLogLevelArg && !nextLogLevelArg.startsWith("--")) {
          parsed.logLevel = nextLogLevelArg;
          i++;
        }
        break;
      }
    }
  }

  return parsed;
}

export function showHelp(packageInfo: PackageInfo): void {
  console.log(`
${packageInfo.name} v${packageInfo.version}
${packageInfo.description}

USAGE:
  whatsapp-cli [OPTIONS]

OPTIONS:
  -h, --headless          Run in headless mode (no QR code display)
  --about, -a             Show about information
  --config, -c [PATH]     Show or edit configuration
  --chats                 Show available chats and exit
  --help                  Show this help message
  --log-level LEVEL       Set log level (debug, info, warn, error)
  --version, -v           Show version information

EXAMPLES:
  whatsapp-cli                    Start the interactive CLI
  whatsapp-cli --headless         Start in headless mode
  whatsapp-cli --chats            List all chats
  whatsapp-cli --config           Show current configuration
  whatsapp-cli --log-level debug  Enable debug logging

ENVIRONMENT VARIABLES:
  PUPPETEER_EXECUTABLE_PATH    Path to Chrome executable
  OPENROUTER_API_KEY           OpenRouter API key
  OPENAI_API_KEY               OpenAI API key
  GEMINI_API_KEY               Google Gemini API key
  WHATSAPP_CLI_DIR             Custom config directory (default: ~/.whatsapp-cli)

For more information, visit: ${packageInfo.homepage || "https://github.com/involvex/whatsapp-cli"}
`);
}

export function showAbout(packageInfo: PackageInfo): void {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    WhatsApp CLI - About                     ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  A minimal terminal-based WhatsApp client built with:       ║
║                                                              ║
║  • TypeScript                                               ║
║  • whatsapp-web.js                                          ║
║  • Node.js readline                                         ║
║  • Puppeteer                                                ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Version:        ${packageInfo.version.padEnd(40)}║
║  Author:         ${packageInfo.author.padEnd(40)}║
║  License:        ${packageInfo.license.padEnd(40)}║
║  Homepage:       ${(packageInfo.homepage || "N/A").padEnd(40)}║
║  Repository:     ${((packageInfo.repository ?? "N/A") as string).padEnd(40)}║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Features:                                                   ║
║  • QR code authentication                                    ║
║  • Send and receive messages                                 ║
║  • Chat history persistence                                  ║
║  • AI message generation (OpenRouter, OpenAI, Gemini)        ║
║  • Configurable logging                                      ║
║  • Session persistence                                       ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Data Location: ~/.whatsapp-cli/                            ║
║    ├── config.json          Configuration                   ║
║    ├── auth/                WhatsApp session                ║
║    ├── logs/                Application logs                 ║
║    ├── cache/               Cached data                     ║
║    └── chat-history.json    Chat history                    ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  Built with Claude Code                                      ║
║  https://claude.com/claude-code                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);
}

export function showVersion(packageInfo: PackageInfo): void {
  console.log(`${packageInfo.name} v${packageInfo.version}`);
}

export async function getPackageInfo(): Promise<PackageInfo> {
  try {
    const pkgPath = new URL("../../package.json", import.meta.url);
    const pkg = await import(pkgPath.href);
    return {
      name: pkg.default.name || "whatsapp-cli",
      version: pkg.default.version || "1.0.0",
      description: pkg.default.description || "",
      author: pkg.default.author?.name || pkg.default.author || "involvex",
      license: pkg.default.license || "MIT",
      homepage: pkg.default.homepage,
      repository: pkg.default.repository?.url || pkg.default.repository,
    };
  } catch {
    return {
      name: "whatsapp-cli",
      version: "1.0.0",
      description: "WhatsApp CLI",
      author: "involvex",
      license: "MIT",
    };
  }
}
