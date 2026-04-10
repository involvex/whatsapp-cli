import type { Client, ClientOptions, Message } from "whatsapp-web.js";
import { executablePath as getPuppeteerExecutablePath } from "puppeteer";
import type { LaunchOptions } from "puppeteer";
import qrcode from "qrcode-terminal";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { getLogger } from "./logger";
import { PATHS } from "./config";

const logger = getLogger();
let clientInstance: Client | null = null;
let initPromise: Promise<Client> | null = null;
let qrCallback: ((qr: string) => void) | null = null;
let messageCallback: ((message: Message) => void) | null = null;
let readyCallback: ((client: Client) => void) | null = null;
let errorCallback: ((error: Error) => void) | null = null;
let connectionAttempts = 0;
let isLoggingOut = false;
const MAX_RETRY_ATTEMPTS = 3;
const DEFAULT_PUPPETEER_CACHE_DIR = path.join(
  os.homedir(),
  ".cache",
  "puppeteer",
);

type BrowserResolutionSource =
  | "PUPPETEER_EXECUTABLE_PATH"
  | "BUN_CHROME_PATH"
  | "system"
  | "puppeteer";
type LinkedDeviceBrowserName = "Chrome" | "Edge";
type WhatsAppWebModule = typeof import("whatsapp-web.js");

interface BrowserCandidate {
  browserName: LinkedDeviceBrowserName;
  path: string;
}

interface BrowserResolution {
  browserName: LinkedDeviceBrowserName;
  executablePath: string;
  source: BrowserResolutionSource;
  checkedPaths: string[];
  puppeteerCacheDirectory: string;
}

let warningFilterInstalled = false;
let punycodeWarningSuppressed = false;
let whatsappWebModulePromise: Promise<WhatsAppWebModule> | null = null;

function getPuppeteerCacheDirectory(): string {
  return process.env.PUPPETEER_CACHE_DIR || DEFAULT_PUPPETEER_CACHE_DIR;
}

function getUniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map(candidate => candidate.trim()).filter(Boolean))];
}

function getPathBrowserCandidates(
  executableNames: ReadonlyArray<BrowserCandidate>,
): BrowserCandidate[] {
  const pathValue = process.env.PATH;
  if (!pathValue) {
    return [];
  }

  return pathValue
    .split(path.delimiter)
    .filter(Boolean)
    .flatMap(dir =>
      executableNames.map(candidate => ({
        browserName: candidate.browserName,
        path: path.join(dir, candidate.path),
      })),
    );
}

