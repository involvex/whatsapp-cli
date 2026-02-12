import qrcode from "qrcode-terminal";
import { createReadlineInterface, promptUser } from "./readline-utils";
import type { Interface as ReadlineInterface } from "readline";
import {
  initializeClient,
  clearAuthSession,
  setQrCallback,
  setReadyCallback,
  setErrorCallback,
  setMessageCallback,
} from "./client";
import {
  colors,
  printHeader,
  printMenu,
  printSection,
  clearScreen,
  printSuccess,
  printError,
  printWarning,
  printInfo,
  printLoading,
} from "./ui";
import { showSettingsMenu } from "./settings";
import { loadConfig, getConfig, PATHS } from "./config";
import { createLogger } from "./logger";
import {
  parseArgs,
  showHelp,
  showAbout,
  showVersion,
  getPackageInfo,
} from "./args";
import type { Chat, Message, Client } from "whatsapp-web.js";

// Initialize logger (config will be loaded later)
const logger = createLogger({ console: false, file: false });

interface AppState {
  client: Client | null;
  chats: Chat[];
  activeChatId: string | null;
  activeChat: Chat | null;
  isConnected: boolean;
  isExiting: boolean;
  aiEnabled: boolean;
  recentMessages: Array<{
    sender: string;
    message: string;
    time: string;
    fromMe: boolean;
  }>;
}

const state: AppState = {
  client: null,
  chats: [],
  activeChatId: null,
  activeChat: null,
  isConnected: false,
  isExiting: false,
  aiEnabled: false,
  recentMessages: [],
};

async function displayChats(): Promise<void> {
  if (state.chats.length === 0) {
    printInfo("No chats available");
    return;
  }

  printSection("Your Chats");
  state.chats.slice(0, 20).forEach((chat, index) => {
    const name = chat.name || chat.id.user || "Unknown";
    const unread =
      chat.unreadCount > 0
        ? ` ${colors.warning(`[${chat.unreadCount} unread]`)}`
        : "";
    console.log(
      `  ${colors.highlight((index + 1).toString().padStart(2))}. ${name}${unread}`,
    );
  });

  if (state.chats.length > 20) {
    console.log(colors.dim(`  ... and ${state.chats.length - 20} more chats`));
  }
}

async function selectChat(rl: ReadlineInterface): Promise<void> {
  clearScreen();
  printHeader("Select Chat");

  if (state.chats.length === 0) {
    printWarning("No chats to select from");
    return;
  }

  await displayChats();
  const chatNumberStr = await promptUser(
    rl,
    colors.highlight("\n📍 Enter chat number: "),
  );
  const chatNumber = parseInt(chatNumberStr, 10);

  if (chatNumber >= 1 && chatNumber <= state.chats.length) {
    const selectedChat = state.chats[chatNumber - 1];
    if (selectedChat) {
      state.activeChat = selectedChat;
      state.activeChatId = selectedChat.id._serialized;
      printSuccess(
        `Selected: ${selectedChat.name || selectedChat.id.user || "Unknown"}`,
      );
    }
  } else {
    printError("Invalid chat number");
  }
}

async function sendMessage(rl: ReadlineInterface): Promise<void> {
  clearScreen();
  printHeader("Send Message");

  if (!state.activeChatId || !state.activeChat) {
    printError("No chat selected. Please select a chat first");
    return;
  }

  const chatName =
    state.activeChat.name || state.activeChat.id.user || "Unknown";
  console.log(`Sending to: ${colors.highlight(chatName)}\n`);

  const message = await promptUser(rl, colors.highlight("💬 Enter message: "));

  if (!message.trim()) {
    printWarning("Message cannot be empty");
    return;
  }

  try {
    if (!state.client) {
      printError("Client not initialized");
      return;
    }

    printLoading("Sending message...");

    const result = await state.client.sendMessage(state.activeChatId, message);

    if (result) {
      printSuccess("Message sent successfully!");
      console.log(colors.dim(`   ID: ${result.id.id}`));
    } else {
      printWarning("Message send returned no ID - may have failed");
    }
  } catch (error) {
    printError(
      `Failed to send message: ${error instanceof Error ? error.message : error}`,
    );
  }
}

