import React from "react";
import { Box, Text } from "ink";

interface FooterProps {
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  lastMessage?: string;
  inputMode?: "command" | "message" | "chat-select";
  sidebarCursor?: number;
}

export const Footer: React.FC<FooterProps> = ({
  aiEnabled,
  aiProvider,
  aiModel,
  lastMessage,
  inputMode = "command",
  sidebarCursor = -1,
}) => {
  const getHelpText = (): string => {
    if (lastMessage) return lastMessage;
    if (inputMode === "message") return "Type message  ↵ send  Esc cancel";
    if (inputMode === "chat-select")
      return "Type number  ↵ confirm  Esc cancel";
    if (sidebarCursor >= 0) return "↑↓ navigate  ↵ open chat  Esc cancel";
    return "[1-8] commands  [↑↓] navigate chats  [Q] quit";
  };

  return (
    <Box borderStyle="single" borderColor="gray" paddingX={1} width="100%">
      <Box flexGrow={1}>
        <Text dimColor>{getHelpText()}</Text>
      </Box>
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
