import { Client, LocalAuth } from "whatsapp-web.js";
import type { Message } from "whatsapp-web.js";
import type { LaunchOptions } from "puppeteer";
import qrcode from "qrcode-terminal";
import { promises as fs } from "fs";
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
const MAX_RETRY_ATTEMPTS = 3;

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
          webVersionCache: {
            type: "local",
            path: PATHS.cache,
          },
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
    if (clientInstance) {
      await clientInstance.logout();
      logger.info("Logged out successfully");
      console.log("✓ Logged out successfully");
    }

    const authPath = PATHS.auth;
    await fs.rm(authPath, { recursive: true, force: true });
    logger.info("Authentication session cleared");
    console.log("✓ Authentication session cleared");

    clientInstance = null;
    initPromise = null;
  } catch (error) {
    logger.error("Error clearing session", { error });
    console.error("Error clearing session:", error);
  }
}

export default clientInstance;
