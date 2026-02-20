import React from "react";
import { Box, Text } from "ink";

interface FooterProps {
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  lastMessage?: string;
}

export const Footer: React.FC<FooterProps> = ({
  aiEnabled,
  aiProvider,
  aiModel,
  lastMessage,
}) => {
  return (
    <Box borderStyle="single" borderColor="dim" paddingX={1} width="100%">
      <Box flexGrow={1}>
        <Text dimColor>
          {lastMessage || "Use numbers 1-9 to navigate | Press Q to exit"}
        </Text>
      </Box>
      <Box>
        <Text>AI: </Text>
        <Text color={aiEnabled ? "magenta" : "gray"}>
          {aiEnabled ? `ON (${aiProvider}/${aiModel})` : "OFF"}
        </Text>
      </Box>
    </Box>
  );
};
