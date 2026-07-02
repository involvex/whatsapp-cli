import React, { useMemo } from "react";
import { Box, Text } from "ink";
import { getConfig } from "../config";
import { useTheme } from "../theme";
import { useScrollViewport } from "../hooks/useScrollViewport";

interface Message {
  sender: string;
  message: string;
  time: string;
  fromMe: boolean;
}

interface MainContentProps {
  activeChatName: string | null;
  messages: Message[];
  menuOptions: Array<{ num: string; text: string }>;
  qrCode?: string | null;
  view?: "chat" | "about" | "settings";
  contentHeight: number;
}

const SettingRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
}> = ({ label, value, valueColor }) => {
  const theme = useTheme();
  return (
    <Box flexDirection="row" gap={1}>
      <Text color={theme.muted}>{label}:</Text>
      <Text bold color={(valueColor as typeof theme.primary) || theme.primary}>
        {value}
      </Text>
    </Box>
  );
};

const ChatBubble: React.FC<{
  message: Message;
  showSender: boolean;
}> = ({ message, showSender }) => {
  const theme = useTheme();

  return (
    <Box
      flexDirection="column"
      alignItems={message.fromMe ? "flex-end" : "flex-start"}
      marginBottom={0}
    >
      {!message.fromMe && showSender && (
        <Text bold color={theme.header}>
          {message.sender}
        </Text>
      )}
      <Box
        paddingX={1}
        borderStyle="single"
        borderColor={message.fromMe ? theme.outgoing : theme.incoming}
        flexDirection="column"
        maxWidth={50}
      >
        <Text color={theme.primary} wrap="wrap">
          {message.message}
        </Text>
        <Text color={theme.muted}>
          {message.time}
          {message.fromMe ? " ✓" : ""}
        </Text>
      </Box>
    </Box>
  );
};

export const MainContent: React.FC<MainContentProps> = ({
  activeChatName,
  messages,
  menuOptions,
  qrCode,
  view = "chat",
  contentHeight,
}) => {
  const theme = useTheme();
  const config = getConfig();
  const messageVisibleCount = Math.max(1, contentHeight - 4);
  const messageCursor = Math.max(0, messages.length - 1);
  const { visibleItems: visibleMessages } = useScrollViewport(
    messages,
    messageVisibleCount,
    messageCursor,
  );

  const displayMessages = useMemo(() => {
    if (messages.length <= messageVisibleCount) return messages;
    return visibleMessages;
  }, [messages, messageVisibleCount, visibleMessages]);

  if (qrCode) {
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        height={contentHeight}
        flexShrink={0}
        paddingX={1}
        borderStyle="single"
        borderColor={theme.border}
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        <Text bold color={theme.header}>
          AUTH
        </Text>
        <Text color={theme.muted}>Scan QR with WhatsApp on your phone</Text>
        <Box marginTop={1}>
          <Text color={theme.primary}>{qrCode}</Text>
        </Box>
        <Text color={theme.accent}>Waiting for scan...</Text>
      </Box>
    );
  }

  if (view === "about") {
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        height={contentHeight}
        paddingX={1}
        borderStyle="single"
        borderColor={theme.border}
        overflow="hidden"
      >
        <Text bold color={theme.header}>
          ABOUT
        </Text>
        <Text color={theme.primary}>Terminal WhatsApp client with AI.</Text>
        <Text color={theme.muted}>
          TypeScript · React/Ink · whatsapp-web.js
        </Text>
        <Text color={theme.muted}>Press any number key to return.</Text>
        <Box marginTop={1} flexDirection="row" flexWrap="wrap">
          {menuOptions.map(opt => (
            <Text key={opt.num} color={theme.primary}>
              [{opt.num}]{opt.text}{" "}
            </Text>
          ))}
        </Box>
      </Box>
    );
  }

  if (view === "settings") {
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        height={contentHeight}
        paddingX={1}
        borderStyle="single"
        borderColor={theme.border}
        overflow="hidden"
      >
        <Text bold color={theme.header}>
          SETTINGS
        </Text>
        <SettingRow
          label="AI Provider"
          value={config.aiProvider.provider}
          valueColor={theme.header}
        />
        <SettingRow label="AI Model" value={config.aiProvider.model} />
        <SettingRow
          label="Theme"
          value={config.theme}
          valueColor={theme.primary}
        />
        <SettingRow label="Message Limit" value={String(config.messageLimit)} />
        <SettingRow
          label="Auto Reconnect"
          value={config.autoReconnect ? "On" : "Off"}
          valueColor={config.autoReconnect ? theme.primary : theme.error}
        />
        <SettingRow
          label="Chat History"
          value={config.chatHistoryEnabled ? "On" : "Off"}
        />
        <Text color={theme.muted}>Edit ~/.whatsapp-cli/config.json</Text>
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      height={contentHeight}
      flexShrink={0}
      borderStyle="single"
      borderColor={theme.borderActive}
      overflow="hidden"
    >
      <Box paddingX={1} borderStyle="single" borderColor={theme.border}>
        <Text bold color={theme.header}>
          MESSAGES
        </Text>
        <Text color={theme.primary}>
          {activeChatName ? ` · ${activeChatName}` : " · Select a chat"}
        </Text>
      </Box>

      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={1}
        overflow="hidden"
        justifyContent="flex-end"
      >
        {activeChatName ? (
          displayMessages.length > 0 ? (
            displayMessages.map((msg, index) => {
              const prevMsg = index > 0 ? displayMessages[index - 1] : null;
              const showSender = !prevMsg || prevMsg.fromMe !== msg.fromMe;
              const key = `${msg.fromMe ? "out" : "in"}-${msg.time}-${index}`;

              return (
                <ChatBubble key={key} message={msg} showSender={showSender} />
              );
            })
          ) : (
            <Text color={theme.muted}>No messages. Press [3] to send.</Text>
          )
        ) : (
          <Text color={theme.muted}>
            ↑↓ navigate chats · ↵ open · [2] select by number
          </Text>
        )}
      </Box>

      <Box paddingX={1} flexDirection="row" flexWrap="wrap">
        {menuOptions.map(opt => (
          <Text key={opt.num} color={theme.primary}>
            [{opt.num}]{opt.text}{" "}
          </Text>
        ))}
      </Box>
    </Box>
  );
};
