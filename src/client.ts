import { Client, LocalAuth } from "whatsapp-web.js";
import type { Message } from "whatsapp-web.js";
import type { LaunchOptions } from "puppeteer";
import qrcode from "qrcode-terminal";
import { promises as fs, existsSync } from "fs";
import path from "path";
import { getLogger } from "./logger";
import { PATHS } from "./config";

// Set Chrome path via environment variable for puppeteer
process.env.PUPPETEER_EXECUTABLE_PATH =
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const logger = getLogger();
let clientInstance: Client | null = null;
let initPromise: Promise<Client> | null = null;
let qrCallback: ((qr: string) => void) | null = null;
let messageCallback: ((message: Message) => void) | null = null;
let readyCallback: ((client: Client) => void) | null = null;
let errorCallback: ((error: Error) => void) | null = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 3;
const LOCAL_CACHE_DIR = ".wwebjs_cache";
let syncInterval: NodeJS.Timeout | null = null;
const syncedFiles = new Set<string>();

/**
 * Syncs a single file from local cache to centralized cache
 */
async function syncCacheFile(filePath: string): Promise<void> {
  try {
    const relativePath = filePath
      .replace(LOCAL_CACHE_DIR, "")
      .replace(/^[\\/]+/, "");
    const destPath = path.join(PATHS.cache, relativePath);

    // Skip if already synced
    if (syncedFiles.has(filePath)) {
      return;
    }

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    await fs.mkdir(destDir, { recursive: true });

    // Move file to centralized cache
    await fs.rename(filePath, destPath).catch(async () => {
      // If rename fails (cross-device), copy instead
      await fs.copyFile(filePath, destPath);
      await fs.unlink(filePath);
    });

    syncedFiles.add(filePath);
    logger.debug(`Synced cache file: ${relativePath}`);
  } catch (error) {
    logger.warn(`Failed to sync cache file: ${filePath}`, { error });
  }
}

/**
 * Performs initial sync of existing cache directory
 */
async function initialCacheSync(): Promise<void> {
  try {
    await fs.mkdir(PATHS.cache, { recursive: true });

    if (!existsSync(LOCAL_CACHE_DIR)) {
      // Create empty symlink to prevent whatsapp-web.js from creating real dir
      try {
        await fs.symlink(PATHS.cache, LOCAL_CACHE_DIR, "dir");
        logger.info(
          `Created cache symlink: ${LOCAL_CACHE_DIR} -> ${PATHS.cache}`,
        );
      } catch (error) {
        logger.warn("Failed to create symlink, will monitor and sync", {
          error,
        });
      }
      return;
    }

    // Check if it's a real directory
    const stat = await fs.stat(LOCAL_CACHE_DIR);
    if (!stat.isSymbolicLink()) {
      // It's a real directory, sync all files and replace with symlink
      logger.info("Existing cache directory found, syncing files...");

      const entries = await fs.readdir(LOCAL_CACHE_DIR, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        const srcPath = path.join(LOCAL_CACHE_DIR, entry.name);
        if (entry.isDirectory()) {
          await fs
            .rm(srcPath, { recursive: true, force: true })
            .catch(() => {});
        } else {
          await syncCacheFile(srcPath);
        }
      }

      // Remove directory and create symlink
      await fs.rm(LOCAL_CACHE_DIR, { recursive: true, force: true });
      await fs.symlink(PATHS.cache, LOCAL_CACHE_DIR, "dir");
      logger.info("Cache directory replaced with symlink");
    }
  } catch (error) {
    logger.warn("Initial cache sync completed with warnings", { error });
  }
}

/**
 * Starts continuous cache monitoring and syncing
 */
function startCacheSync(): void {
  // Sync every 2 seconds
  syncInterval = setInterval(async () => {
    if (!existsSync(LOCAL_CACHE_DIR)) {
      return;
    }

    try {
      const stat = await fs.stat(LOCAL_CACHE_DIR);
      // Skip if it's a symlink pointing to the right place
      if (stat.isSymbolicLink()) {
        return;
      }
    } catch {
      return;
    }

    // It's a real directory, sync its contents
    try {
      const entries = await fs.readdir(LOCAL_CACHE_DIR, {
        withFileTypes: true,
      });
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(LOCAL_CACHE_DIR, entry.name);
          await syncCacheFile(filePath);
        }
      }
    } catch {
      // Directory might have been deleted, ignore
    }
  }, 2000);
}

/**
 * Stops cache sync monitoring
 */
function stopCacheSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
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

  // Setup continuous cache sync
  await initialCacheSync();
  startCacheSync();

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

        const puppeteerOptions: LaunchOptions = {
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

        logger.debug("Creating WhatsApp client with Puppeteer", {
          headless: puppeteerOptions.headless,
        });
        console.log("Initializing WhatsApp client...");

        clientInstance = new Client({
          authStrategy: new LocalAuth({ dataPath: PATHS.auth }),
          puppeteer: puppeteerOptions,
        });
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
        clientInstance.initialize();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logger.error("Failed to initialize client", { error: errorMsg });
        console.error("Failed to initialize client:", errorMsg);
        initPromise = null;
        reject(new Error(`Client initialization failed: ${errorMsg}`));
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
  try {
    stopCacheSync();

    if (clientInstance) {
      await clientInstance.logout();
      logger.info("Logged out successfully");
      console.log("✓ Logged out successfully");
    }

    const authPath = PATHS.auth;
    await fs.rm(authPath, { recursive: true, force: true });
    logger.info("Authentication session cleared");
    console.log("✓ Authentication session cleared");

    // Clean up local cache directory
    if (existsSync(LOCAL_CACHE_DIR)) {
      await fs.rm(LOCAL_CACHE_DIR, { recursive: true, force: true });
      logger.info("Local cache directory cleared");
    }

    clientInstance = null;
    initPromise = null;
    syncedFiles.clear();
  } catch (error) {
    logger.error("Error clearing session", { error });
    console.error("Error clearing session:", error);
  }
}

export default clientInstance;
