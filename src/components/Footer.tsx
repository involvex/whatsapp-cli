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
        {lastMessage && (
          <>
            <Text color={theme.muted}> · </Text>
            <Text color={theme.header}>{lastMessage}</Text>
          </>
        )}
        {historyError && <Text color={theme.error}> · {historyError}</Text>}
        {connectionError && (
          <Text color={theme.error}> · {connectionError}</Text>
        )}
      </Box>
      <Text color={theme.primary}>
        [↑↓] Nav [↵] Open [⇧↵] Type [1] Refresh [3] Send [8] Logout [Q] Exit
      </Text>
    </Box>
  );
};