async function showChatHistory(_rl: ReadlineInterface): Promise<void> {
  clearScreen();
  printHeader("Chat History");

  if (!state.activeChatId || !state.activeChat) {
    printError("No chat selected. Please select a chat first");
    return;
  }

  try {
    if (!state.client) {
      printError("Client not initialized");
      return;
    }

    const chatName =
      state.activeChat.name || state.activeChat.id.user || "Unknown";
    printLoading(`Fetching messages from ${chatName}...`);
    const chat = await state.client.getChatById(state.activeChatId);
    const messageLimit = getConfig().messageLimit;
    const messages = await chat.fetchMessages({ limit: messageLimit });

    printSection(`Last ${messageLimit} messages from ${chat.name || "chat"}`);
    messages.reverse().forEach((msg: Message) => {
      const sender = msg.from?.split("@")[0] || "Unknown";
      const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
      const content = msg.body || "[Media/Sticker]";
      const indicator = msg.id.fromMe
        ? colors.outgoing("📤")
        : colors.incoming("📥");
      console.log(
        `  ${indicator} ${colors.timestamp(`[${time}]`)} ${colors.bold(sender)}: ${content}`,
      );
    });
  } catch (error) {
    printError(
      `Failed to fetch chat history: ${error instanceof Error ? error.message : error}`,
    );
  }
}

function toggleAiMode(): void {
  const config = getConfig();

  if (config.aiProvider.provider === "none") {
    printWarning("AI provider not configured");
    printInfo("Go to Settings to configure AI provider");
    return;
  }

  state.aiEnabled = !state.aiEnabled;

  if (state.aiEnabled) {
    printSuccess("AI mode ENABLED");
    console.log(`  Provider: ${colors.provider(config.aiProvider.provider)}`);
    console.log(`  Model: ${colors.model(config.aiProvider.model)}`);
    console.log(
      `  Temperature: ${colors.highlight(config.aiProvider.temperature.toString())}`,
    );
  } else {
    printWarning("AI mode DISABLED");
  }
}

async function handleLogout(rl: ReadlineInterface): Promise<void> {
  printWarning("Clear authentication and logout?");
  const confirmation = await promptUser(
    rl,
    colors.highlight("Are you sure? (yes/no): "),
  );

  if (confirmation.toLowerCase() === "yes") {
    await clearAuthSession();
    printSuccess("Session cleared. Restart the app to re-authenticate");
    state.isExiting = true;
  } else {
    printWarning("Logout cancelled");
  }
}

async function showAboutMenu(rl: ReadlineInterface): Promise<void> {
  const packageInfo = await getPackageInfo();

  clearScreen();
  printHeader("About WhatsApp CLI");

  console.log("");
  printSection("Information");
  console.log(`  Name:           ${colors.bold(packageInfo.name)}`);
  console.log(`  Version:        ${colors.highlight(packageInfo.version)}`);
  console.log(`  Author:         ${packageInfo.author}`);
  console.log(`  License:        ${packageInfo.license}`);
  console.log(`  Description:    ${packageInfo.description}`);

  console.log("");
  printSection("Data Location");
  console.log(`  Config:         ${colors.dim(PATHS.config)}`);
  console.log(`  Auth:           ${colors.dim(PATHS.auth)}`);
  console.log(`  Logs:           ${colors.dim(PATHS.logs)}`);
  console.log(`  Cache:          ${colors.dim(PATHS.cache)}`);
  console.log(`  Chat History:   ${colors.dim(PATHS.chatHistory)}`);

  console.log("");
  printSection("Features");
  console.log(`  ${colors.success("✓")} QR code authentication`);
  console.log(`  ${colors.success("✓")} Send and receive messages`);
  console.log(`  ${colors.success("✓")} Chat history persistence`);
  console.log(`  ${colors.success("✓")} AI message generation`);
  console.log(`  ${colors.success("✓")} Configurable logging`);
  console.log(`  ${colors.success("✓")} Session persistence`);

  console.log("");
  if (packageInfo.homepage) {
    console.log(
      `  ${colors.dim("Homepage:")} ${colors.highlight(packageInfo.homepage)}`,
    );
  }

  console.log("");
  console.log(
    `  ${colors.dim("Built with Claude Code - https://claude.com/claude-code")}`,
  );

  console.log("");
  await promptUser(rl, "Press Enter to continue...");
}

