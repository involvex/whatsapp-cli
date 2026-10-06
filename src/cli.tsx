import {promises as fs} from 'fs'
import {render} from 'ink'
import path from 'path'
import qrcode from 'qrcode-terminal'
import React, {useCallback, useEffect, useRef, useState} from 'react'
import type {Chat, Client, Message} from 'whatsapp-web.js'
import {MessageMedia} from 'whatsapp-web.js'
import {getPackageInfo, parseArgs, showHelp, showVersion} from './args'
import {
	chatToPersistedChat,
	loadChatHistory,
	messageToPersisted,
	saveChatHistory,
	type PersistedChat,
} from './chatPersistence'
import {
	clearAuthSession,
	destroyClient,
	initializeClient,
	reconnectClient,
	setAuthenticatedCallback,
	setDisconnectedCallback,
	setErrorCallback,
	setLoadingScreenCallback,
	setMessageCallback,
	setQrCallback,
	setReadyCallback,
	setReconnectingCallback,
} from './client'
import {App} from './components/App'
import type {ConnectionStatus} from './components/Footer'
import {getConfig, loadConfig, PATHS} from './config'
import {createLogger} from './logger'

const RECONNECT_MAX = 3
const MAX_MEDIA_SIZE = 50 * 1024 * 1024
const logger = createLogger({console: false, file: false})

// JSON.stringify(new Error()) === "{}", so serialize explicitly —
// otherwise log files contain no message/stack and debugging is blind.
function serializeError(error: unknown): Record<string, unknown> {
	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message,
			stack: error.stack?.slice(0, 2000),
		}
	}
	try {
		return {value: JSON.stringify(error)?.slice(0, 2000)}
	} catch {
		return {value: String(error).slice(0, 2000)}
	}
}

function shortReason(error: unknown, max = 60): string {
	const raw = error instanceof Error ? error.message : String(error)
	const oneLine = raw.replace(/\s+/g, ' ').trim() || 'unknown error'
	return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine
}

