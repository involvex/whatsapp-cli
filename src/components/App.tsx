import React, { useState } from "react";
import { Box, Text, useInput, useApp } from "ink";
import { Sidebar } from "./Sidebar";
import { MainContent } from "./MainContent";
import { Footer, type ConnectionStatus } from "./Footer";
import type { Chat } from "whatsapp-web.js";
import TextInput from "ink-text-input";
import { useTheme } from "../theme";
import { useTerminalSize } from "../hooks/useTerminalSize";

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
  connectionStatus?: ConnectionStatus;
  historyError?: string | null;
  connectionError?: string | null;
  reconnectAttempt?: number;
  reconnectMax?: number;
}

const INPUT_BAR_HEIGHT = 3;
const FOOTER_HEIGHT = 2;

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
  connectionError = null,
  reconnectAttempt = 0,
  reconnectMax = 3,
}) => {
  const theme = useTheme();
  const { exit } = useApp();
  const { rows, columns } = useTerminalSize();
  const [inputMode, setInputMode] = useState<
    "command" | "message" | "chat-select"
  >("command");
  const [inputValue, setInputValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [sidebarCursor, setSidebarCursor] = useState(0);

  const showInputBar = !qrCode;
  const chromeHeight = FOOTER_HEIGHT + (showInputBar ? INPUT_BAR_HEIGHT : 0);
  const mainHeight = Math.max(8, rows - chromeHeight);

  useInput((input, key) => {
    if (inputMode === "command") {
      if (key.upArrow) {
        const max = initialChats.length - 1;
        if (max >= 0) {
          setStatusMessage("");
          setSidebarCursor(prev => (prev <= 0 ? max : prev - 1));
        }
        return;
      }
      if (key.downArrow) {
        const max = initialChats.length - 1;
        if (max >= 0) {
          setStatusMessage("");
          setSidebarCursor(prev => (prev >= max ? 0 : prev + 1));
        }
        return;
      }
      if (key.shift && key.return) {
        if (!activeChat) {
          setStatusMessage("Open a chat first");
        } else {
          setInputMode("message");
          setInputValue("");
          setStatusMessage(`Send to: ${activeChat.name || "chat"}`);
        }
        return;
      }
      if (key.return && initialChats.length > 0) {
        onSelectChat(sidebarCursor + 1);
        setStatusMessage("");
        return;
      }

      if (input === "q" || input === "9") {
        exit();
        process.exit(0);
      }
      if (["1", "2", "3", "4", "5", "6", "7", "8"].includes(input)) {
        if (input === "2") {
          setInputMode("chat-select");
          setInputValue("");
          setStatusMessage("Enter chat number");
        } else if (input === "3") {
          if (!activeChat) {
            setStatusMessage("Open a chat first");
          } else {
            setInputMode("message");
            setInputValue("");
            setStatusMessage(`Send to: ${activeChat.name || "chat"}`);
          }
        } else {
          onCommand(input);
        }
      }
    } else if (key.escape) {
      setInputMode("command");
      setInputValue("");
      setStatusMessage("");
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
      setStatusMessage("");
    }
  };

  const menuOptions = [
    { num: "1", text: "Refresh" },
    { num: "2", text: "Select" },
    { num: "3", text: "Send" },
    { num: "4", text: "History" },
    { num: "5", text: "AI" },
    { num: "6", text: "Settings" },
    { num: "7", text: "About" },
    { num: "8", text: "Logout" },
    { num: "Q", text: "Exit" },
  ];

  const inputBorderColor =
    inputMode === "message"
      ? theme.header
      : inputMode === "chat-select"
        ? theme.primary
        : theme.accent;

  return (
    <Box
      flexDirection="column"
      width={columns}
      height={rows}
      backgroundColor={theme.bg}
    >
      <Box flexDirection="row" height={mainHeight} flexShrink={0}>
        <Sidebar
          chats={initialChats}
          activeChatId={activeChat?.id._serialized || null}
          isConnected={isConnected}
          cursorIndex={sidebarCursor}
          listHeight={mainHeight}
        />
        <MainContent
          activeChatName={
            activeChat ? activeChat.name || activeChat.id.user : null
          }
          messages={recentMessages}
          menuOptions={menuOptions}
          qrCode={qrCode}
          view={currentView}
          contentHeight={mainHeight}
        />
      </Box>
      {showInputBar && (
        <Box
          paddingX={1}
          height={INPUT_BAR_HEIGHT}
          borderStyle="single"
          borderColor={inputBorderColor}
          flexShrink={0}
        >
          <Box marginRight={1}>
            <Text bold color={inputBorderColor}>
              {inputMode === "command"
                ? "NAV"
                : inputMode === "message"
                  ? "MSG"
                  : "SEL"}
            </Text>
          </Box>
          {inputMode === "command" ? (
            <Text color={theme.muted}>
              {initialChats.length > 0
                ? `Chat ${sidebarCursor + 1}/${initialChats.length} · ↑↓ nav · ↵ open`
                : "Waiting for chats..."}
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
        connectionStatus={connectionStatus}
        historyError={historyError}
        connectionError={connectionError}
        reconnectAttempt={reconnectAttempt}
        reconnectMax={reconnectMax}
      />
    </Box>
  );
};
