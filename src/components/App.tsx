import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { Footer } from "./Footer";
import type { Chat } from "whatsapp-web.js";
import TextInput from "ink-text-input";

interface AppProps {
  initialChats: Chat[];
  isConnected: boolean;
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  recentMessages: Array<{
    sender: string;
    message: string;
    time: string;
    fromMe: boolean;
  }>;
  onCommand: (command: string) => void;
  onSendMessage: (message: string) => void;
  onSelectChat: (index: number) => void;
  activeChat: Chat | null;
  qrCode?: string | null;
  currentView?: "chat" | "about" | "settings";
  connectionStatus?:
    | "disconnected"
    | "connecting"
    | "ready"
    | "loading_history";
  historyError?: string | null;
}

export const App: React.FC<AppProps> = ({
  initialChats,
  isConnected,
  aiEnabled,
  aiProvider,
  aiModel,
  recentMessages,
  onCommand,
  onSendMessage,
  onSelectChat,
  activeChat,
  qrCode,
  currentView = "chat",
  connectionStatus = "ready",
  historyError = null,
}) => {
  const { exit } = useApp();
  const [inputMode, setInputMode] = useState<
    "command" | "message" | "chat-select"
  >("command");
  const [inputValue, setInputValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [sidebarCursor, setSidebarCursor] = useState(0);

  useInput((input, key) => {
    if (inputMode === "command") {
      // ── Arrow-key sidebar navigation ────────────────────────────────────
      if (key.upArrow) {
        const max = Math.min(initialChats.length - 1, 14);
        if (max >= 0) {
          setStatusMessage("");
          setSidebarCursor(prev => (prev <= 0 ? max : prev - 1));
        }
        return;
      }
      if (key.downArrow) {
        const max = Math.min(initialChats.length - 1, 14);
        if (max >= 0) {
          setStatusMessage("");
          setSidebarCursor(prev => (prev >= max ? 0 : prev + 1));
        }
        return;
      }
      // Shift+Enter → jump into message input for the active chat
      if (key.shift && key.return) {
        if (!activeChat) {
          setStatusMessage("⚠  Open a chat first — press ↵");
        } else {
          setInputMode("message");
          setInputValue("");
          setStatusMessage(`Sending to: ${activeChat.name || "selected chat"}`);
        }
        return;
      }
      // Enter confirms cursor selection
      if (key.return && initialChats.length > 0) {
        onSelectChat(sidebarCursor + 1);
        setStatusMessage("");
        return;
      }

      // ── Number / letter commands ─────────────────────────────────────────
      if (input === "q" || input === "9") {
        exit();
        process.exit(0);
      }
      if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(input)) {
        if (input === "2") {
          setInputMode("chat-select");
          setInputValue("");
          setStatusMessage("Enter chat number to select");
        } else if (input === "3") {
          if (!activeChat) {
            setStatusMessage("⚠  Open a chat first — press ↵");
          } else {
            setInputMode("message");
            setInputValue("");
            setStatusMessage(
              `Sending to: ${activeChat.name || "selected chat"}`,
            );
          }
        } else {
          onCommand(input);
        }
      }
    } else if (key.escape) {
      setInputMode("command");
      setInputValue("");
      setStatusMessage("");
      // Restore cursor to active chat position if possible
      if (activeChat) {
        const idx = initialChats.findIndex(
          c => c.id._serialized === activeChat.id._serialized,
        );
        if (idx >= 0) setSidebarCursor(idx);
      }
    }
  });

  const handleInputSubmit = (value: string) => {
    if (inputMode === "chat-select") {
      const num = parseInt(value, 10);
      if (!isNaN(num)) {
        onSelectChat(num);
      }
      setInputMode("command");
      setInputValue("");
    } else if (inputMode === "message") {
      if (value.trim()) {
        onSendMessage(value);
      }
      setInputMode("command");
      setInputValue("");
    }
  };

  const menuOptions = [
    { num: "1", text: "Refresh" },
    { num: "2", text: "Select" },
    { num: "3", text: "Send" },
    { num: "4", text: "History" },
    { num: "5", text: "AI Toggle" },
    { num: "6", text: "Settings" },
    { num: "7", text: "About" },
    { num: "8", text: "Logout" },
    { num: "Q", text: "Exit" },
  ];

  // Resolve input bar border color based on mode
  const inputBorderColor =
    inputMode === "message"
      ? "cyan"
      : inputMode === "chat-select"
        ? "green"
        : initialChats.length > 0
          ? "yellow"
          : "gray";

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box flexDirection="row" flexGrow={1}>
        <Sidebar
          chats={initialChats}
          activeChatId={activeChat?.id._serialized || null}
          isConnected={isConnected}
          cursorIndex={sidebarCursor}
        />
        <MainContent
          activeChatName={
            activeChat ? activeChat.name || activeChat.id.user : null
          }
          messages={recentMessages}
          menuOptions={menuOptions}
          qrCode={qrCode}
          view={currentView}
        />
      </Box>
      {!qrCode && (
        <Box paddingX={1} borderStyle="single" borderColor={inputBorderColor}>
          <Box marginRight={1}>
            <Text
              bold
              color={inputBorderColor === "gray" ? "yellow" : inputBorderColor}
            >
              {inputMode === "command"
                ? "NAV "
                : inputMode === "message"
                  ? "MSG "
                  : "SEL "}
            </Text>
          </Box>
          {inputMode === "command" ? (
            <Text dimColor>
              {initialChats.length > 0
                ? `Chat ${sidebarCursor + 1} — ↑↓ nav  ↵ open  ⇧↵ type  [1-8] act  Q exit`
                : "[1-8] act  Q exit"}
            </Text>
          ) : (
            <TextInput
              value={inputValue}
              onChange={setInputValue}
              onSubmit={handleInputSubmit}
            />
          )}
        </Box>
      )}
      <Footer
        aiEnabled={aiEnabled}
        aiProvider={aiProvider}
        aiModel={aiModel}
        lastMessage={statusMessage}
        inputMode={inputMode}
        sidebarCursor={sidebarCursor}
        connectionStatus={connectionStatus}
        historyError={historyError}
      />
    </Box>
  );
};
