import React from "react";
import { Box, Text } from "ink";
import type { Chat } from "whatsapp-web.js";

interface SidebarProps {
  chats: Chat[];
  activeChatId: string | null;
  isConnected: boolean;
  cursorIndex?: number;
}

const getInitials = (name: string | undefined, user: string): string => {
  if (!name) return user.slice(0, 2).toUpperCase();
  const parts = name.split(" ").filter(Boolean);
  if (parts.length > 1) {
    try {
      return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    } catch {
      return name.slice(0, 2).toUpperCase();
    }
  }
  return name.slice(0, 2).toUpperCase();
};

const ChatAvatar: React.FC<{ name: string | undefined; user: string }> = ({
  name,
  user,
}) => {
  const initials = getInitials(name, user);
  const bgColor = !name ? "red" : "green";
  return (
    <Box
      width={3}
      height={2}
      alignItems="center"
      justifyContent="center"
      borderStyle="round"
      borderColor={bgColor}
    >
      <Text bold color={bgColor}>
        {initials}
      </Text>
    </Box>
  );
};

const ChatListItem: React.FC<{
  chat: Chat;
  isActive: boolean;
  isCursor: boolean;
  _index: number;
}> = ({ chat, isActive, isCursor, _index }) => {
  const name = chat.name || chat.id.user;
  const isUnread = chat.unreadCount > 0;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap={1}
      paddingX={1}
      paddingY={0}
    >
      <ChatAvatar name={name} user={chat.id.user} />

      <Box flexDirection="column" flexGrow={1} minWidth={20}>
        <Box flexDirection="row" justifyContent="space-between">
          <Text
            bold={isCursor || isActive}
            color={isCursor ? "yellow" : isActive ? "green" : "white"}
            wrap="truncate-end"
          >
            {name}
          </Text>
        </Box>
        <Text dimColor wrap="truncate-end">
          {isUnread ? "📢 " : ""}
          {chat.isGroup ? "👥 " : "💬 "}
          {chat.lastMessage?.body || "No messages yet"}
        </Text>
      </Box>

      {isUnread && (
        <Box
          alignItems="center"
          justifyContent="center"
          width={3}
          borderStyle="round"
          borderColor="green"
        >
          <Text bold color="white">
            {chat.unreadCount > 99 ? "99+" : String(chat.unreadCount)}
          </Text>
        </Box>
      )}
    </Box>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  chats,
  activeChatId,
  isConnected,
  cursorIndex = -1,
}) => {
  const visibleChats = chats.slice(0, 12);
  const borderColor = !isConnected
    ? "red"
    : visibleChats.length > 0
      ? "green"
      : "cyan";

  return (
    <Box
      flexDirection="column"
      width={35}
      borderStyle="round"
      borderColor={borderColor}
    >
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingX={2}
        paddingY={1}
        borderStyle="single"
        borderColor="green"
      >
        <Text bold color="white">
          WhatsApp
        </Text>
        <Text bold color="white">
          ⋮
        </Text>
      </Box>

      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="space-between"
        paddingX={1}
        paddingY={1}
        borderStyle="single"
        borderColor="gray"
      >
        <Text color="white">🔍</Text>
        <Text color="white">⋮</Text>
      </Box>

      <Box paddingX={2} paddingY={1} borderStyle="single" borderColor="gray">
        <Text bold color="cyan" dimColor>
          {" CHATS"}
          {chats.length > 0 ? ` (${chats.length})` : ""}
        </Text>
      </Box>

      {visibleChats.length === 0 ? (
        <Box marginTop={2} marginLeft={1}>
          <Text dimColor italic>
            {isConnected ? "Loading..." : "Connect to load chats"}
          </Text>
        </Box>
      ) : (
        visibleChats.map((chat, i) => (
          <ChatListItem
            key={chat.id._serialized}
            chat={chat}
            isActive={chat.id._serialized === activeChatId}
            isCursor={i === cursorIndex}
            _index={i}
          />
        ))
      )}

      {chats.length > 12 && (
        <Box marginTop={1} marginLeft={1}>
          <Text dimColor> +{chats.length - 12} more</Text>
        </Box>
      )}

      {visibleChats.length > 0 && (
        <Box marginTop={1} marginLeft={1}>
          <Text dimColor>↑↓ move ↵ open ⇧↵ type</Text>
        </Box>
      )}
    </Box>
  );
};
