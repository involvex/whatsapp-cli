import React from "react";
import { Box, Text } from "ink";
import { useTheme, type InkColor } from "../theme";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "authenticating"
  | "reconnecting"
  | "ready"
  | "loading_history";

interface FooterProps {
  aiEnabled: boolean;
  aiProvider: string;
  aiModel: string;
  lastMessage?: string;
  connectionStatus?: ConnectionStatus;
  historyError?: string | null;
  connectionError?: string | null;
  reconnectAttempt?: number;
  reconnectMax?: number;
  searchQuery?: string;
  searchMatchIndex?: number;
  searchMatchCount?: number;
}

export const Footer: React.FC<FooterProps> = ({
  aiEnabled,
  aiProvider,
  aiModel,
  lastMessage,
  connectionStatus = "ready",
  historyError = null,
  connectionError = null,
  reconnectAttempt = 0,
  reconnectMax = 3,
  searchQuery = "",
  searchMatchIndex = -1,
  searchMatchCount = 0,
}) => {
  const theme = useTheme();

  const getStatusIndicator = (): { color: InkColor; text: string } => {
    switch (connectionStatus) {
      case "connecting":
        return { color: theme.accent, text: "CONNECTING" };
      case "authenticating":
        return { color: theme.header, text: "AUTHENTICATING" };
      case "reconnecting":
        return {
          color: theme.accent,
          text: `RECONNECTING (${reconnectAttempt}/${reconnectMax})`,
        };
      case "loading_history":
        return { color: theme.header, text: "LOADING MESSAGES" };
      case "ready":
        return { color: theme.primary, text: "CONNECTED" };
      case "disconnected":
      default:
        return { color: theme.error, text: "DISCONNECTED" };
    }
  };

  const status = getStatusIndicator();
  const aiStatus = aiEnabled ? "AI ON" : "AI OFF";

  return (
    <Box flexDirection="column" paddingX={1} flexShrink={0}>
      <Box flexDirection="row" alignItems="center">
        <Text bold color={status.color}>
          {status.text}
        </Text>
        <Text color={theme.muted}> · </Text>
        <Text color={theme.primary}>{aiStatus}</Text>
        {aiEnabled && (
          <Text color={theme.muted}>
            {" "}
            ({aiProvider}/{aiModel})
          </Text>
        )}
        {searchQuery && searchMatchCount > 0 && (
          <>
            <Text color={theme.muted}> · </Text>
            <Text color={theme.accent}>
              SEARCH: {searchMatchIndex + 1}/{searchMatchCount}
            </Text>
          </>
        )}
        {searchQuery && searchMatchCount === 0 && (
          <>
            <Text color={theme.muted}> · </Text>
            <Text color={theme.error}>SEARCH: 0 matches</Text>
          </>
        )}
        {lastMessage && !searchQuery && (
          <>
            <Text color={theme.muted}> · </Text>
            <Text color={theme.header}>{lastMessage}</Text>
          </>
        )}
      </Box>
      {historyError && (
        <Box flexDirection="row">
          <Text color={theme.error} wrap="wrap">
            ⚠ {historyError}
          </Text>
        </Box>
      )}
      {connectionError && (
        <Box flexDirection="row">
          <Text color={theme.error} wrap="wrap">
            ⚠ {connectionError}
          </Text>
        </Box>
      )}
      <Text color={theme.primary}>
        {searchQuery
          ? "[↑↓] matches [Esc] clear [Q] Exit"
          : "[↑↓] Nav [↵] Open [⇧↵] Type [1] Refresh [3] Send [M] Media [8] Logout [Q] Exit"}
      </Text>
    </Box>
  );
};
