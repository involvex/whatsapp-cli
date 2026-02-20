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
}) => {
  const { exit } = useApp();
  const [inputMode, setInputMode] = useState<"command" | "message" | "chat-select">("command");
  const [inputValue, setInputValue] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  useInput((input, key) => {
    if (inputMode === "command") {
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
            setStatusMessage("⚠️ Please select a chat first (option 2)");
          } else {
            setInputMode("message");
            setInputValue("");
            setStatusMessage(`Type message to ${activeChat.name || "selected chat"}`);
          }
        } else {
          onCommand(input);
        }
      }
    } else if (key.escape) {
      setInputMode("command");
      setInputValue("");
      setStatusMessage("");
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
    { num: "9", text: "Exit" },
  ];

  return (
    <Box flexDirection="column" width="100%" height="100%">
      <Box flexDirection="row" flexGrow={1}>
        <Sidebar
          chats={initialChats}
          activeChatId={activeChat?.id._serialized || null}
          isConnected={isConnected}
        />
        <MainContent
          activeChatName={activeChat ? (activeChat.name || activeChat.id.user) : null}
          messages={recentMessages}
          menuOptions={menuOptions}
          qrCode={qrCode}
          view={currentView}
        />
      </Box>
      {!qrCode && (
        <Box paddingX={1} borderStyle="single" borderColor="yellow">
          <Box marginRight={1}>
            <Text bold color="yellow">
              {inputMode === "command" ? "Command: " : `${inputMode.charAt(0).toUpperCase() + inputMode.slice(1)}: `}
            </Text>
          </Box>
          {inputMode === "command" ? (
            <Text dimColor>1-8 to act, 9/Q to exit</Text>
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
      />
    </Box>
  );
};
