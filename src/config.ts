import { promises as fs } from "fs";
import path from "path";
import os from "os";
import type { LogLevel } from "./logger";

// Centralized ~/.whatsapp-cli directory structure
const WHATSAPP_CLI_DIR =
  process.env.WHATSAPP_CLI_DIR || path.join(os.homedir(), ".whatsapp-cli");

export const PATHS = {
  root: WHATSAPP_CLI_DIR,
  config: path.join(WHATSAPP_CLI_DIR, "config.json"),
  auth: path.join(WHATSAPP_CLI_DIR, "auth"),
  logs: path.join(WHATSAPP_CLI_DIR, "logs"),
  cache: path.join(WHATSAPP_CLI_DIR, "cache"),
  chatHistory: path.join(WHATSAPP_CLI_DIR, "chat-history.json"),
} as const;

export interface AiProviderConfig {
  provider: "openrouter" | "openai" | "gemini" | "none";
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
}

export interface LoggingConfig {
  level: LogLevel;
  console: boolean;
  file: boolean;
  filePath: string;
  timestamp: boolean;
  colors: boolean;
}

export interface CliConfig {
  aiProvider: AiProviderConfig;
  theme: "default" | "dark" | "colorful";
  messageLimit: number;
  autoReconnect: boolean;
  logging: LoggingConfig;
  chatHistoryEnabled: boolean;
  soundEnabled: boolean;
}

const DEFAULT_CONFIG: CliConfig = {
  aiProvider: {
    provider: "none",
    model: "auto",
    apiKey: "",
    temperature: 0.7,
    maxTokens: 500,
  },
  theme: "default",
  messageLimit: 15,
  autoReconnect: true,
  logging: {
    level: "info",
    console: true,
    file: true,
    filePath: PATHS.logs + "/whatsapp-cli",
    timestamp: true,
    colors: true,
  },
  chatHistoryEnabled: true,
  soundEnabled: true,
};

const AVAILABLE_MODELS: Record<string, string[]> = {
  openrouter: [
    "auto",
    "claude-3-opus",
    "claude-3-sonnet",
    "gpt-4-turbo",
    "gpt-4",
    "gpt-3.5-turbo",
  ],
  openai: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
  gemini: ["gemini-pro", "gemini-1.5-pro"],
};

let config: CliConfig = { ...DEFAULT_CONFIG };

async function ensureDirectories(): Promise<void> {
  const dirs = [PATHS.root, PATHS.auth, PATHS.logs, PATHS.cache];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true }).catch(() => {
      /* ignore if already exists */
    });
  }
}

export async function loadConfig(): Promise<CliConfig> {
  try {
    // Ensure all directories exist
    await ensureDirectories();

    const data = await fs.readFile(PATHS.config, "utf-8");
    config = JSON.parse(data);
    return config;
  } catch {
    // Config doesn't exist yet, use default and save it
    await saveConfig(config);
    return config;
  }
}

export async function saveConfig(newConfig: CliConfig): Promise<void> {
  config = newConfig;
  // Ensure all directories exist
  await ensureDirectories();
  await fs.writeFile(PATHS.config, JSON.stringify(config, null, 2));
}

export function getConfig(): CliConfig {
  return config;
}

export function getAvailableModels(provider: string): string[] {
  const models = AVAILABLE_MODELS[provider as keyof typeof AVAILABLE_MODELS];
  return (models ?? AVAILABLE_MODELS.openrouter) as string[];
}

export function resetConfig(): void {
  config = { ...DEFAULT_CONFIG };
}
