import React, { useState, useEffect, useCallback, useRef } from "react";
import { render } from "ink";
import { App } from "./components/App";
import qrcode from "qrcode-terminal";
import {
  initializeClient,
  clearAuthSession,
  setQrCallback,
  setReadyCallback,
  setErrorCallback,
  setMessageCallback,
} from "./client";
import { loadConfig, getConfig } from "./config";
import { createLogger } from "./logger";
import { parseArgs, showHelp, getPackageInfo, showVersion } from "./args";
import type { Chat, Message, Client } from "whatsapp-web.js";

// Initialize logger
const logger = createLogger({ console: false, file: false });

const WhatsAppCLI: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [recentMessages, setRecentMessages] = useState<
    Array<{
      sender: string;
      message: string;
      time: string;
      fromMe: boolean;
    }>
  >([]);
  const [client, setClient] = useState<Client | null>(null);
  const [qrCodeString, setQrCodeString] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"chat" | "about" | "settings">(
    "chat",
  );

  const activeChatRef = useRef<Chat | null>(null);
  activeChatRef.current = activeChat;

  const config = getConfig();

  useEffect(() => {
    const init = async () => {
      setQrCallback((qr: string) => {
        qrcode.generate(qr, { small: true }, code => {
          setQrCodeString(code);
        });
        logger.logClientEvent("qr", { qrLength: qr.length });
      });

      setReadyCallback(async (readyClient: Client) => {
        setClient(readyClient);
        setIsConnected(true);
        setQrCodeString(null);

        try {
          const loadedChats = await readyClient.getChats();
          setChats(
            loadedChats.sort(
              (a: Chat, b: Chat) => (b.timestamp || 0) - (a.timestamp || 0),
            ),
          );
        } catch (error) {
          logger.error("Failed to load chats", { error });
        }
      });

      setMessageCallback((msg: Message) => {
        const sender = msg.from?.split("@")[0] || "Unknown";
        const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
        const messageText = msg.body || "[Media]";

        // Only append to UI if it's from/to the active chat
        const currentActive = activeChatRef.current;
        if (
          currentActive &&
          (msg.from === currentActive.id._serialized ||
            (msg.id.fromMe && msg.to === currentActive.id._serialized))
        ) {
          setRecentMessages(prev => {
            const newMessages = [
              ...prev,
              { sender, message: messageText, time, fromMe: msg.id.fromMe },
            ];
            return newMessages.slice(-20);
          });
        }
      });

      setErrorCallback((error: Error) => {
        logger.error("Client error", { error });
      });

      try {
        await initializeClient();
      } catch (error) {
        logger.error("Initialization error", { error });
      }
    };

    init();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (client && activeChat) {
        try {
          const chat = await client.getChatById(activeChat.id._serialized);
          const messages = await chat.fetchMessages({
            limit: config.messageLimit || 15,
          });

          setRecentMessages(
            messages.map((msg: Message) => ({
              sender:
                msg.from?.split("@")[0] || (msg.id.fromMe ? "Me" : "Unknown"),
              message: msg.body || "[Media/Sticker]",
              time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
              fromMe: msg.id.fromMe,
            })),
          );
        } catch (error) {
          logger.error("Failed to fetch history", { error });
        }
      }
    };

    fetchHistory();
  }, [client, activeChat, config.messageLimit]);

  const handleCommand = useCallback(
    async (cmd: string) => {
      setCurrentView("chat");
      switch (cmd) {
        case "1": // Refresh chats
          if (client) {
            const loadedChats = await client.getChats();
            setChats(
              loadedChats.sort(
                (a: Chat, b: Chat) => (b.timestamp || 0) - (a.timestamp || 0),
              ),
            );
          }
          break;
        case "4": // Force refresh history
          if (client && activeChat) {
            const chat = await client.getChatById(activeChat.id._serialized);
            const messages = await chat.fetchMessages({
              limit: config.messageLimit || 15,
            });
            setRecentMessages(
              messages.map((msg: Message) => ({
                sender:
                  msg.from?.split("@")[0] || (msg.id.fromMe ? "Me" : "Unknown"),
                message: msg.body || "[Media/Sticker]",
                time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
                fromMe: msg.id.fromMe,
              })),
            );
          }
          break;
        case "5": // Toggle AI
          setAiEnabled(prev => !prev);
          break;
        case "6": // Settings
          setCurrentView("settings");
          break;
        case "7": // About
          setCurrentView("about");
          break;
        case "8": // Logout
          await clearAuthSession();
          process.exit(0);
          break;
      }
    },
    [client, activeChat, config.messageLimit],
  );

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (client && activeChat && message.trim()) {
        try {
          await client.sendMessage(activeChat.id._serialized, message);
          // Note: setMessageCallback will handle adding this to recentMessages if it's to the active chat
        } catch (error) {
          logger.error("Send message error", { error });
        }
      }
    },
    [client, activeChat],
  );

  const handleSelectChat = useCallback(
    (index: number) => {
      if (index >= 1 && index <= chats.length) {
        setActiveChat(chats[index - 1] || null);
        setCurrentView("chat");
      }
    },
    [chats],
  );

  return (
    <App
      initialChats={chats}
      isConnected={isConnected}
      aiEnabled={aiEnabled}
      aiProvider={config.aiProvider.provider}
      aiModel={config.aiProvider.model}
      recentMessages={recentMessages}
      onCommand={handleCommand}
      onSendMessage={handleSendMessage}
      onSelectChat={handleSelectChat}
      activeChat={activeChat}
      qrCode={qrCodeString}
      currentView={currentView}
    />
  );
};

// CLI entry point
async function cliEntry(): Promise<void> {
  const args = process.argv.slice(2);
  const parsedArgs = parseArgs(args);
  const packageInfo = await getPackageInfo();

  if (parsedArgs.help) {
    showHelp(packageInfo);
    process.exit(0);
  }

  if (parsedArgs.version) {
    showVersion(packageInfo);
    process.exit(0);
  }

  // Load config
  const config = await loadConfig();
  logger.updateConfig(config.logging);

  render(<WhatsAppCLI />);
}

cliEntry().catch(error => {
  console.error(`Fatal error: ${error}`);
  process.exit(1);
});
