import React from "react";
import { Box, Text } from "ink";

interface FooterProps {
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  lastMessage?: string;
  inputMode?: "command" | "message" | "chat-select";
  sidebarCursor?: number;
  connectionStatus?:
    | "disconnected"
    | "connecting"
    | "ready"
    | "loading_history";
  historyError?: string | null;
}

export const Footer: React.FC<FooterProps> = ({
  aiEnabled,
  aiProvider,
  aiModel,
  lastMessage,
  inputMode = "command",
  sidebarCursor = -1,
  connectionStatus = "ready",
  historyError = null,
}) => {
  const getHelpText = (): string => {
    if (lastMessage) return lastMessage;
    if (inputMode === "message") return "Type message  ↵ send  Esc cancel";
    if (inputMode === "chat-select")
      return "Type number  ↵ confirm  Esc cancel";
    if (sidebarCursor >= 0) return "↑↓ navigate  ↵ open chat  Esc cancel";
    return "[1-8] commands  [↑↓] navigate chats  [Q] quit";
  };

  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case "connecting":
        return { color: "yellow", text: "⟳ Connecting..." };
      case "loading_history":
        return { color: "cyan", text: "⟳ Loading messages..." };
      case "ready":
        return { color: "green", text: "● Connected" };
      case "disconnected":
      default:
        return { color: "red", text: "○ Disconnected" };
    }
  };

  const status = getStatusIndicator();

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} width="100%">
      <Box flexGrow={1}>
        <Text dimColor>{getHelpText()}</Text>
        {historyError && <Text color="red"> ⚠ {historyError}</Text>}
      </Box>
      <Text dimColor> │ </Text>
      <Text bold color={status.color}>
        {status.text}
      </Text>
      <Text dimColor> │ </Text>
      <Text bold color={aiEnabled ? "magenta" : "gray"}>
        AI {aiEnabled ? "●" : "○"}
      </Text>
      {aiEnabled && (
        <Text dimColor>
          {" "}
          {aiProvider}/{aiModel}
        </Text>
      )}
    </Box>
  );
};