function getSystemBrowserCandidates(): BrowserCandidate[] {
  switch (process.platform) {
    case "win32": {
      const installRoots = getUniquePaths([
        process.env.PROGRAMFILES || "",
        process.env["PROGRAMFILES(X86)"] || "",
        process.env.LOCALAPPDATA || "",
      ]);
      const commonCandidates = installRoots.flatMap(root => [
        {
          browserName: "Chrome" as const,
          path: path.join(
            root,
            "Google",
            "Chrome",
            "Application",
            "chrome.exe",
          ),
        },
        {
          browserName: "Chrome" as const,
          path: path.join(root, "Chromium", "Application", "chrome.exe"),
        },
        {
          browserName: "Chrome" as const,
          path: path.join(
            root,
            "BraveSoftware",
            "Brave-Browser",
            "Application",
            "brave.exe",
          ),
        },
        {
          browserName: "Edge" as const,
          path: path.join(
            root,
            "Microsoft",
            "Edge",
            "Application",
            "msedge.exe",
          ),
        },
      ]);

      return [
        ...commonCandidates,
        ...getPathBrowserCandidates([
          { browserName: "Chrome", path: "chrome.exe" },
          { browserName: "Chrome", path: "chromium.exe" },
          { browserName: "Chrome", path: "brave.exe" },
          { browserName: "Edge", path: "msedge.exe" },
        ]),
      ];
    }
    case "darwin":
      return [
        {
          browserName: "Chrome",
          path: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        },
        {
          browserName: "Chrome",
          path: "/Applications/Chromium.app/Contents/MacOS/Chromium",
        },
        {
          browserName: "Chrome",
          path: "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        },
        {
          browserName: "Edge",
          path: "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        },
        ...getPathBrowserCandidates([
          { browserName: "Chrome", path: "google-chrome" },
          { browserName: "Chrome", path: "chromium" },
          { browserName: "Chrome", path: "chromium-browser" },
          { browserName: "Chrome", path: "brave-browser" },
          { browserName: "Edge", path: "microsoft-edge" },
        ]),
      ];
    default:
      return [
        { browserName: "Chrome", path: "/usr/bin/google-chrome" },
        { browserName: "Chrome", path: "/usr/bin/google-chrome-stable" },
        { browserName: "Chrome", path: "/usr/bin/chromium" },
        { browserName: "Chrome", path: "/usr/bin/chromium-browser" },
        { browserName: "Chrome", path: "/usr/bin/brave-browser" },
        { browserName: "Edge", path: "/usr/bin/microsoft-edge" },
        ...getPathBrowserCandidates([
          { browserName: "Chrome", path: "google-chrome" },
          { browserName: "Chrome", path: "google-chrome-stable" },
          { browserName: "Chrome", path: "chromium" },
          { browserName: "Chrome", path: "chromium-browser" },
          { browserName: "Chrome", path: "brave-browser" },
          { browserName: "Edge", path: "microsoft-edge" },
        ]),
      ];
  }
}

function formatCheckedPaths(checkedPaths: string[]): string {
  if (checkedPaths.length === 0) {
    return "  - No browser candidate paths were generated";
  }

  const visiblePaths = checkedPaths
    .slice(0, 8)
    .map(candidate => `  - ${candidate}`);
  const remainingCount = checkedPaths.length - visiblePaths.length;

  if (remainingCount > 0) {
    visiblePaths.push(`  - ...and ${remainingCount} more candidate paths`);
  }

  return visiblePaths.join("\n");
}

function buildMissingConfiguredBrowserMessage(
  variableName: "PUPPETEER_EXECUTABLE_PATH" | "BUN_CHROME_PATH",
  configuredPath: string,
  puppeteerCacheDirectory: string,
): string {
  return [
    `${variableName} is set, but the configured browser executable does not exist:`,
    `  ${configuredPath}`,
    "",
    "Fix one of these:",
    `  1. Update ${variableName} to a valid Chrome/Chromium executable path.`,
    "  2. Install Google Chrome, Chromium, or Microsoft Edge in a standard location.",
    "  3. Install Puppeteer's managed browser: bunx puppeteer browsers install chrome",
    `  4. If you use a custom Puppeteer cache, verify PUPPETEER_CACHE_DIR (current: ${puppeteerCacheDirectory}).`,
  ].join("\n");
}

function buildMissingBrowserMessage(
  checkedPaths: string[],
  puppeteerCacheDirectory: string,
): string {
  return [
    "Could not find a compatible Chrome/Chromium executable for WhatsApp CLI.",
    "",
    "Checked:",
    formatCheckedPaths(checkedPaths),
    "",
    "Fix one of these:",
    "  1. Set PUPPETEER_EXECUTABLE_PATH to a valid Chrome/Chromium executable path.",
    "  2. Install Google Chrome, Chromium, or Microsoft Edge in a standard location.",
    "  3. Install Puppeteer's managed browser: bunx puppeteer browsers install chrome",
    `  4. If you use a custom Puppeteer cache, verify PUPPETEER_CACHE_DIR (current: ${puppeteerCacheDirectory}).`,
  ].join("\n");
}

function getBrowserSourceLabel(source: BrowserResolutionSource): string {
  switch (source) {
    case "PUPPETEER_EXECUTABLE_PATH":
      return "PUPPETEER_EXECUTABLE_PATH";
    case "BUN_CHROME_PATH":
      return "BUN_CHROME_PATH";
    case "system":
      return "system install";
    case "puppeteer":
      return "Puppeteer cache";
  }
}

function isPunycodeDeprecationWarning(
  warning: string | Error,
  rest: unknown[],
): boolean {
  const message = warning instanceof Error ? warning.message : String(warning);
  const codeFromWarning =
    warning instanceof Error &&
    "code" in warning &&
    typeof warning.code === "string"
      ? warning.code
      : undefined;
  const codeFromArgs =
    typeof rest[1] === "string"
      ? rest[1]
      : typeof rest[0] === "string" && rest[0] === "DEP0040"
        ? rest[0]
        : undefined;
  const code = codeFromWarning ?? codeFromArgs;

  return code === "DEP0040" && message.toLowerCase().includes("punycode");
}

function installUpstreamWarningFilter(): void {
  if (warningFilterInstalled) {
    return;
  }

  warningFilterInstalled = true;
  const originalEmitWarning = process.emitWarning.bind(process) as (
    warning: string | Error,
    ...rest: unknown[]
  ) => void;

  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    if (isPunycodeDeprecationWarning(warning, rest)) {
      if (!punycodeWarningSuppressed) {
        punycodeWarningSuppressed = true;
        logger.debug(
          "Suppressed upstream DEP0040 warning from whatsapp-web.js dependencies",
        );
      }
      return;
    }

    originalEmitWarning(warning, ...rest);
  }) as typeof process.emitWarning;
}

