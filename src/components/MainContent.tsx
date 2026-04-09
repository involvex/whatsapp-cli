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

// ─── Shared sub-components ────────────────────────────────────────────────────

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

// ─── Main export ──────────────────────────────────────────────────────────────

export const MainContent: React.FC<MainContentProps> = ({
  activeChatName,
  messages,
  menuOptions,
  qrCode,
  view = "chat",
}) => {
  const config = getConfig();

  // ── QR screen ───────────────────────────────────────────────────────────────
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

  // ── About screen ────────────────────────────────────────────────────────────
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

  // ── Settings screen ─────────────────────────────────────────────────────────
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

  // ── Chat screen ─────────────────────────────────────────────────────────────
  return (
    <Box
      flexDirection="column"
      flexGrow={1}
      borderStyle="round"
      borderColor="blue"
    >
      {/* Header */}
      <Box paddingX={2} paddingTop={0} flexDirection="row" gap={1}>
        {activeChatName ? (
          <>
            <Text color="cyan">💬</Text>
            <Text bold color="white">
              {activeChatName}
            </Text>
          </>
        ) : (
          <Text bold color="yellow">
            📱 WhatsApp CLI
          </Text>
        )}
      </Box>

      <Box paddingX={1}>
        <Divider />
      </Box>

      {/* Messages area */}
      <Box flexDirection="column" flexGrow={1} paddingX={2}>
        {activeChatName ? (
          messages.length > 0 ? (
            messages.slice(-12).map((msg, index) => (
              <Box key={index} flexDirection="row">
                {msg.fromMe ? (
                  <>
                    <Text dimColor>[{msg.time}] </Text>
                    <Text bold color="blue">
                      You:{" "}
                    </Text>
                    <Text wrap="wrap">{msg.message}</Text>
                    <Text color="blue"> ▸</Text>
                  </>
                ) : (
                  <>
                    <Text color="green">◂ </Text>
                    <Text dimColor>[{msg.time}] </Text>
                    <Text bold color="green">
                      {msg.sender}:{" "}
                    </Text>
                    <Text wrap="wrap">{msg.message}</Text>
                  </>
                )}
              </Box>
            ))
          ) : (
            <Box flexGrow={1} alignItems="center" justifyContent="center">
              <Text dimColor>No messages yet. Press [3] to send one.</Text>
            </Box>
          )
        ) : (
          <Box
            flexGrow={1}
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
          >
            <Text bold color="green">
              Welcome to WhatsApp CLI
            </Text>
            <Box marginTop={1}>
              <Text dimColor>Select a chat to start messaging:</Text>
            </Box>
            <Box marginTop={1} flexDirection="column">
              <Text dimColor> ↑↓ Navigate the chat list</Text>
              <Text dimColor> ↵ Open highlighted chat</Text>
              <Text dimColor> ⇧↵ Start typing a message</Text>
              <Text dimColor> [2] Enter chat number directly</Text>
            </Box>
          </Box>
        )}
      </Box>

      {/* Command bar */}
      <Box paddingX={1}>
        <Divider />
      </Box>
      <CommandBar menuOptions={menuOptions} />
    </Box>
  );
};
