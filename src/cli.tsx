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
import { MessageMedia } from "whatsapp-web.js";
import type { Chat, Message, Client } from "whatsapp-web.js";
import { promises as fs } from "fs";
import path from "path";
import { PATHS } from "./config";

const RECONNECT_MAX = 3;
const MAX_MEDIA_SIZE = 50 * 1024 * 1024;
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
      id: string;
      sender: string;
      message: string;
      time: string;
      fromMe: boolean;
      mediaType?: string;
      hasMedia?: boolean;
    }>
  >([]);
  const [client, setClient] = useState<Client | null>(null);
  const [qrCodeString, setQrCodeString] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<"chat" | "about" | "settings">(
    "chat",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [searchMatchCount, setSearchMatchCount] = useState(0);
  const [searchMatchIds, setSearchMatchIds] = useState<Set<string>>(new Set());

  void searchQuery;
  void setSearchQuery;
  void searchMatchIds;
  void setSearchMatchIds;

  const activeChatRef = useRef<Chat | null>(null);
  const initStartedRef = useRef(false);
  activeChatRef.current = activeChat;

  const config = getConfig();

  const computeSearchMatches = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchMatchIds(new Set());
        setSearchMatchCount(0);
        setSearchMatchIndex(0);
        return;
      }
      const q = query.toLowerCase();
      const matchIds = new Set<string>();
      persistedChats.forEach(chat => {
        chat.messages.forEach(msg => {
          if (
            msg.sender.toLowerCase().includes(q) ||
            msg.message.toLowerCase().includes(q)
          ) {
            matchIds.add(msg.id);
          }
        });
      });
      setSearchMatchIds(matchIds);
      const count = matchIds.size;
      setSearchMatchCount(count);
      if (count > 0) {
        setSearchMatchIndex(prev => Math.min(prev, count - 1));
      } else {
        setSearchMatchIndex(0);
      }
    },
    [persistedChats],
  );

  const handleSearchNext = useCallback(() => {
    if (searchMatchCount === 0) return;
    setSearchMatchIndex(prev => (prev + 1) % searchMatchCount);
  }, [searchMatchCount]);

  const handleSearchPrev = useCallback(() => {
    if (searchMatchCount === 0) return;
    setSearchMatchIndex(
      prev => (prev - 1 + searchMatchCount) % searchMatchCount,
    );
  }, [searchMatchCount]);

  const toRecentMessage = useCallback(
    (msg: Message) => ({
      id: msg.id._serialized,
      sender: msg.from?.split("@")[0] || (msg.id.fromMe ? "Me" : "Unknown"),
      message: msg.body || "[Media/Sticker]",
      time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
      fromMe: msg.id.fromMe,
    }),
    [],
  );

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
      const isForActiveChat =
        currentActive &&
        (msg.from === currentActive.id._serialized ||
          (msg.id.fromMe && msg.to === currentActive.id._serialized));

      if (isForActiveChat) {
        setRecentMessages(prev => {
          const newMessages = [
            ...prev,
            {
              id: msg.id._serialized,
              sender,
              message: messageText,
              time,
              fromMe: msg.id.fromMe,
              mediaType: msg.hasMedia ? msg.type : undefined,
              hasMedia: msg.hasMedia,
            },
          ];
          return newMessages.slice(-20);
        });
      }

      if (!msg.id.fromMe && getConfig().soundEnabled) {
        const isActiveChat =
          currentActive && msg.from === currentActive.id._serialized;
        process.stdout.write(isActiveChat ? "\x07" : "\x07\x07");
      }

      if (msg.hasMedia && getConfig().autoDownloadMedia && !msg.id.fromMe) {
        const fileSize = (msg as Message & { media?: { filesize?: number } })
          .media?.filesize;
        if (fileSize && fileSize > MAX_MEDIA_SIZE) {
          logger.warn("Media download skipped: too large", {
            size: fileSize,
            max: MAX_MEDIA_SIZE,
            type: msg.type,
          });
          return;
        }
        const fileName = `${Date.now()}_${msg.id._serialized}`;
        const ext =
          msg.type === "image"
            ? ".jpg"
            : msg.type === "video"
              ? ".mp4"
              : msg.type === "audio"
                ? ".ogg"
                : ".bin";
        const savePath = path.join(PATHS.downloads, fileName + ext);
        fs.mkdir(PATHS.downloads, { recursive: true }).catch(err => {
          logger.error("Failed to create downloads dir", { error: err });
        });
        msg
          .downloadMedia()
          .then(media => {
            return fs.writeFile(savePath, Buffer.from(media.data, "base64"));
          })
          .then(() => {
            logger.info("Media downloaded", { savePath, type: msg.type });
          })
          .catch(err => {
            logger.error("Media download failed", { error: err });
            setConnectionError("Media download failed");
          });
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

          setRecentMessages(messages.map(toRecentMessage));
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
              persistedChat.messages
                .slice(-(config.messageLimit || 15))
                .map(m => ({
                  id: m.id,
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
  }, [
    client,
    activeChat,
    isConnected,
    config.messageLimit,
    persistedChats,
    toRecentMessage,
  ]);

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

  const handleSendMedia = useCallback(
    async (filePath: string) => {
      if (!client || !activeChat || !filePath.trim()) return;
      const trimmed = filePath.trim();
      try {
        const stat = await fs.stat(trimmed);
        if (!stat.isFile()) {
          setConnectionError("Path is not a file");
          return;
        }
      } catch {
        setConnectionError("File not found");
        return;
      }
      try {
        const media = await MessageMedia.fromFilePath(trimmed);
        await client.sendMessage(activeChat.id._serialized, media);
      } catch (error) {
        logger.error("Send media error", { error });
        setConnectionError(
          error instanceof Error ? error.message : "Send media failed",
        );
      }
    },
    [client, activeChat],
  );

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
              setRecentMessages(messages.map(toRecentMessage));
            } catch (error) {
              logger.error("Failed to refresh history", { error });
              setHistoryError("Could not refresh messages");
              const persistedChat = persistedChats.find(
                c => c.id === activeChat.id._serialized,
              );
              if (persistedChat && persistedChat.messages.length > 0) {
                setRecentMessages(
                  persistedChat.messages
                    .slice(-(config.messageLimit || 15))
                    .map(m => ({
                      id: m.id,
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
      toRecentMessage,
    ],
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
      onSendMedia={handleSendMedia}
      onSelectChat={handleSelectChat}
      onSearch={computeSearchMatches}
      onSearchNext={handleSearchNext}
      onSearchPrev={handleSearchPrev}
      activeChat={activeChat}
      qrCode={qrCodeString}
      currentView={currentView}
      connectionStatus={connectionStatus}
      historyError={historyError}
      connectionError={connectionError}
      reconnectAttempt={reconnectAttempt}
      reconnectMax={RECONNECT_MAX}
      searchQuery={searchQuery}
      searchMatchIndex={searchMatchIndex}
      searchMatchCount={searchMatchCount}
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

  // Render inside the terminal's alternate screen buffer so oversized transient
  // frames (like the QR screen) never scroll the main buffer and leave artifacts.
  const ENTER_ALT_SCREEN = "\x1b[?1049h\x1b[2J\x1b[H";
  const LEAVE_ALT_SCREEN = "\x1b[?1049l";
  let screenRestored = false;
  const restoreScreen = () => {
    if (screenRestored) return;
    screenRestored = true;
    process.stdout.write(LEAVE_ALT_SCREEN);
  };

  process.stdout.write(ENTER_ALT_SCREEN);
  process.on("exit", restoreScreen);
  process.on("SIGINT", () => {
    restoreScreen();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    restoreScreen();
    process.exit(0);
  });

  const { waitUntilExit } = render(<WhatsAppCLI />);

  try {
    await waitUntilExit();
  } finally {
    restoreScreen();
  }
}

cliEntry().catch(error => {
  process.stdout.write("\x1b[?1049l");
  console.error(`Fatal error: ${error}`);
  process.exit(1);
});