async function loadWhatsAppWebModule(): Promise<WhatsAppWebModule> {
  if (!whatsappWebModulePromise) {
    installUpstreamWarningFilter();
    whatsappWebModulePromise = import("whatsapp-web.js");
  }

  return whatsappWebModulePromise;
}

async function pathExists(candidatePath: string): Promise<boolean> {
  try {
    await fs.access(candidatePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveBrowserExecutable(): Promise<BrowserResolution> {
  const puppeteerCacheDirectory = getPuppeteerCacheDirectory();
  const checkedPaths: string[] = [];

  for (const variableName of [
    "PUPPETEER_EXECUTABLE_PATH",
    "BUN_CHROME_PATH",
  ] as const) {
    const configuredPath = process.env[variableName];
    if (!configuredPath) {
      continue;
    }

    checkedPaths.push(configuredPath);
    if (await pathExists(configuredPath)) {
      return {
        browserName: "Chrome",
        executablePath: configuredPath,
        source: variableName,
        checkedPaths,
        puppeteerCacheDirectory,
      };
    }

    throw new Error(
      buildMissingConfiguredBrowserMessage(
        variableName,
        configuredPath,
        puppeteerCacheDirectory,
      ),
    );
  }

  for (const candidate of getSystemBrowserCandidates()) {
    checkedPaths.push(candidate.path);
    if (await pathExists(candidate.path)) {
      return {
        browserName: candidate.browserName,
        executablePath: candidate.path,
        source: "system",
        checkedPaths,
        puppeteerCacheDirectory,
      };
    }
  }

  const puppeteerManagedPath = getPuppeteerExecutablePath();
  checkedPaths.push(puppeteerManagedPath);
  if (await pathExists(puppeteerManagedPath)) {
    return {
      browserName: "Chrome",
      executablePath: puppeteerManagedPath,
      source: "puppeteer",
      checkedPaths,
      puppeteerCacheDirectory,
    };
  }

  throw new Error(
    buildMissingBrowserMessage(checkedPaths, puppeteerCacheDirectory),
  );
}

function createPuppeteerOptions(
  browserResolution: BrowserResolution,
): LaunchOptions {
  return {
    executablePath: browserResolution.executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
    ],
  };
}

export function setQrCallback(callback: (qr: string) => void) {
  qrCallback = callback;
}

export function setMessageCallback(callback: (message: Message) => void) {
  messageCallback = callback;
}

export function setReadyCallback(callback: (client: Client) => void) {
  readyCallback = callback;
}

export function setErrorCallback(callback: (error: Error) => void) {
  errorCallback = callback;
}

export function getClientInstance(): Client | null {
  return clientInstance;
}

export async function initializeClient(): Promise<Client> {
  logger.logAction("initialize_client_start", { connectionAttempts });

  // Return existing promise if initialization is in progress
  if (initPromise) {
    logger.debug("Client initialization already in progress");
    return initPromise;
  }

  if (clientInstance) {
    logger.debug("Client instance already exists, reusing");
    return Promise.resolve(clientInstance);
  }

  initPromise = new Promise((resolve, reject) => {
    const initialize = async () => {
      try {
        const { Client: WhatsAppClient, LocalAuth } =
          await loadWhatsAppWebModule();
        // Check if session already exists - if so, reuse it
        const authPath = PATHS.auth;
        const sessionExists = await fs
          .access(authPath)
          .then(() => true)
          .catch(() => false);

        if (sessionExists) {
          logger.logClientEvent("authenticated", { sessionExists: true });
          console.log("✓ Found existing session - using saved authentication");
        } else {
          logger.info("No existing session - QR code required");
          console.log(
            "ℹ No existing session found - will require QR code scan",
          );
        }

        const browserResolution = await resolveBrowserExecutable();
        const puppeteerOptions = createPuppeteerOptions(browserResolution);
        const clientOptions: ClientOptions = {
          authStrategy: new LocalAuth({ dataPath: PATHS.auth }),
          browserName: browserResolution.browserName,
          puppeteer: puppeteerOptions,
          webVersionCache: {
            type: "local",
            path: PATHS.cache,
          },
        };

        logger.debug("Creating WhatsApp client with Puppeteer", {
          browserName: browserResolution.browserName,
          browserSource: browserResolution.source,
          executablePath: browserResolution.executablePath,
          headless: puppeteerOptions.headless,
          checkedPathCount: browserResolution.checkedPaths.length,
        });
        console.log(
          `✓ Using ${browserResolution.browserName} from ${getBrowserSourceLabel(browserResolution.source)}: ${browserResolution.executablePath}`,
        );
        console.log("Initializing WhatsApp client...");

        clientInstance = new WhatsAppClient(clientOptions);
        logger.info("WhatsApp client created successfully");
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to create Client", { error: errorMsg });
        console.error("Failed to create Client:", errorMsg);
        initPromise = null;
        reject(new Error(`Client creation failed: ${errorMsg}`));
        return;
      }

      if (!clientInstance) {
        logger.error("Client instance not created");
        reject(new Error("Client instance not created"));
        return;
      }

      clientInstance.on("qr", qr => {
        logger.logClientEvent("qr", { qrLength: qr.length });
        connectionAttempts = 0;
        if (qrCallback) {
          qrCallback(qr);
        } else {
          qrcode.generate(qr, { small: true });
        }
        console.log("QR code received - waiting for scan...");
      });

      clientInstance.on("ready", () => {
        logger.logClientEvent("ready");
        console.log("Client is ready!");
        connectionAttempts = 0;
        if (readyCallback && clientInstance) {
          readyCallback(clientInstance);
        }
        if (clientInstance) {
          resolve(clientInstance);
        }
        initPromise = null;
      });

      clientInstance.on("auth_failure", msg => {
        logger.logClientEvent("auth_failure", { message: msg });
        const errorMsg = `Authentication failed: ${msg}`;
        console.error("Authentication failure:", msg);
        clientInstance = null;
        const error = new Error(errorMsg);
        if (errorCallback) {
          errorCallback(error);
        }
        reject(error);
        initPromise = null;
      });

      clientInstance.on("disconnected", reason => {
        logger.logClientEvent("disconnected", { reason });
        console.log("Client disconnected:", reason);
        clientInstance = null;
        initPromise = null;

        if (isLoggingOut) return;

        if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
          connectionAttempts++;
          logger.info(
            `Attempting reconnection (${connectionAttempts}/${MAX_RETRY_ATTEMPTS})`,
          );
          console.log(
            `Attempting reconnection (${connectionAttempts}/${MAX_RETRY_ATTEMPTS})...`,
          );
          setTimeout(() => {
            if (initPromise === null) {
              initializeClient().catch(err => {
                logger.error("Reconnection failed", { error: err });
                console.error("Reconnection failed:", err);
                if (errorCallback) {
                  errorCallback(new Error(`Reconnection failed: ${reason}`));
                }
              });
            }
          }, 5000);
        } else {
          logger.error("Max reconnection attempts reached");
          console.error("Max reconnection attempts reached");
          if (errorCallback) {
            errorCallback(new Error("Lost connection after multiple attempts"));
          }
        }
      });

      clientInstance.on("message", msg => {
        logger.debug("Message received", { from: msg.from, to: msg.to });
        if (messageCallback) {
          messageCallback(msg);
        }
      });

      clientInstance.on("message_create", msg => {
        logger.debug("Message created", {
          fromMe: msg.id.fromMe,
          to: msg.to,
          from: msg.from,
        });
        if (messageCallback) {
          messageCallback(msg);
        }
      });

      clientInstance.on("loading_screen", percent => {
        logger.debug(`Loading WhatsApp... ${percent}%`);
        console.log(`Loading WhatsApp... ${percent}%`);
      });

      // Initialize the client
      try {
        logger.info("Initializing client...");
        await clientInstance.initialize();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to initialize client", { error: errorMsg });
        console.error("Failed to initialize client:", errorMsg);
        initPromise = null;
        reject(new Error(`Client initialization failed: ${errorMsg}`));
        return;
      }
    };

    initialize().catch(err => {
      logger.error("Initialize promise rejected", { error: err });
      reject(err);
    });
  });

  return initPromise;
}

export async function clearAuthSession(): Promise<void> {
  logger.logAction("clear_auth_session");
  isLoggingOut = true;
  try {
    if (clientInstance) {
      const instance = clientInstance;
      clientInstance = null;
      initPromise = null;
      try {
        await instance.logout();
        logger.info("Logged out successfully");
        console.log("✓ Logged out successfully");
      } catch {
        logger.debug("Browser closed during logout (expected)");
      }
    } else {
      clientInstance = null;
      initPromise = null;
    }

    await fs.rm(PATHS.auth, { recursive: true, force: true });
    logger.info("Authentication session cleared");
    console.log("✓ Authentication session cleared");
  } catch (error) {
    logger.error("Error clearing session", { error });
    console.error("Error clearing session:", error);
  } finally {
    isLoggingOut = false;
  }
}

export default clientInstance;
