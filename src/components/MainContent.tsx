import {Box, Text} from 'ink'
import React, {useEffect, useMemo} from 'react'
import {useScrollViewport} from '../hooks/useScrollViewport'
import {useTheme} from '../theme'
import {Settings} from './Settings'

interface Message {
	id: string
	sender: string
	message: string
	time: string
	fromMe: boolean
	mediaType?: string
	hasMedia?: boolean
}

interface MainContentProps {
	activeChatName: string | null
	messages: Message[]
	menuOptions: Array<{num: string; text: string}>
	qrCode?: string | null
	view?: 'chat' | 'about' | 'settings'
	contentHeight: number
	searchQuery?: string
	searchMatchIndex?: number
	searchMatchCount?: number
	searchMatchIds?: Set<string>
}

const ChatBubble: React.FC<{
	message: Message
	showSender: boolean
	isSearchMatch?: boolean
}> = ({message, showSender, isSearchMatch}) => {
	const theme = useTheme()

	const mediaLabel = useMemo(() => {
		if (!message.hasMedia) return null
		const type = message.mediaType || 'media'
		const icon =
			type === 'image'
				? '🖼'
				: type === 'video'
					? '🎬'
					: type === 'audio'
						? '🎵'
						: type === 'document'
							? '📄'
							: type === 'sticker'
								? '😀'
								: '📎'
		return `${icon} ${type}`
	}, [message.hasMedia, message.mediaType])

	return (
		<Box
			flexDirection="column"
			alignItems={message.fromMe ? 'flex-end' : 'flex-start'}
			marginBottom={0}
		>
			{!message.fromMe && showSender && (
				<Text
					bold
					color={theme.header}
				>
					{message.sender}
				</Text>
			)}
			<Box
				paddingX={1}
				borderStyle="single"
				borderColor={
					isSearchMatch
						? theme.accent
						: message.fromMe
							? theme.outgoing
							: theme.incoming
				}
				flexDirection="column"
				maxWidth={50}
			>
				{mediaLabel && <Text color={theme.accent}>{mediaLabel}</Text>}
				<Text
					color={isSearchMatch ? theme.accent : theme.primary}
					wrap="wrap"
				>
					{message.message}
				</Text>
				<Text color={theme.muted}>
					{message.time}
					{message.fromMe ? ' ✓' : ''}
				</Text>
			</Box>
		</Box>
	)
}

export const MainContent: React.FC<MainContentProps> = ({
	activeChatName,
	messages,
	menuOptions,
	qrCode,
	view = 'chat',
	contentHeight,
	searchQuery = '',
	searchMatchIndex = -1,
	searchMatchCount = 0,
	searchMatchIds = new Set(),
}) => {
	const theme = useTheme()
	const messageVisibleCount = Math.max(1, contentHeight - 4)
	const messageCursor = Math.max(0, messages.length - 1)
	const {visibleItems: visibleMessages, ensureIndexVisible} = useScrollViewport(
		messages,
		messageVisibleCount,
		messageCursor,
	)

	const searchMatches = useMemo(() => {
		if (!searchQuery) return new Set<string>()
		return searchMatchIds
	}, [searchQuery, searchMatchIds])

	const displayMessages = useMemo(() => {
		if (messages.length <= messageVisibleCount) return messages
		return visibleMessages
	}, [messages, messageVisibleCount, visibleMessages])

	useEffect(() => {
		if (searchQuery && searchMatchCount > 0 && searchMatchIndex >= 0) {
			const matchIdsArray = Array.from(searchMatchIds)
			const selectedId = matchIdsArray[searchMatchIndex]
			if (selectedId) {
				const idx = messages.findIndex(m => m.id === selectedId)
				if (idx >= 0) {
					ensureIndexVisible(idx)
				}
			}
		}
	}, [
		searchMatchIndex,
		searchMatchIds,
		searchQuery,
		messages,
		ensureIndexVisible,
	])

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
				<Text
					bold
					color={theme.header}
				>
					AUTH
				</Text>
				<Text color={theme.muted}>Scan QR with WhatsApp on your phone</Text>
				<Box marginTop={1}>
					<Text color={theme.primary}>{qrCode}</Text>
				</Box>
				<Text color={theme.accent}>Waiting for scan...</Text>
			</Box>
		)
	}

	if (view === 'about') {
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
				<Text
					bold
					color={theme.header}
				>
					ABOUT
				</Text>
				<Text color={theme.primary}>Terminal WhatsApp client with AI.</Text>
				<Text color={theme.muted}>
					TypeScript · React/Ink · whatsapp-web.js
				</Text>
				<Text color={theme.muted}>Press any number key to return.</Text>
				<Box
					marginTop={1}
					flexDirection="row"
					flexWrap="wrap"
				>
					{menuOptions.map(opt => (
						<Text
							key={opt.num}
							color={theme.primary}
						>
							[{opt.num}]{opt.text}{' '}
						</Text>
					))}
				</Box>
			</Box>
		)
	}

	if (view === 'settings') {
		return <Settings />
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
			<Box
				paddingX={1}
				borderStyle="single"
				borderColor={theme.border}
			>
				<Text
					bold
					color={theme.header}
				>
					MESSAGES
				</Text>
				<Text color={theme.primary}>
					{activeChatName ? ` · ${activeChatName}` : ' · Select a chat'}
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
							const prevMsg = index > 0 ? displayMessages[index - 1] : null
							const showSender = !prevMsg || prevMsg.fromMe !== msg.fromMe
							const key = `${msg.fromMe ? 'out' : 'in'}-${msg.time}-${index}`
							const isSearchMatch =
								searchQuery.length > 0 && searchMatches.has(msg.id)

							return (
								<ChatBubble
									key={key}
									message={msg}
									showSender={showSender}
									isSearchMatch={isSearchMatch}
								/>
							)
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

			<Box
				paddingX={1}
				flexDirection="row"
				flexWrap="wrap"
			>
				{menuOptions.map(opt => (
					<Text
						key={opt.num}
						color={theme.primary}
					>
						[{opt.num}]{opt.text}{' '}
					</Text>
				))}
				{searchQuery && searchMatchCount > 0 && (
					<Text color={theme.accent}>
						[{searchMatchIndex + 1}/{searchMatchCount}] matches{' '}
					</Text>
				)}
				{searchQuery && searchMatchCount === 0 && (
					<Text color={theme.error}>[0 matches] </Text>
				)}
			</Box>
		</Box>
	)
}