const WhatsAppCLI: React.FC = () => {
	const [chats, setChats] = useState<Chat[]>([])
	const [persistedChats, setPersistedChats] = useState<PersistedChat[]>([])
	const [activeChat, setActiveChat] = useState<Chat | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const [connectionStatus, setConnectionStatus] =
		useState<ConnectionStatus>('disconnected')
	const [historyError, setHistoryError] = useState<string | null>(null)
	const [connectionError, setConnectionError] = useState<string | null>(null)
	const [reconnectAttempt, setReconnectAttempt] = useState(0)
	const [aiEnabled, setAiEnabled] = useState(false)
	const [recentMessages, setRecentMessages] = useState<
		Array<{
			id: string
			sender: string
			message: string
			time: string
			fromMe: boolean
			mediaType?: string
			hasMedia?: boolean
		}>
	>([])
	const [client, setClient] = useState<Client | null>(null)
	const [qrCodeString, setQrCodeString] = useState<string | null>(null)
	const [currentView, setCurrentView] = useState<'chat' | 'about' | 'settings'>(
		'chat',
	)
	const [searchQuery, setSearchQuery] = useState('')
	const [searchMatchIndex, setSearchMatchIndex] = useState(0)
	const [searchMatchCount, setSearchMatchCount] = useState(0)
	const [searchMatchIds, setSearchMatchIds] = useState<Set<string>>(new Set())

	void searchQuery
	void setSearchQuery
	void searchMatchIds
	void setSearchMatchIds

	const activeChatRef = useRef<Chat | null>(null)
	const initStartedRef = useRef(false)
	const diagDoneRef = useRef(false)
	// Guards against late fetchHistory responses overwriting a newer chat's
	// messages when the user switches chats while a fetch is in flight.
	const historyRequestRef = useRef(0)

	// Hardens the page-side WWebJS API against poisoned chats: a single chat
	// whose lastReceivedKey breaks the IndexedDB lookup makes the stock
	// getChatModel throw, which rejects the whole Promise.all in getChats —
	// so ALL chats fail. The patch falls back to a basic serialize() model
	// per chat (idempotent via window flag; re-applied after page reloads).
	const hardenWWebJS = useCallback(async (target: Client) => {
		try {
			const page = (
				target as unknown as {
					pupPage: {evaluate: (expr: string) => Promise<unknown>}
				}
			).pupPage
			await page.evaluate(
				`(() => {
          if (window.__wcliHardened || !window.WWebJS?.getChatModel) return window.__wcliHardened ? 'already' : 'no-wwebjs';
          const G = (fn, fb) => { try { const v = fn(); return v === undefined || v === null ? fb : v; } catch (e) { return fb; } };
          const resolveTitle = (chat) => {
            let t = G(() => chat.formattedTitle, '') || G(() => chat.name, '');
            if (!t) t = G(() => chat.contact && (chat.contact.name || chat.contact.pushname || chat.contact.verifiedName || chat.contact.shortName), '');
            if (!t) t = G(() => { const wa = window.require('WAWebCollections'); if (!wa.Contact) return ''; const id = chat.id && chat.id._serialized; const c = (wa.Contact.get && wa.Contact.get(id)) || null; return c ? (c.name || c.pushname || c.verifiedName || c.shortName || '') : ''; }, '');
            return t || '';
          };
          const safeLastMessage = async (chat) => {
            try {
              const k = chat.lastReceivedKey && chat.lastReceivedKey._serialized;
              if (!k) return null;
              const wa = window.require('WAWebCollections');
              let lm = null;
              try { lm = wa.Msg.get(k); } catch (e) {}
              if (!lm) { try { lm = (await wa.Msg.getMessagesById([k]))?.messages?.[0]; } catch (e) {} }
              if (!lm) return null;
              try { return window.WWebJS.getMessageModel(lm); } catch (e) { return null; }
            } catch (e) { return null; }
          };
          const fallbackModel = async (chat) => {
            try {
              const m = chat.serialize();
              m.isGroup = !!chat.groupMetadata;
              m.isMuted = false;
              const t = resolveTitle(chat);
              if (t) { m.formattedTitle = t; m.name = t; }
              m.lastMessage = await safeLastMessage(chat);
              delete m.msgs; delete m.msgUnsyncedButtonReplyMsgs; delete m.unsyncedButtonReplies;
              return m;
            } catch (e2) { return null; }
          };
          const origModel = window.WWebJS.getChatModel.bind(window.WWebJS);
          window.WWebJS.getChatModel = async (chat, opts) => {
            try { return await origModel(chat, opts); }
            catch (e) { return await fallbackModel(chat); }
          };
          const origChats = window.WWebJS.getChats.bind(window.WWebJS);
          window.WWebJS.getChats = async () => (await origChats()).filter(Boolean);
          window.__wcliHardened = 'v2';
          return 'hardened-v2';
        })()`,
			)
		} catch (error) {
			logger.error('Failed to harden WWebJS', {...serializeError(error)})
		}
	}, [])

	// In-page diagnostics probe suite (shared by auto-run on ready and the
	// hidden "0" command). Bodies are strings evaluated in the PAGE context.
	const runPageDiagnostics = useCallback(async (target: Client) => {
		logger.info('DIAG probe-suite v2 started')
		try {
			const page = (
				target as unknown as {
					pupPage: {evaluate: (expr: string) => Promise<unknown>}
				}
			).pupPage
			const withStack = `(e => 'name=' + (e && e.name) + ' msg=' + String((e && e.message) || e).slice(0,200) + ' stack=' + String((e && e.stack) || 'none').slice(0,600))`
			const probes: Array<[string, string]> = [
				['typeof WWebJS', 'typeof window.WWebJS'],
				['WWebJS keys', 'Object.keys(window.WWebJS || {})'],
				['typeof require', 'typeof window.require'],
				[
					'WAWebCollections',
					`(() => { try { const c = window.require('WAWebCollections'); return 'ok keys=' + Object.keys(c || {}).slice(0,8).join(','); } catch (e) { return 'THREW-IN-PAGE: ' + (${withStack})(e); } })()`,
				],
				[
					'Chat.getModelsArray len',
					`(() => { try { return window.require('WAWebCollections').Chat.getModelsArray().length; } catch (e) { return 'THREW-IN-PAGE: ' + (${withStack})(e); } })()`,
				],
				[
					'raw getChats',
					`window.WWebJS.getChats().then(c => 'ok len=' + c.length).catch(e => 'THREW-IN-PAGE: ' + (${withStack})(e))`,
				],
				[
					'serialize first chat',
					`(() => { try { const a = window.require('WAWebCollections').Chat.getModelsArray(); if (!a.length) return 'no chats'; return 'ok id=' + a[0].serialize().id._serialized; } catch (e) { return 'THREW-IN-PAGE: ' + (${withStack})(e); } })()`,
				],
				[
					'first chat shape',
					`(() => { try { const a = window.require('WAWebCollections').Chat.getModelsArray(); if (!a.length) return 'no chats'; const c = a[0]; const s = c.serialize(); return 'keys=' + Object.keys(c).slice(0,25).join(',') + ' | formattedTitle=' + c.formattedTitle + ' | name=' + c.name + ' | sname=' + s.name + ' | contact=' + (c.contact ? (c.contact.name || c.contact.pushname || c.contact.verifiedName || 'present-noname') : 'none') + ' | lastRecvKey=' + (c.lastReceivedKey ? (c.lastReceivedKey._serialized || 'KEY-NO-SERIAL') : 'null') + ' | groupMeta=' + !!c.groupMetadata; } catch (e) { return 'THREW-IN-PAGE: ' + (${withStack})(e); } })()`,
				],
			]
			for (const [label, expr] of probes) {
				try {
					const res = await page.evaluate(expr)
					logger.info(`DIAG ${label}`, {
						result: JSON.stringify(res)?.slice(0, 800),
					})
				} catch (error) {
					logger.error(`DIAG ${label} threw`, {...serializeError(error)})
				}
			}
			logger.info('DIAG probe-suite v2 done')
		} catch (error) {
			logger.error('DIAG suite failed', {...serializeError(error)})
		}
	}, [])
	activeChatRef.current = activeChat

	const config = getConfig()

	const computeSearchMatches = useCallback(
		(query: string) => {
			if (!query.trim()) {
				setSearchMatchIds(new Set())
				setSearchMatchCount(0)
				setSearchMatchIndex(0)
				return
			}
			const q = query.toLowerCase()
			const matchIds = new Set<string>()
			persistedChats.forEach(chat => {
				chat.messages.forEach(msg => {
					if (
						msg.sender.toLowerCase().includes(q) ||
						msg.message.toLowerCase().includes(q)
					) {
						matchIds.add(msg.id)
					}
				})
			})
			setSearchMatchIds(matchIds)
			const count = matchIds.size
			setSearchMatchCount(count)
			if (count > 0) {
				setSearchMatchIndex(prev => Math.min(prev, count - 1))
			} else {
				setSearchMatchIndex(0)
			}
		},
		[persistedChats],
	)

	const handleSearchNext = useCallback(() => {
		if (searchMatchCount === 0) return
		setSearchMatchIndex(prev => (prev + 1) % searchMatchCount)
	}, [searchMatchCount])

	const handleSearchPrev = useCallback(() => {
		if (searchMatchCount === 0) return
		setSearchMatchIndex(
			prev => (prev - 1 + searchMatchCount) % searchMatchCount,
		)
	}, [searchMatchCount])

	const toRecentMessage = useCallback(
		(msg: Message) => ({
			id: msg.id._serialized,
			sender: msg.from?.split('@')[0] || (msg.id.fromMe ? 'Me' : 'Unknown'),
			message: msg.body || '[Media/Sticker]',
			time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
			fromMe: msg.id.fromMe,
		}),
		[],
	)

	const loadChatsFromClient = useCallback(
		async (readyClient: Client) => {
			await hardenWWebJS(readyClient)
			const MAX_ATTEMPTS = 3
			const ATTEMPT_TIMEOUT_MS = 20000
			let lastError: unknown = null
			for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
				try {
					logger.info(`Loading chats (attempt ${attempt}/${MAX_ATTEMPTS})`)
					const getChatsPromise = readyClient.getChats()
					const timeoutPromise = new Promise<Chat[]>((_, reject) =>
						setTimeout(
							() =>
								reject(
									new Error(
										`Timeout loading chats (attempt ${attempt}/${MAX_ATTEMPTS})`,
									),
								),
							ATTEMPT_TIMEOUT_MS,
						),
					)
					const loadedChats = await Promise.race([
						getChatsPromise,
						timeoutPromise,
					])
					logger.info(`Loaded ${loadedChats.length} chats from WhatsApp`)
					const sortedChats = loadedChats.sort(
						(a: Chat, b: Chat) => (b.timestamp || 0) - (a.timestamp || 0),
					)
					setChats(sortedChats)

					// Merge with existing cache instead of wiping messages to [].
					// Also never overwrite a good cached name/preview with an empty
					// fallback-model value (fallback serialize() lacks resolved names).
					setPersistedChats(prev => {
						const prevById = new Map(prev.map(c => [c.id, c]))
						const persisted: PersistedChat[] = sortedChats.map(chat => {
							const fresh = chatToPersistedChat(chat)
							const old = prevById.get(fresh.id)
							if (!old) return fresh
							return {
								...fresh,
								messages: old.messages,
								name: fresh.name || old.name,
								lastMessage: fresh.lastMessage || old.lastMessage,
								timestamp: fresh.timestamp || old.timestamp,
							}
						})
						void saveChatHistory(persisted).catch(() => {})
						return persisted
					})
					setConnectionError(null)
					return
				} catch (error) {
					lastError = error
					logger.error(`Failed to load chats (attempt ${attempt})`, {
						...serializeError(error),
					})
					if (attempt < MAX_ATTEMPTS) {
						await new Promise(resolve => setTimeout(resolve, 2000))
					}
				}
			}
			setConnectionError(
				`Chats failed: ${shortReason(lastError)} · Press [1] to retry`,
			)
		},
		[hardenWWebJS],
	)

	const setupClientCallbacks = useCallback(() => {
		setQrCallback((qr: string) => {
			setConnectionStatus('connecting')
			setConnectionError(null)
			setIsConnected(false)
			qrcode.generate(qr, {small: true}, code => {
				setQrCodeString(code)
			})
			logger.logClientEvent('qr', {qrLength: qr.length})
		})

		setAuthenticatedCallback(() => {
			setConnectionStatus('authenticating')
			setQrCodeString(null)
		})

		setLoadingScreenCallback(() => {
			setConnectionStatus('authenticating')
		})

		setReadyCallback(async (readyClient: Client) => {
			setClient(readyClient)
			setIsConnected(true)
			setConnectionStatus('ready')
			setQrCodeString(null)
			setConnectionError(null)
			setReconnectAttempt(0)
			// One-shot in-page diagnostics on first ready: identifiesminified
			// in-page throwers (e.g. WWebJS calls rejecting with "r") by
			// capturing the real in-page stack. Results go to the log file.
			if (!diagDoneRef.current) {
				diagDoneRef.current = true
				void runPageDiagnostics(readyClient)
			}
			try {
				await loadChatsFromClient(readyClient)
			} finally {
				setConnectionStatus('ready')
			}
		})

		setDisconnectedCallback(() => {
			setIsConnected(false)
			setClient(null)
			const autoReconnect = getConfig().autoReconnect
			if (autoReconnect) {
				setConnectionStatus('reconnecting')
			} else {
				setConnectionStatus('disconnected')
			}
		})

		setReconnectingCallback((attempt, maxAttempts) => {
			setConnectionStatus('reconnecting')
			setReconnectAttempt(attempt)
			setConnectionError(null)
			setIsConnected(false)
			setClient(null)
			void maxAttempts
		})

		setErrorCallback((error: Error) => {
			logger.error('Client error', {error})
			setConnectionError(error.message)
			setConnectionStatus('disconnected')
			setIsConnected(false)
			setClient(null)
		})

		setMessageCallback((msg: Message) => {
			const sender = msg.from?.split('@')[0] || 'Unknown'
			const time = new Date(msg.timestamp * 1000).toLocaleTimeString()
			const messageText = msg.body || '[Media]'
			const msgChatId = msg.id.fromMe ? msg.to : msg.from

			const persistedMsg = messageToPersisted(msg)
			setPersistedChats(prev => {
				const updated = prev.map(chat => {
					if (chat.id === msgChatId && chat.messages) {
						const exists = chat.messages.some(m => m.id === msg.id._serialized)
						if (!exists) {
							return {
								...chat,
								messages: [...chat.messages, persistedMsg].slice(-50),
								lastMessage: messageText,
								timestamp: msg.timestamp,
								unreadCount:
									msg.id.fromMe ||
									activeChatRef.current?.id._serialized === chat.id
										? chat.unreadCount
										: (chat.unreadCount || 0) + 1,
							}
						}
					}
					return chat
				})
				// Re-sort by latest activity so newest/unread float to the top.
				updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
				setTimeout(() => saveChatHistory(updated).catch(() => {}), 5000)
				return updated
			})

			// Keep the live sidebar in sync too (it renders `chats`, not
			// `persistedChats`), otherwise new arrivals never reorder the list.
			setChats(prev => {
				const updated = prev.map(c => {
					if (c.id._serialized === msgChatId) {
						return {
							...c,
							lastMessage: {body: messageText},
							timestamp: msg.timestamp,
							unreadCount:
								msg.id.fromMe ||
								activeChatRef.current?.id._serialized === c.id._serialized
									? c.unreadCount
									: (c.unreadCount || 0) + 1,
						} as Chat
					}
					return c
				})
				updated.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
				return updated
			})

			const currentActive = activeChatRef.current
			const isForActiveChat =
				currentActive &&
				(msg.from === currentActive.id._serialized ||
					(msg.id.fromMe && msg.to === currentActive.id._serialized))

			if (isForActiveChat) {
				setRecentMessages(prev => {
					const newMessages = [
						...prev,
						{
							id: msg.id._serialized,
							sender,
							message: messageText,
							time,
							fromMe: msg.id.fromMe,
							mediaType: msg.hasMedia ? msg.type : undefined,
							hasMedia: msg.hasMedia,
						},
					]
					return newMessages.slice(-20)
				})
			}

			if (!msg.id.fromMe && getConfig().soundEnabled) {
				const isActiveChat =
					currentActive && msg.from === currentActive.id._serialized
				process.stdout.write(isActiveChat ? '\x07' : '\x07\x07')
			}

			if (msg.hasMedia && getConfig().autoDownloadMedia && !msg.id.fromMe) {
				const fileSize = (msg as Message & {media?: {filesize?: number}}).media
					?.filesize
				if (fileSize && fileSize > MAX_MEDIA_SIZE) {
					logger.warn('Media download skipped: too large', {
						size: fileSize,
						max: MAX_MEDIA_SIZE,
						type: msg.type,
					})
					return
				}
				const fileName = `${Date.now()}_${msg.id._serialized}`
				const ext =
					msg.type === 'image'
						? '.jpg'
						: msg.type === 'video'
							? '.mp4'
							: msg.type === 'audio'
								? '.ogg'
								: '.bin'
				const savePath = path.join(PATHS.downloads, fileName + ext)
				fs.mkdir(PATHS.downloads, {recursive: true}).catch(err => {
					logger.error('Failed to create downloads dir', {error: err})
				})
				msg
					.downloadMedia()
					.then(media => {
						return fs.writeFile(savePath, Buffer.from(media.data, 'base64'))
					})
					.then(() => {
						logger.info('Media downloaded', {savePath, type: msg.type})
					})
					.catch(err => {
						logger.error('Media download failed', {error: err})
						setConnectionError('Media download failed')
					})
			}
		})
	}, [loadChatsFromClient, runPageDiagnostics])

	const startClient = useCallback(async () => {
		setConnectionStatus('connecting')
		setConnectionError(null)
		try {
			await initializeClient()
		} catch (error) {
			logger.error('Initialization error', {error})
			setConnectionStatus('disconnected')
			setConnectionError(
				error instanceof Error ? error.message : 'Initialization failed',
			)
		}
	}, [])

	useEffect(() => {
		const loadPersisted = async () => {
			const loaded = await loadChatHistory()
			if (loaded.length > 0) {
				setPersistedChats(loaded)
				// Hydrate the sidebar immediately from cache so the UI is never
				// stuck on "Loading..." while getChats() syncs in the background.
				setChats(prev => {
					if (prev.length > 0) return prev
					return loaded.map(p => ({
						id: {_serialized: p.id, user: p.id.split('@')[0] || p.name},
						name: p.name,
						lastMessage: p.lastMessage ? {body: p.lastMessage} : undefined,
						timestamp: p.timestamp,
						unreadCount: p.unreadCount,
						isGroup: p.id.endsWith('@g.us'),
					})) as unknown as Chat[]
				})
			}
		}
		void loadPersisted()
	}, [])

	useEffect(() => {
		if (initStartedRef.current) return
		initStartedRef.current = true
		setupClientCallbacks()
		void startClient()
	}, [setupClientCallbacks, startClient])

	useEffect(() => {
		const fetchHistory = async () => {
			if (client && activeChat && isConnected) {
				await hardenWWebJS(client)
				const chatId = activeChat.id._serialized
				const limit = config.messageLimit || 15
				// Tag this fetch; late responses from a previous chat must not
				// overwrite the currently selected chat's messages.
				const requestId = ++historyRequestRef.current
				const isCurrent = () =>
					historyRequestRef.current === requestId &&
					activeChatRef.current?.id._serialized === chatId
				// Reset first so a failed/slow fetch can't leave the previous
				// chat's bubbles on screen, then show cache instantly if present.
				setRecentMessages([])
				const cached = persistedChats.find(c => c.id === chatId)
				if (cached && cached.messages.length > 0) {
					setRecentMessages(
						cached.messages.slice(-limit).map(m => ({
							id: m.id,
							sender: m.sender,
							message: m.message,
							time: m.time,
							fromMe: m.fromMe,
						})),
					)
				}
				setHistoryError(null)
				const withTimeout = (
					p: Promise<Message[]>,
					ms: number,
					label: string,
				): Promise<Message[]> =>
					Promise.race([
						p,
						new Promise<Message[]>((_, reject) =>
							setTimeout(() => reject(new Error(`${label} timed out`)), ms),
						),
					])
				const withChatTimeout = (
					p: Promise<Chat>,
					ms: number,
					label: string,
				): Promise<Chat> =>
					Promise.race([
						p,
						new Promise<Chat>((_, reject) =>
							setTimeout(() => reject(new Error(`${label} timed out`)), ms),
						),
					])
				let lastError: unknown = null
				for (let attempt = 1; attempt <= 2; attempt++) {
					try {
						const chat = await withChatTimeout(
							client.getChatById(chatId),
							15000,
							`getChatById (attempt ${attempt})`,
						)
						if (!chat) {
							throw new Error(
								`chat not found for id ${chatId} (stale/cached id?)`,
							)
						}
						const messages = await withTimeout(
							chat.fetchMessages({limit}),
							15000,
							`fetchMessages (attempt ${attempt})`,
						)
						// Drop late responses if the user already switched chats.
						if (!isCurrent()) return
						setRecentMessages(messages.map(toRecentMessage))
						setHistoryError(null)
						// Persist fetched messages so cache fallback works next time
						// (previously chatToPersistedChat wiped messages to []).
						const persistedMsgs = messages.map(messageToPersisted)
						setPersistedChats(prev => {
							const updated = prev.map(c =>
								c.id === chatId ? {...c, messages: persistedMsgs} : c,
							)
							void saveChatHistory(updated).catch(() => {})
							return updated
						})
						return
					} catch (error) {
						if (!isCurrent()) return
						lastError = error
						logger.error(`Failed to fetch history (attempt ${attempt})`, {
							chatId,
							...serializeError(error),
						})
						if (attempt < 2) {
							await new Promise(resolve => setTimeout(resolve, 1500))
						}
					}
				}
				if (!isCurrent()) return
				setHistoryError(
					`Could not load messages: ${shortReason(lastError)} · Press [4]`,
				)
			}
		}

		void fetchHistory()
	}, [
		client,
		activeChat,
		isConnected,
		config.messageLimit,
		persistedChats,
		toRecentMessage,
		hardenWWebJS,
	])

	const handleLogout = useCallback(async () => {
		setConnectionStatus('connecting')
		setConnectionError(null)
		setChats([])
		setActiveChat(null)
		setRecentMessages([])
		setQrCodeString(null)
		setIsConnected(false)
		setClient(null)
		setCurrentView('chat')

		try {
			await clearAuthSession()
		} catch {
			await destroyClient()
		}

		await startClient()
	}, [startClient])

	const handleSendMessage = useCallback(
		async (message: string) => {
			if (client && activeChat && message.trim()) {
				try {
					await client.sendMessage(activeChat.id._serialized, message)
				} catch (error) {
					logger.error('Send message error', {error})
					setConnectionError(
						error instanceof Error ? error.message : 'Send failed',
					)
				}
			}
		},
		[client, activeChat],
	)

	const handleSendMedia = useCallback(
		async (filePath: string) => {
			if (!client || !activeChat || !filePath.trim()) return
			const trimmed = filePath.trim()
			try {
				const stat = await fs.stat(trimmed)
				if (!stat.isFile()) {
					setConnectionError('Path is not a file')
					return
				}
			} catch {
				setConnectionError('File not found')
				return
			}
			try {
				const media = await MessageMedia.fromFilePath(trimmed)
				await client.sendMessage(activeChat.id._serialized, media)
			} catch (error) {
				logger.error('Send media error', {error})
				setConnectionError(
					error instanceof Error ? error.message : 'Send media failed',
				)
			}
		},
		[client, activeChat],
	)

	const handleCommand = useCallback(
		async (cmd: string) => {
			setCurrentView('chat')
			switch (cmd) {
				case '1':
					if (!isConnected || !client) {
						setConnectionError(null)
						setConnectionStatus('connecting')
						try {
							const reconnected = await reconnectClient()
							setClient(reconnected)
							setIsConnected(true)
							setConnectionStatus('ready')
							await loadChatsFromClient(reconnected)
						} catch (error) {
							logger.error('Reconnect failed', {error})
							setConnectionStatus('disconnected')
							setConnectionError(
								error instanceof Error ? error.message : 'Reconnect failed',
							)
						}
					} else {
						await loadChatsFromClient(client)
					}
					break
				case '4':
					if (client && activeChat) {
						setHistoryError(null)
						try {
							await hardenWWebJS(client)
							const chat = await client.getChatById(activeChat.id._serialized)
							if (!chat) {
								throw new Error(
									`chat not found for id ${activeChat.id._serialized}`,
								)
							}
							const messages = await chat.fetchMessages({
								limit: config.messageLimit || 15,
							})
							setRecentMessages(messages.map(toRecentMessage))
						} catch (error) {
							logger.error('Failed to refresh history', {
								chatId: activeChat.id._serialized,
								...serializeError(error),
							})
							setHistoryError(
								`Could not refresh: ${shortReason(error)} · Press [4]`,
							)
							const persistedChat = persistedChats.find(
								c => c.id === activeChat.id._serialized,
							)
							if (persistedChat && persistedChat.messages.length > 0) {
								setRecentMessages(
									persistedChat.messages
										.slice(-(config.messageLimit || 15))
										.map(m => ({
											id: m.id,
											sender: m.sender,
											message: m.message,
											time: m.time,
											fromMe: m.fromMe,
										})),
								)
							}
						}
					}
					break
				case '5':
					setAiEnabled(prev => !prev)
					break
				case '6':
					setCurrentView('settings')
					break
				case '7':
					setCurrentView('about')
					break
				case '8':
					await handleLogout()
					break
				case '0': {
					// Hidden diagnostics: reuses the shared probe suite (also
					// auto-run once on ready). Results go to the log file.
					if (!client || !isConnected) {
						setConnectionError('Not connected — cannot run diagnostics')
						break
					}
					setConnectionError('Running page diagnostics… see log file')
					try {
						await runPageDiagnostics(client)
						setConnectionError('Diagnostics done — paste latest log lines')
					} catch (error) {
						logger.error('Diagnostics failed', {...serializeError(error)})
						setConnectionError(
							`Diagnostics failed: ${shortReason(error)} · See log file`,
						)
					}
					break
				}
			}
		},
		[
			client,
			activeChat,
			config.messageLimit,
			persistedChats,
			isConnected,
			loadChatsFromClient,
			handleLogout,
			toRecentMessage,
			runPageDiagnostics,
			hardenWWebJS,
		],
	)

	const handleSelectChat = useCallback(
		(index: number) => {
			if (index >= 1 && index <= chats.length) {
				// Clear stale bubbles immediately so the previous chat's messages
				// never bleed into the newly selected chat while history loads.
				setRecentMessages([])
				setHistoryError(null)
				setActiveChat(chats[index - 1] || null)
				setCurrentView('chat')
			}
		},
		[chats],
	)

	return (
		<App
			initialChats={chats}
			isConnected={isConnected}
			aiEnabled={aiEnabled}
			aiProvider={config.aiProvider.provider}
			aiModel={config.aiProvider.model}
			recentMessages={recentMessages}
			onCommand={handleCommand}
			onSendMessage={handleSendMessage}
			onSendMedia={handleSendMedia}
			onSelectChat={handleSelectChat}
			onSearch={computeSearchMatches}
			onSearchNext={handleSearchNext}
			onSearchPrev={handleSearchPrev}
			activeChat={activeChat}
			qrCode={qrCodeString}
			currentView={currentView}
			connectionStatus={connectionStatus}
			historyError={historyError}
			connectionError={connectionError}
			reconnectAttempt={reconnectAttempt}
			reconnectMax={RECONNECT_MAX}
			searchQuery={searchQuery}
			searchMatchIndex={searchMatchIndex}
			searchMatchCount={searchMatchCount}
		/>
	)
}

