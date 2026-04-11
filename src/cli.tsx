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
import {
  loadChatHistory,
  saveChatHistory,
  messageToPersisted,
  chatToPersistedChat,
  type PersistedChat,
} from "./chatPersistence";
import type { Chat, Message, Client } from "whatsapp-web.js";

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "ready"
  | "loading_history";

// Initialize logger
const logger = createLogger({ console: false, file: false });

const WhatsAppCLI: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [persistedChats, setPersistedChats] = useState<PersistedChat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [historyError, setHistoryError] = useState<string | null>(null);
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

  // Load persisted chat history on mount
  useEffect(() => {
    const loadPersisted = async () => {
      const loaded = await loadChatHistory();
      if (loaded.length > 0) {
        setPersistedChats(loaded);
        console.log(`✓ Loaded ${loaded.length} chats from previous session`);
      }
    };
    loadPersisted();
  }, []);

  useEffect(() => {
    const init = async () => {
      setConnectionStatus("connecting");
      setQrCallback((qr: string) => {
        setConnectionStatus("connecting");
        qrcode.generate(qr, { small: true }, code => {
          setQrCodeString(code);
        });
        logger.logClientEvent("qr", { qrLength: qr.length });
      });

      setReadyCallback(async (readyClient: Client) => {
        setClient(readyClient);
        setIsConnected(true);
        setConnectionStatus("ready");
        setQrCodeString(null);

        try {
          const loadedChats = await readyClient.getChats();
          const sortedChats = loadedChats.sort(
            (a: Chat, b: Chat) => (b.timestamp || 0) - (a.timestamp || 0),
          );
          setChats(sortedChats);

          // Persist chats and messages
          const persisted: PersistedChat[] =
            sortedChats.map(chatToPersistedChat);
          setPersistedChats(persisted);
          await saveChatHistory(persisted);
          console.log(`✓ Saved ${persisted.length} chats`);
        } catch (error) {
          logger.error("Failed to load chats", { error });
        }
      });

      setMessageCallback((msg: Message) => {
        const sender = msg.from?.split("@")[0] || "Unknown";
        const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
        const messageText = msg.body || "[Media]";

        // Persist the message
        const persistedMsg = messageToPersisted(msg);
        setPersistedChats(prev => {
          const updated = prev.map(chat => {
            const chatId = msg.from === chat.id || msg.to === chat.id;
            if (chatId && chat.messages) {
              const exists = chat.messages.some(
                m => m.id === msg.id._serialized,
              );
              if (!exists) {
                return {
                  ...chat,
                  messages: [...chat.messages, persistedMsg].slice(-50),
                };
              }
            }
            return chat;
          });
          // Debounce save in background
          setTimeout(() => saveChatHistory(updated).catch(() => {}), 5000);
          return updated;
        });

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

        // Notification sound for incoming messages
        if (!msg.id.fromMe && getConfig().soundEnabled) {
          const isActiveChat =
            currentActive && msg.from === currentActive.id._serialized;
          process.stdout.write(isActiveChat ? "\x07" : "\x07\x07");
        }
      });

      setErrorCallback((error: Error) => {
        logger.error("Client error", { error });
      });

      try {
        await initializeClient();
      } catch (error) {
        logger.error("Initialization error", { error });
        setConnectionStatus("disconnected");
      }
    };

    init();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (client && activeChat && isConnected) {
        setConnectionStatus("loading_history");
        setHistoryError(null);
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
          setConnectionStatus("ready");
        } catch (error) {
          logger.error("Failed to fetch history", { error });
          setHistoryError("Could not load messages from WhatsApp");
          setConnectionStatus("ready");

          // Fallback to persisted messages for this chat
          const persistedChat = persistedChats.find(
            c => c.id === activeChat.id._serialized,
          );
          if (persistedChat && persistedChat.messages.length > 0) {
            console.log("⚠ Using cached messages from previous session");
            setRecentMessages(
              persistedChat.messages.slice(-15).map(m => ({
                sender: m.sender,
                message: m.message,
                time: m.time,
                fromMe: m.fromMe,
              })),
            );
          }
        }
      }
    };

    fetchHistory();
  }, [client, activeChat, isConnected, config.messageLimit, persistedChats]);

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
            setHistoryError(null);
            try {
              const chat = await client.getChatById(activeChat.id._serialized);
              const messages = await chat.fetchMessages({
                limit: config.messageLimit || 15,
              });
              setRecentMessages(
                messages.map((msg: Message) => ({
                  sender:
                    msg.from?.split("@")[0] ||
                    (msg.id.fromMe ? "Me" : "Unknown"),
                  message: msg.body || "[Media/Sticker]",
                  time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
                  fromMe: msg.id.fromMe,
                })),
              );
            } catch (error) {
              logger.error("Failed to refresh history", { error });
              setHistoryError("Could not refresh messages");
              // Fallback to persisted
              const persistedChat = persistedChats.find(
                c => c.id === activeChat.id._serialized,
              );
              if (persistedChat && persistedChat.messages.length > 0) {
                setRecentMessages(
                  persistedChat.messages.slice(-15).map(m => ({
                    sender: m.sender,
                    message: m.message,
                    time: m.time,
                    fromMe: m.fromMe,
                  })),
                );
              }
            }
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
          try {
            await clearAuthSession();
          } catch {
            // browser already closed; auth files cleaned up as far as possible
          }
          process.exit(0);
          break;
      }
    },
    [client, activeChat, config.messageLimit, persistedChats],
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
      connectionStatus={connectionStatus}
      historyError={historyError}
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
