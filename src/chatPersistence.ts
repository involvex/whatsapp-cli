import {promises as fs} from 'fs'
import path from 'path'
import {PATHS} from './config'

export interface PersistedMessage {
	id: string
	sender: string
	message: string
	time: string
	fromMe: boolean
	timestamp: number
	mediaType?: string
	mimeType?: string
	mediaSize?: number
	hasMedia?: boolean
}

export interface PersistedChat {
	id: string
	name: string
	lastMessage: string
	timestamp: number
	unreadCount: number
	messages: PersistedMessage[]
}

interface ChatHistoryData {
	chats: PersistedChat[]
	lastSync: number
}

async function ensureChatHistoryDir(): Promise<void> {
	const dir = path.dirname(PATHS.chatHistory)
	await fs.mkdir(dir, {recursive: true}).catch(() => {
		/* ignore */
	})
}

export async function loadChatHistory(): Promise<PersistedChat[]> {
	try {
		await ensureChatHistoryDir()
		const data = await fs.readFile(PATHS.chatHistory, 'utf-8')
		const parsed: ChatHistoryData = JSON.parse(data)
		return parsed.chats
	} catch {
		return []
	}
}

export async function saveChatHistory(chats: PersistedChat[]): Promise<void> {
	try {
		await ensureChatHistoryDir()
		const data: ChatHistoryData = {
			chats,
			lastSync: Date.now(),
		}
		await fs.writeFile(PATHS.chatHistory, JSON.stringify(data, null, 2))
	} catch (error) {
		console.error('Failed to save chat history:', error)
	}
}

export function messageToPersisted(
	msg: import('whatsapp-web.js').Message,
): PersistedMessage {
	const hasMedia = msg.hasMedia
	const mediaType = hasMedia ? msg.type : undefined
	const mediaMsg = msg as import('whatsapp-web.js').Message & {
		media?: {mimetype?: string; filesize?: number}
	}
	const mimeType = hasMedia ? mediaMsg.media?.mimetype : undefined
	const mediaSize = hasMedia ? mediaMsg.media?.filesize : undefined
	return {
		id: msg.id._serialized,
		sender: msg.from?.split('@')[0] || (msg.id.fromMe ? 'Me' : 'Unknown'),
		message:
			msg.body || (hasMedia ? `[${mediaType || 'Media'}]` : '[Media/Sticker]'),
		time: new Date(msg.timestamp * 1000).toLocaleTimeString(),
		fromMe: msg.id.fromMe,
		timestamp: msg.timestamp,
		mediaType,
		mimeType,
		mediaSize,
		hasMedia,
	}
}

export function chatToPersistedChat(
	chat: import('whatsapp-web.js').Chat,
): PersistedChat {
	return {
		id: chat.id._serialized,
		name: chat.name,
		lastMessage: chat.lastMessage?.body || '',
		timestamp: chat.timestamp || 0,
		unreadCount: chat.unreadCount || 0,
		messages: [],
	}
}
