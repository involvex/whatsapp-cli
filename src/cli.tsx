import React, { useState, useEffect, useCallback, useRef } from "react";
import { render } from "ink";
import { App } from "./components/App";
import type { ConnectionStatus } from "./components/Footer";
import qrcode from "qrcode-terminal";
import {
  initializeClient,
  clearAuthSession,
  destroyClient,
  reconnectClient,
  setQrCallback,
  setReadyCallback,
  setErrorCallback,
  setMessageCallback,
  setDisconnectedCallback,
  setReconnectingCallback,
  setAuthenticatedCallback,
  setLoadingScreenCallback,
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

const RECONNECT_MAX = 3;
const logger = createLogger({ console: false, file: false });

const WhatsAppCLI: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [persistedChats, setPersistedChats] = useState<PersistedChat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
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
  const initStartedRef = useRef(false);
  activeChatRef.current = activeChat;

  const config = getConfig();

  const loadChatsFromClient = useCallback(async (readyClient: Client) => {
    try {
      const loadedChats = await readyClient.getChats();
      const sortedChats = loadedChats.sort(
        (a: Chat, b: Chat) => (b.timestamp || 0) - (a.timestamp || 0),
      );
      setChats(sortedChats);

      const persisted: PersistedChat[] = sortedChats.map(chatToPersistedChat);
      setPersistedChats(persisted);
      await saveChatHistory(persisted);
    } catch (error) {
      logger.error("Failed to load chats", { error });
    }
  }, []);

  const setupClientCallbacks = useCallback(() => {
    setQrCallback((qr: string) => {
      setConnectionStatus("connecting");
      setConnectionError(null);
      setIsConnected(false);
      qrcode.generate(qr, { small: true }, code => {
        setQrCodeString(code);
      });
      logger.logClientEvent("qr", { qrLength: qr.length });
    });

    setAuthenticatedCallback(() => {
      setConnectionStatus("authenticating");
      setQrCodeString(null);
    });

    setLoadingScreenCallback(() => {
      setConnectionStatus("authenticating");
    });

    setReadyCallback(async (readyClient: Client) => {
      setClient(readyClient);
      setIsConnected(true);
      setConnectionStatus("ready");
      setQrCodeString(null);
      setConnectionError(null);
      setReconnectAttempt(0);
      await loadChatsFromClient(readyClient);
    });

    setDisconnectedCallback(() => {
      setIsConnected(false);
      setClient(null);
      const autoReconnect = getConfig().autoReconnect;
      if (autoReconnect) {
        setConnectionStatus("reconnecting");
      } else {
        setConnectionStatus("disconnected");
      }
    });

    setReconnectingCallback((attempt, maxAttempts) => {
      setConnectionStatus("reconnecting");
      setReconnectAttempt(attempt);
      setConnectionError(null);
      setIsConnected(false);
      setClient(null);
      void maxAttempts;
    });

    setErrorCallback((error: Error) => {
      logger.error("Client error", { error });
      setConnectionError(error.message);
      setConnectionStatus("disconnected");
      setIsConnected(false);
      setClient(null);
    });

    setMessageCallback((msg: Message) => {
      const sender = msg.from?.split("@")[0] || "Unknown";
      const time = new Date(msg.timestamp * 1000).toLocaleTimeString();
      const messageText = msg.body || "[Media]";

      const persistedMsg = messageToPersisted(msg);
      setPersistedChats(prev => {
        const updated = prev.map(chat => {
          const chatId = msg.from === chat.id || msg.to === chat.id;
          if (chatId && chat.messages) {
            const exists = chat.messages.some(m => m.id === msg.id._serialized);
            if (!exists) {
              return {
                ...chat,
                messages: [...chat.messages, persistedMsg].slice(-50),
              };
            }
          }
          return chat;
        });
        setTimeout(() => saveChatHistory(updated).catch(() => {}), 5000);
        return updated;
      });

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

      if (!msg.id.fromMe && getConfig().soundEnabled) {
        const isActiveChat =
          currentActive && msg.from === currentActive.id._serialized;
        process.stdout.write(isActiveChat ? "\x07" : "\x07\x07");
      }
    });
  }, [loadChatsFromClient]);

  const startClient = useCallback(async () => {
    setConnectionStatus("connecting");
    setConnectionError(null);
    try {
      await initializeClient();
    } catch (error) {
      logger.error("Initialization error", { error });
      setConnectionStatus("disconnected");
      setConnectionError(
        error instanceof Error ? error.message : "Initialization failed",
      );
    }
  }, []);

  useEffect(() => {
    const loadPersisted = async () => {
      const loaded = await loadChatHistory();
      if (loaded.length > 0) {
        setPersistedChats(loaded);
      }
    };
    void loadPersisted();
  }, []);

  useEffect(() => {
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    setupClientCallbacks();
    void startClient();
  }, [setupClientCallbacks, startClient]);

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
          setHistoryError("Could not load messages");
          setConnectionStatus("ready");

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
    };

    void fetchHistory();
  }, [client, activeChat, isConnected, config.messageLimit, persistedChats]);

  const handleLogout = useCallback(async () => {
    setConnectionStatus("connecting");
    setConnectionError(null);
    setChats([]);
    setActiveChat(null);
    setRecentMessages([]);
    setQrCodeString(null);
    setIsConnected(false);
    setClient(null);
    setCurrentView("chat");

    try {
      await clearAuthSession();
    } catch {
      await destroyClient();
    }

    await startClient();
  }, [startClient]);

  const handleCommand = useCallback(
    async (cmd: string) => {
      setCurrentView("chat");
      switch (cmd) {
        case "1":
          if (!isConnected || !client) {
            setConnectionError(null);
            setConnectionStatus("connecting");
            try {
              const reconnected = await reconnectClient();
              setClient(reconnected);
              setIsConnected(true);
              setConnectionStatus("ready");
              await loadChatsFromClient(reconnected);
            } catch (error) {
              logger.error("Reconnect failed", { error });
              setConnectionStatus("disconnected");
              setConnectionError(
                error instanceof Error ? error.message : "Reconnect failed",
              );
            }
          } else {
            await loadChatsFromClient(client);
          }
          break;
        case "4":
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
        case "5":
          setAiEnabled(prev => !prev);
          break;
        case "6":
          setCurrentView("settings");
          break;
        case "7":
          setCurrentView("about");
          break;
        case "8":
          await handleLogout();
          break;
      }
    },
    [
      client,
      activeChat,
      config.messageLimit,
      persistedChats,
      isConnected,
      loadChatsFromClient,
      handleLogout,
    ],
  );

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (client && activeChat && message.trim()) {
        try {
          await client.sendMessage(activeChat.id._serialized, message);
        } catch (error) {
          logger.error("Send message error", { error });
          setConnectionError(
            error instanceof Error ? error.message : "Send failed",
          );
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
      connectionError={connectionError}
      reconnectAttempt={reconnectAttempt}
      reconnectMax={RECONNECT_MAX}
    />
  );
};

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

  const config = await loadConfig();
  logger.updateConfig(config.logging);

  render(<WhatsAppCLI />);
}

cliEntry().catch(error => {
  console.error(`Fatal error: ${error}`);
  process.exit(1);
});
