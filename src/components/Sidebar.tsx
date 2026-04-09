import React from "react";
import { Box, Text } from "ink";
import type { Chat } from "whatsapp-web.js";

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  isConnected: boolean;
  cursorIndex?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  isConnected,
  cursorIndex = -1,
}) => {
  const visibleChats = chats.slice(0, 15);
  const borderColor = !isConnected
    ? "red"
    : visibleChats.length > 0
      ? "yellow"
      : "cyan";

  return (
    <Box
      flexDirection="column"
      width={30}
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      {/* Header */}
      <Box flexDirection="row" justifyContent="space-between" marginBottom={0}>
        <Text bold color="green">
          📱 WhatsApp CLI
        </Text>
        <Text bold color={isConnected ? "green" : "red"}>
          {isConnected ? "●" : "○"}
        </Text>
      </Box>
      <Box marginBottom={1}>
        <Text color={isConnected ? "green" : "red"} dimColor>
          {isConnected ? " Connected" : " Disconnected"}
        </Text>
      </Box>

      {/* Section label */}
      <Text bold color="cyan" dimColor>
        {" CHATS"}
        {chats.length > 0 ? ` (${chats.length})` : ""}
      </Text>

      {/* Chat list */}
      {visibleChats.length === 0 ? (
        <Box marginTop={1}>
          <Text dimColor italic>
            {isConnected ? "Loading..." : "Connect to load"}
          </Text>
        </Box>
      ) : (
        visibleChats.map((chat, i) => {
          const isActive = chat.id._serialized === activeChatId;
          const isCursor = i === cursorIndex;
          const num = i + 1;
          const numStr = num < 10 ? ` ${num}` : `${num}`;

          return (
            <Box key={chat.id._serialized} flexDirection="row">
              <Text color={isCursor ? "yellow" : isActive ? "green" : "gray"}>
                {numStr}.
              </Text>
              <Text
                bold={isCursor || isActive}
                color={isCursor ? "yellow" : isActive ? "green" : "white"}
              >
                {isCursor ? "›" : isActive ? "✓" : " "}
              </Text>
              <Box flexGrow={1}>
                <Text
                  bold={isCursor || isActive}
                  color={isCursor ? "yellow" : isActive ? "green" : "white"}
                  wrap="truncate-end"
                >
                  {chat.name || chat.id.user}
                </Text>
              </Box>
              {chat.unreadCount > 0 && (
                <Text color="red" bold>
                  {chat.unreadCount > 99 ? "99+" : String(chat.unreadCount)}
                </Text>
              )}
            </Box>
          );
        })
      )}

      {chats.length > 15 && (
        <Box marginTop={1}>
          <Text dimColor> +{chats.length - 15} more</Text>
        </Box>
      )}

      {/* Navigation hint */}
      {visibleChats.length > 0 && (
        <Box marginTop={1}>
          <Text dimColor>↑↓ move ↵ open ⇧↵ type</Text>
        </Box>
      )}
    </Box>
  );
};
