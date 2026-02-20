import React from "react";
import { Box, Text } from "ink";
import type { Chat } from "whatsapp-web.js";

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  isConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  isConnected,
}) => {
  return (
    <Box
      flexDirection="column"
      width={30}
      borderStyle="round"
      borderColor="cyan"
      paddingX={1}
    >
      <Text bold color="yellow">
        📱 WhatsApp CLI
      </Text>
      <Box marginBottom={1}>
        <Text color={isConnected ? "green" : "red"}>
          ● {isConnected ? "Connected" : "Disconnected"}
        </Text>
      </Box>

      <Text bold underline>
        Recent Chats
      </Text>
      {chats.slice(0, 15).map(chat => (
        <Box key={chat.id._serialized}>
          <Text
            color={chat.id._serialized === activeChatId ? "green" : "white"}
            wrap="truncate-end"
          >
            {chat.id._serialized === activeChatId ? "❯ " : "  "}
            {chat.name || chat.id.user}
            {chat.unreadCount > 0 ? ` (${chat.unreadCount})` : ""}
          </Text>
        </Box>
      ))}
      {chats.length > 15 && (
        <Box marginTop={1}>
          <Text dimColor>... and {chats.length - 15} more</Text>
        </Box>
      )}
    </Box>
  );
};
