import React from "react";
import { Box, Text } from "ink";
import { getConfig } from "../config";

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
}

const Divider: React.FC<{ width?: number }> = ({ width = 48 }) => (
  <Text dimColor>{"─".repeat(width)}</Text>
);

const SettingRow: React.FC<{
  label: string;
  value: string;
  valueColor?: string;
}> = ({ label, value, valueColor }) => (
  <Box flexDirection="row" gap={1}>
    <Text dimColor>{label}:</Text>
    <Text bold color={valueColor as Parameters<typeof Text>[0]["color"]}>
      {value}
    </Text>
  </Box>
);

const CommandBar: React.FC<{
  menuOptions: Array<{ num: string; text: string }>;
}> = ({ menuOptions }) => (
  <Box paddingX={1} paddingTop={1} flexDirection="row" flexWrap="wrap">
    {menuOptions.map(opt => (
      <Box key={opt.num} marginRight={1}>
        <Text bold color="cyan">
          [{opt.num}]
        </Text>
        <Text dimColor>{opt.text} </Text>
      </Box>
    ))}
  </Box>
);

const ChatBubble: React.FC<{
  message: Message;
  showSender: boolean;
}> = ({ message, showSender }) => {
  return (
    <Box
      flexDirection="column"
      alignItems={message.fromMe ? "flex-end" : "flex-start"}
      marginBottom={1}
    >
      {!message.fromMe && showSender && (
        <Text bold color="cyan">
          {message.sender}
        </Text>
      )}
      <Box
        paddingX={2}
        paddingY={1}
        borderStyle={message.fromMe ? "double" : "single"}
        borderColor={message.fromMe ? "green" : "gray"}
        borderDimColor={!message.fromMe}
        flexDirection="column"
        maxWidth={45}
      >
        <Text wrap="wrap">{message.message}</Text>
        <Box flexDirection="row" justifyContent="flex-end" marginTop={1}>
          <Text dimColor>{message.time}</Text>
          {message.fromMe && (
            <Box marginLeft={1}>
              <Text color="cyan">✓✓</Text>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

const WhatsAppHeader: React.FC<{
  chatName: string | null;
}> = ({ chatName }) => (
  <Box
    flexDirection="row"
    alignItems="center"
    paddingX={2}
    paddingY={1}
    borderStyle="single"
    borderColor="green"
  >
    <Box flexDirection="column" flexGrow={1}>
      {chatName ? (
        <>
          <Text bold color="white">
            {chatName}
          </Text>
          <Text dimColor>click for info</Text>
        </>
      ) : (
        <Text bold color="white">
          WhatsApp
        </Text>
      )}
    </Box>
    <Text color="white">⋮</Text>
  </Box>
);

const EmptyChatState: React.FC = () => (
  <Box
    flexGrow={1}
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
  >
    <Text bold color="white">
      WhatsApp CLI
    </Text>
    <Box marginTop={1}>
      <Text dimColor>Select a chat to start messaging</Text>
    </Box>
    <Box marginTop={2} flexDirection="column">
      <Text dimColor> ↑↓ Navigate the chat list</Text>
      <Text dimColor> ↵ Open highlighted chat</Text>
      <Text dimColor> ⇧↵ Start typing a message</Text>
      <Text dimColor> [2] Enter chat number directly</Text>
    </Box>
  </Box>
);

const InputArea: React.FC<{
  inputMode: string;
}> = ({ inputMode }) => {
  const placeholder =
    inputMode === "message"
      ? "Type a message..."
      : "Type a message  ↵ send  Esc cancel";

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      paddingX={2}
      paddingY={1}
      borderStyle="single"
      borderColor="gray"
    >
      <Text color="gray">😊</Text>
      <Box flexGrow={1} marginX={1}>
        <Text backgroundColor="black" color="gray">
          {placeholder}
        </Text>
      </Box>
      <Text color="gray">📎</Text>
      <Text color="green" bold>
        {" ➤"}
      </Text>
    </Box>
  );
};

export const MainContent: React.FC<MainContentProps> = ({
  activeChatName,
  messages,
  menuOptions,
  qrCode,
  view = "chat",
}) => {
  const config = getConfig();

  if (qrCode) {
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={2}
        borderStyle="round"
        borderColor="yellow"
        alignItems="center"
        justifyContent="center"
      >
        <Text bold color="yellow">
          🔐 Authentication Required
        </Text>
        <Text dimColor>Scan this QR code with WhatsApp on your phone:</Text>
        <Box marginTop={1}>
          <Text>{qrCode}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="yellow">⟳ Waiting for scan…</Text>
        </Box>
      </Box>
    );
  }

  if (view === "about") {
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={2}
        borderStyle="round"
        borderColor="blue"
      >
        <Text bold color="cyan">
          ℹ About WhatsApp CLI
        </Text>
        <Divider />
        <Box flexDirection="column" marginTop={1} gap={0}>
          <Text>A minimal terminal WhatsApp client with AI integration.</Text>
          <Box marginTop={1} flexDirection="column">
            <Text bold color="yellow">
              Built with:
            </Text>
            <Text> • TypeScript & React/Ink</Text>
            <Text> • whatsapp-web.js + Puppeteer</Text>
            <Text> • AI provider integration</Text>
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text bold color="yellow">
              Features:
            </Text>
            <Text> • Real-time messaging & history</Text>
            <Text> • AI-assisted responses</Text>
            <Text> • Keyboard navigation (↑↓ + Enter)</Text>
            <Text> • Session persistence</Text>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press any number key to return to chat.</Text>
        </Box>
        <Box flexGrow={1} />
        <CommandBar menuOptions={menuOptions} />
      </Box>
    );
  }

  if (view === "settings") {
    return (
      <Box
        flexDirection="column"
        flexGrow={1}
        paddingX={2}
        borderStyle="round"
        borderColor="blue"
      >
        <Text bold color="cyan">
          ⚙ Configuration
        </Text>
        <Divider />
        <Box flexDirection="column" marginTop={1} gap={0}>
          <SettingRow
            label="AI Provider"
            value={config.aiProvider.provider}
            valueColor="magenta"
          />
          <SettingRow
            label="AI Model"
            value={config.aiProvider.model}
            valueColor="magenta"
          />
          <SettingRow
            label="Temperature"
            value={String(config.aiProvider.temperature)}
          />
          <SettingRow
            label="Max Tokens"
            value={String(config.aiProvider.maxTokens)}
          />
          <SettingRow label="Theme" value={config.theme} />
          <SettingRow
            label="Message Limit"
            value={String(config.messageLimit)}
          />
          <SettingRow
            label="Chat History"
            value={config.chatHistoryEnabled ? "Enabled" : "Disabled"}
            valueColor={config.chatHistoryEnabled ? "green" : "red"}
          />
          <SettingRow
            label="Sound Notifications"
            value={config.soundEnabled ? "Enabled" : "Disabled"}
            valueColor={config.soundEnabled ? "green" : "red"}
          />
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Edit config.json to change settings.</Text>
        </Box>
        <Box marginTop={1}>
          <Text dimColor>Press any number key to return to chat.</Text>
        </Box>
        <Box flexGrow={1} />
        <CommandBar menuOptions={menuOptions} />
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor="green"
    >
      <WhatsAppHeader chatName={activeChatName} />

      <Box flexDirection="column" flexGrow={1} paddingX={1} paddingY={1}>
        {activeChatName ? (
          messages.length > 0 ? (
            <Box flexDirection="column" flexGrow={1} justifyContent="flex-end">
              {messages.slice(-15).map((msg, index) => {
                const prevMsg =
                  index > 0 ? messages.slice(-15)[index - 1] : null;
                const showSender = !prevMsg || prevMsg.fromMe !== msg.fromMe;
                const key = `${msg.fromMe ? "out" : "in"}-${msg.time}-${index}`;

                return (
                  <ChatBubble key={key} message={msg} showSender={showSender} />
                );
              })}
            </Box>
          ) : (
            <Box flexGrow={1} alignItems="center" justifyContent="center">
              <Text dimColor>No messages yet. Press [3] to send one.</Text>
            </Box>
          )
        ) : (
          <EmptyChatState />
        )}
      </Box>

      <Box paddingX={1}>
        <Divider />
      </Box>
      <InputArea inputMode={view} />
      <CommandBar menuOptions={menuOptions} />
    </Box>
  );
};