async function mainLoop(rl: ReadlineInterface): Promise<void> {
  while (!state.isExiting) {
    try {
      clearScreen();
      printHeader("WhatsApp CLI - AI Enabled Edition");

      const statusText = state.isConnected
        ? colors.success("Connected to WhatsApp")
        : colors.loading("Connecting");
      const aiStatus = state.aiEnabled ? ` ${colors.ai("AI: ON")}` : "";
      console.log(`\n${statusText}${aiStatus}`);

      if (state.activeChat) {
        const chatName = state.activeChat.name || state.activeChat.id.user;
        console.log(`📍 Active chat: ${colors.bold(chatName)}`);
      }

      // Display recent messages sidebar
      if (state.recentMessages.length > 0) {
        printSection("📬 Recent Messages");
        state.recentMessages.slice(-5).forEach(msg => {
          const indicator = msg.fromMe ? "📤" : "📥";
          console.log(
            `  ${indicator} ${colors.timestamp(msg.time)} ${colors.bold(msg.sender)}: ${colors.dim(msg.message.substring(0, 40))}${msg.message.length > 40 ? "..." : ""}`,
          );
        });
      }

      printMenu([
        { num: "1", text: "List chats" },
        { num: "2", text: "Select chat" },
        { num: "3", text: "Send message" },
        { num: "4", text: "Show chat history" },
        { num: "5", text: "Toggle AI mode" },
        { num: "6", text: "Settings" },
        { num: "7", text: "About" },
        { num: "8", text: "Logout & reset" },
        { num: "9", text: "Exit" },
      ]);

      const choice = await promptUser(rl, colors.highlight("Enter command: "));

      switch (choice) {
        case "1":
          await displayChats();
          await promptUser(rl, "Press Enter to continue...");
          break;
        case "2":
          await selectChat(rl);
          await promptUser(rl, "Press Enter to continue...");
          break;
        case "3":
          await sendMessage(rl);
          await promptUser(rl, "Press Enter to continue...");
          break;
        case "4":
          await showChatHistory(rl);
          await promptUser(rl, "Press Enter to continue...");
          break;
        case "5":
          toggleAiMode();
          await promptUser(rl, "Press Enter to continue...");
          break;
        case "6":
          await showSettingsMenu(rl);
          break;
        case "7":
          await showAboutMenu(rl);
          break;
        case "8":
          await handleLogout(rl);
          break;
        case "9":
          state.isExiting = true;
          break;
        default:
          printError("Invalid command. Please enter 1-9");
          await promptUser(rl, "Press Enter to continue...");
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("readline was closed")
      ) {
        state.isExiting = true;
      } else {
        printError(`Error: ${error}`);
        await promptUser(rl, "Press Enter to continue...");
      }
    }
  }

  // Properly close readline and exit
  rl.close();
  console.log("\n👋 Goodbye!");
  process.exit(0);
}

