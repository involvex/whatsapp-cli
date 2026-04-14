import React from "react";
import { Box, Text } from "ink";

interface FooterProps {
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  lastMessage?: string;
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
  connectionStatus = "ready",
  historyError = null,
}) => {
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
    <Box flexDirection="row" alignItems="center" paddingX={1}>
      <Box flexGrow={1}>
        {lastMessage && (
          <Text color="cyan" bold>
            {lastMessage}
          </Text>
        )}
        {historyError && <Text color="red"> ⚠ {historyError}</Text>}
      </Box>
      <Text dimColor> │ </Text>
      <Text bold color={status.color}>
        {status.text}
      </Text>
      <Text dimColor> │ </Text>
      <Text bold color={aiEnabled ? "magenta" : "gray"}>
        {aiEnabled ? "🤖 ON" : "🤖 OFF"}
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