async function cliEntry(): Promise<void> {
	const args = process.argv.slice(2)
	const parsedArgs = parseArgs(args)
	const packageInfo = await getPackageInfo()

	if (parsedArgs.help) {
		showHelp(packageInfo)
		process.exit(0)
	}

	if (parsedArgs.version) {
		showVersion(packageInfo)
		process.exit(0)
	}

	const config = await loadConfig()
	logger.updateConfig(config.logging)

	// Render inside the terminal's alternate screen buffer so oversized transient
	// frames (like the QR screen) never scroll the main buffer and leave artifacts.
	const ENTER_ALT_SCREEN = '\x1b[?1049h\x1b[2J\x1b[H'
	const LEAVE_ALT_SCREEN = '\x1b[?1049l'
	let screenRestored = false
	const restoreScreen = () => {
		if (screenRestored) return
		screenRestored = true
		process.stdout.write(LEAVE_ALT_SCREEN)
	}

	process.stdout.write(ENTER_ALT_SCREEN)
	process.on('exit', restoreScreen)
	process.on('SIGINT', () => {
		restoreScreen()
		process.exit(0)
	})
	process.on('SIGTERM', () => {
		restoreScreen()
		process.exit(0)
	})

	const {waitUntilExit} = render(<WhatsAppCLI />)

	try {
		await waitUntilExit()
	} finally {
		restoreScreen()
	}
}

cliEntry().catch(error => {
	process.stdout.write('\x1b[?1049l')
	console.error(`Fatal error: ${error}`)
	process.exit(1)
})
