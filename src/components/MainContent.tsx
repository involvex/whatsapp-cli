import React from "react";
import { Box, Text } from "ink";
import { getConfig } from "../config";

interface MainContentProps {
  activeChatName: string | null;
  messages: Array<{
    sender: string;
    message: string;
    time: string;
    fromMe: boolean;
  }>;
  menuOptions: Array<{ num: string; text: string }>;
  qrCode?: string | null;
  view?: "chat" | "about" | "settings";
}

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
      <Box flexDirection="column" flexGrow={1} paddingX={2} borderStyle="round" borderColor="yellow" alignItems="center" justifyContent="center">
        <Text bold color="yellow">Authentication Required</Text>
        <Text>Scan this QR code with WhatsApp:</Text>
        <Box marginTop={1}>
            <Text>{qrCode}</Text>
        </Box>
        <Box marginTop={1}>
            <Text dimColor>Waiting for scan...</Text>
        </Box>
      </Box>
    );
  }

  if (view === "about") {
      return (
          <Box flexDirection="column" flexGrow={1} paddingX={2} borderStyle="round" borderColor="blue">
              <Text bold color="cyan">About WhatsApp CLI</Text>
              <Box flexDirection="column" marginTop={1}>
                  <Text>A minimal terminal-based WhatsApp client with AI integration.</Text>
                  <Box marginTop={1}>
                    <Text>Built with:</Text>
                  </Box>
                  <Text>• TypeScript & Ink</Text>
                  <Text>• whatsapp-web.js</Text>
                  <Text>• Puppeteer</Text>
                  <Box marginTop={1}>
                    <Text>Features:</Text>
                  </Box>
                  <Text>• Persistent Sidebar & Footer</Text>
                  <Text>• AI Message Generation</Text>
                  <Text>• Session Persistence</Text>
              </Box>
              <Box marginTop={1}>
                <Text dimColor>Press any command key to go back.</Text>
              </Box>
          </Box>
      );
  }

  if (view === "settings") {
    return (
        <Box flexDirection="column" flexGrow={1} paddingX={2} borderStyle="round" borderColor="blue">
            <Text bold color="cyan">Configuration Settings</Text>
            <Box flexDirection="column" marginTop={1}>
                <Text>AI Provider: <Text color="magenta">{config.aiProvider.provider}</Text></Text>
                <Text>AI Model: <Text color="magenta">{config.aiProvider.model}</Text></Text>
                <Text>Temperature: {config.aiProvider.temperature}</Text>
                <Text>Max Tokens: {config.aiProvider.maxTokens}</Text>
                <Text>Theme: {config.theme}</Text>
                <Text>Message Limit: {config.messageLimit}</Text>
                <Text>Chat History: {config.chatHistoryEnabled ? "Enabled" : "Disabled"}</Text>
            </Box>
            <Box marginTop={1}>
                <Text dimColor>Interactive settings coming soon! Edit config.json for now.</Text>
            </Box>
            <Box marginTop={1}>
                <Text dimColor>Press any command key to go back.</Text>
            </Box>
        </Box>
    );
}

  return (
    <Box flexDirection="column" flexGrow={1} paddingX={2} borderStyle="round" borderColor="blue">
      {activeChatName ? (
        <Box flexDirection="column" flexGrow={1}>
          <Box borderStyle="single" borderColor="gray" paddingX={1} marginBottom={1}>
            <Text bold color="cyan">Chat: {activeChatName}</Text>
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            {messages.slice(-10).map((msg, index) => (
              <Box key={index} marginBottom={0}>
                <Text color="gray">[{msg.time}] </Text>
                <Text bold color={msg.fromMe ? "blue" : "green"}>
                  {msg.sender}:{" "}
                </Text>
                <Text>{msg.message}</Text>
              </Box>
            ))}
            {messages.length === 0 && (
              <Text dimColor>No messages to display.</Text>
            )}
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1} justifyContent="center" alignItems="center">
          <Text bold color="yellow">Welcome to WhatsApp CLI</Text>
          <Text italic>Please select a chat to start messaging</Text>
        </Box>
      )}

      <Box marginTop={1} flexDirection="column">
        <Text bold color="yellow">Available Commands:</Text>
        <Box flexDirection="row" flexWrap="wrap">
          {menuOptions.map(opt => (
            <Box key={opt.num} marginRight={2}>
              <Text>
                <Text color="cyan">{opt.num}.</Text> {opt.text}
              </Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};
