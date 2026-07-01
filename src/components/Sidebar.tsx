import React from "react";
import { Box, Text } from "ink";
import type { Chat } from "whatsapp-web.js";
import { useTheme } from "../theme";
import { useScrollViewport } from "../hooks/useScrollViewport";

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  isConnected: boolean;
  cursorIndex?: number;
  listHeight: number;
}

const ChatListItem: React.FC<{
  chat: Chat;
  isActive: boolean;
  isCursor: boolean;
  index: number;
}> = ({ chat, isActive, isCursor, index }) => {
  const theme = useTheme();
  const name = chat.name || chat.id.user;
  const preview = chat.lastMessage?.body || "No messages";
  const unread = chat.unreadCount > 0 ? ` (${chat.unreadCount})` : "";
  const prefix = chat.isGroup ? "G" : "D";

  return (
    <Box paddingX={1}>
      <Text
        bold={isCursor || isActive}
        color={
          isCursor ? theme.accent : isActive ? theme.primary : theme.primary
        }
        wrap="truncate-end"
      >
        {isCursor ? ">" : " "}
        {String(index + 1).padStart(2, " ")} [{prefix}] {name}
        {unread}
        <Text color={theme.muted}> · {preview}</Text>
      </Text>
    </Box>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  isConnected,
  cursorIndex = 0,
  listHeight,
}) => {
  const theme = useTheme();
  const visibleCount = Math.max(1, listHeight - 3);
  const { visibleItems, scrollOffset } = useScrollViewport(
    chats,
    visibleCount,
    cursorIndex,
  );

  const borderColor = !isConnected
    ? theme.error
    : chats.length > 0
      ? theme.borderActive
      : theme.border;

  return (
    <Box
      flexDirection="column"
      width={38}
      height={listHeight}
      flexShrink={0}
      borderStyle="single"
      borderColor={borderColor}
    >
      <Box paddingX={1}>
        <Text bold color={theme.header}>
          CHATS{chats.length > 0 ? ` (${chats.length})` : ""}
        </Text>
      </Box>

      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {visibleItems.length === 0 ? (
          <Box paddingX={1}>
            <Text color={theme.muted}>
              {isConnected ? "Loading..." : "Connect to load"}
            </Text>
          </Box>
        ) : (
          visibleItems.map((chat, i) => {
            const absoluteIndex = scrollOffset + i;
            return (
              <ChatListItem
                key={chat.id._serialized}
                chat={chat}
                isActive={chat.id._serialized === activeChatId}
                isCursor={absoluteIndex === cursorIndex}
                index={absoluteIndex}
              />
            );
          })
        )}
      </Box>

      {chats.length > visibleCount && (
        <Box paddingX={1}>
          <Text color={theme.muted}>
            {scrollOffset + 1}-
            {Math.min(scrollOffset + visibleCount, chats.length)} of{" "}
            {chats.length}
          </Text>
        </Box>
      )}
    </Box>
  );
};