async function main(): Promise<void> {
  // Load config first
  const config = await loadConfig();

  // Configure logger with settings from config
  logger.updateConfig(config.logging);
  logger.logAction("app_start", { version: "1.0.0" });

  const rl = createReadlineInterface();

  try {
    setQrCallback((qr: string) => {
      logger.logClientEvent("qr", { qrLength: qr.length });
      clearScreen();
      printHeader("WhatsApp CLI - AI Enabled Edition");
      console.log(colors.info("Authentication Required\n"));
      console.log("Scan this QR code with your WhatsApp app:\n");
      qrcode.generate(qr, { small: true });
      console.log(
        colors.dim(
          "\n⏳ Waiting for QR scan... (This will auto-continue when scanned)\n",
        ),
      );
    });

    setReadyCallback(async (client: Client) => {
      logger.logClientEvent("ready");
      state.client = client;
      state.isConnected = true;
      printSuccess("WhatsApp authenticated successfully!\n");

      try {
        const chats = await client.getChats();
        logger.info(`Loaded ${chats.length} chats`);
        state.chats = chats.sort(
          (a: Chat, b: Chat) => (b.timestamp || 0) - (a.timestamp || 0),
        );
        console.log(colors.info(`Loaded ${chats.length} chats.\n`));
      } catch (error) {
        logger.error("Failed to load chats", { error });
        printError(`Failed to load chats: ${error}`);
      }

      console.log("Starting CLI...\n");
      setTimeout(() => {
        mainLoop(rl).catch(console.error);
      }, 1000);
    });

    setErrorCallback((error: Error) => {
      logger.error("Error callback triggered", { message: error.message });
      console.log("");
      printError(error.message);
      state.isExiting = true;
      rl.close();
    });

    setMessageCallback((msg: Message) => {
      const sender = msg.from?.split("@")[0] || "Unknown";
      const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
      const messageText = msg.body || "[Media]";

      logger.logMessageEvent(
        msg.id.fromMe ? "sent" : "received",
        msg.from || "unknown",
        { sender, time, messageLength: messageText.length },
      );

      // Add to recent messages (keep last 20)
      state.recentMessages.push({
        sender,
        message: messageText,
        time,
        fromMe: msg.id.fromMe,
      });
      if (state.recentMessages.length > 20) {
        state.recentMessages.shift();
      }

      // Show notification for incoming messages
      if (!state.isExiting && msg.id.fromMe === false) {
        console.log(
          `\n${colors.incoming(`New message from ${sender} [${time}]`)}: ${messageText}`,
        );
      }
    });

    clearScreen();
    printHeader("WhatsApp CLI - AI Enabled Edition");
    console.log(colors.loading("Initializing WhatsApp client...\n"));

    await initializeClient();
  } catch (error) {
    logger.error("Fatal error in main", { error });
    printError(`Fatal error: ${error}`);
    await logger.close();
    process.exit(1);
  }
}

// CLI entry point with argument handling
async function cliEntry(): Promise<void> {
  const args = process.argv.slice(2);
  const parsedArgs = parseArgs(args);
  const packageInfo = await getPackageInfo();

  // Handle special commands that don't require full initialization
  if (parsedArgs.help) {
    showHelp(packageInfo);
    process.exit(0);
    return;
  }

  if (parsedArgs.version) {
    showVersion(packageInfo);
    process.exit(0);
    return;
  }

  if (parsedArgs.about) {
    showAbout(packageInfo);
    process.exit(0);
    return;
  }

  if (parsedArgs.config) {
    // Show current configuration
    const config = await loadConfig();
    console.log(JSON.stringify(config, null, 2));
    process.exit(0);
    return;
  }

  if (parsedArgs.chats) {
    // List chats and exit (requires client initialization)
    try {
      await loadConfig();
      const client = await initializeClient();
      const chats = await client.getChats();
      console.log(`Total chats: ${chats.length}`);
      chats.forEach((chat, index) => {
        const name = chat.name || chat.id.user || "Unknown";
        console.log(`${index + 1}. ${name}`);
      });
      await logger.close();
      process.exit(0);
    } catch (error) {
      console.error(`Error: ${error}`);
      process.exit(1);
    }
    return;
  }

  // Normal CLI mode
  await main();
}

cliEntry().catch(async error => {
  console.error(`Fatal error: ${error}`);
  await logger.close();
  process.exit(1);
});

export {};
