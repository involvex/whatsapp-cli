import {Box, Text, useInput} from 'ink'
import React, {useCallback, useRef, useState} from 'react'
import {
	getAvailableModels,
	getConfig,
	resetConfig,
	saveConfig,
	type CliConfig,
} from '../config'
import {useTheme} from '../theme'

interface SettingsProps {
	onBack?: () => void
}

type SettingField =
	| 'theme'
	| 'messageLimit'
	| 'autoReconnect'
	| 'soundEnabled'
	| 'chatHistoryEnabled'
	| 'aiProvider'
	| 'aiModel'
	| 'aiApiKey'
	| 'temperature'
	| 'maxTokens'

const EDITABLE_FIELDS: SettingField[] = [
	'theme',
	'messageLimit',
	'autoReconnect',
	'soundEnabled',
	'chatHistoryEnabled',
	'aiProvider',
	'aiModel',
	'aiApiKey',
	'temperature',
	'maxTokens',
]

const THEME_OPTIONS = ['matrix', 'default', 'dark', 'colorful'] as const
const AI_PROVIDERS = ['none', 'openrouter', 'openai', 'gemini'] as const

export const Settings: React.FC<SettingsProps> = ({onBack}) => {
	const theme = useTheme()
	const config = getConfig()
	const [cursor, setCursor] = useState(0)
	const [editing, setEditing] = useState<SettingField | null>(null)
	const [editValue, setEditValue] = useState('')
	const [status, setStatus] = useState('')
	const configRef = useRef(config)
	configRef.current = config

	const safeCursor = Math.min(cursor, EDITABLE_FIELDS.length - 1)
	const currentField: SettingField = EDITABLE_FIELDS[safeCursor]!
	const models = getAvailableModels(config.aiProvider.provider)

	const persist = useCallback((patch: Partial<CliConfig>) => {
		const next = {...configRef.current, ...patch}
		saveConfig(next)
		setStatus('Saved')
		setTimeout(() => setStatus(''), 1500)
	}, [])

	useInput((input, key) => {
		if (editing) {
			if (key.escape) {
				setEditing(null)
				setEditValue('')
				setStatus('')
				return
			}
			if (key.return) {
				if (editing === 'theme') {
					const idx = THEME_OPTIONS.indexOf(
						editValue as (typeof THEME_OPTIONS)[number],
					)
					if (idx >= 0) {
						persist({theme: THEME_OPTIONS[idx]})
					}
				} else if (
					editing === 'autoReconnect' ||
					editing === 'soundEnabled' ||
					editing === 'chatHistoryEnabled'
				) {
					persist({
						[editing]:
							editValue === 'on' || editValue === 'true' || editValue === '1',
					})
				} else if (editing === 'messageLimit' || editing === 'maxTokens') {
					const num = parseInt(editValue, 10)
					if (!isNaN(num) && num > 0) {
						persist({[editing]: num})
					}
				} else if (editing === 'temperature') {
					const num = parseFloat(editValue)
					if (!isNaN(num) && num >= 0 && num <= 1) {
						persist({aiProvider: {...config.aiProvider, temperature: num}})
					}
				} else if (editing === 'aiProvider') {
					if (
						AI_PROVIDERS.includes(editValue as (typeof AI_PROVIDERS)[number])
					) {
						const provider = editValue as (typeof AI_PROVIDERS)[number]
						persist({
							aiProvider: {
								...config.aiProvider,
								provider,
								model: getAvailableModels(provider)[0] || 'auto',
							},
						})
					}
				} else if (editing === 'aiModel') {
					if (models.includes(editValue)) {
						persist({aiProvider: {...config.aiProvider, model: editValue}})
					}
				} else if (editing === 'aiApiKey') {
					persist({aiProvider: {...config.aiProvider, apiKey: editValue}})
				}
				setEditing(null)
				setEditValue('')
				setStatus('')
				return
			}
			if (key.backspace || key.delete) {
				setEditValue(prev => prev.slice(0, -1))
				return
			}
			if (input && input.length === 1) {
				setEditValue(prev => prev + input)
			}
			return
		}

		if (key.upArrow) {
			setCursor(prev => (prev <= 0 ? EDITABLE_FIELDS.length - 1 : prev - 1))
			setStatus('')
			return
		}
		if (key.downArrow) {
			setCursor(prev => (prev >= EDITABLE_FIELDS.length - 1 ? 0 : prev + 1))
			setStatus('')
			return
		}
		if (key.return) {
			setEditing(currentField)
			setEditValue(getCurrentValue(currentField))
			setStatus('Editing...')
			return
		}
		if (input === 'r' || input === 'R') {
			resetConfig()
			setStatus('Reset to defaults')
			setTimeout(() => setStatus(''), 1500)
			return
		}
		if (input === 'q' || input === '9' || input === '0') {
			onBack?.()
			return
		}
	})

	const getCurrentValue = (field: SettingField): string => {
		switch (field) {
			case 'theme':
				return config.theme
			case 'messageLimit':
				return String(config.messageLimit)
			case 'autoReconnect':
				return config.autoReconnect ? 'on' : 'off'
			case 'soundEnabled':
				return config.soundEnabled ? 'on' : 'off'
			case 'chatHistoryEnabled':
				return config.chatHistoryEnabled ? 'on' : 'off'
			case 'aiProvider':
				return config.aiProvider.provider
			case 'aiModel':
				return config.aiProvider.model
			case 'aiApiKey':
				return config.aiProvider.apiKey || ''
			case 'temperature':
				return String(config.aiProvider.temperature)
			case 'maxTokens':
				return String(config.aiProvider.maxTokens)
		}
	}

	const maskApiKey = (value: string): string => {
		if (!value) return ''
		if (value.length <= 4) return '****'
		return '*'.repeat(value.length - 4) + value.slice(-4)
	}

	const renderValue = (field: SettingField): string => {
		if (editing === field) {
			if (field === 'aiApiKey') {
				return maskApiKey(editValue) || '_'
			}
			return editValue || '_'
		}
		switch (field) {
			case 'theme':
				return config.theme
			case 'messageLimit':
				return String(config.messageLimit)
			case 'autoReconnect':
				return config.autoReconnect ? 'On' : 'Off'
			case 'soundEnabled':
				return config.soundEnabled ? 'On' : 'Off'
			case 'chatHistoryEnabled':
				return config.chatHistoryEnabled ? 'On' : 'Off'
			case 'aiProvider':
				return config.aiProvider.provider
			case 'aiModel':
				return config.aiProvider.model
			case 'aiApiKey':
				return config.aiProvider.apiKey
					? maskApiKey(config.aiProvider.apiKey)
					: '(empty)'
			case 'temperature':
				return String(config.aiProvider.temperature)
			case 'maxTokens':
				return String(config.aiProvider.maxTokens)
		}
	}

	const renderRow = (field: SettingField, index: number) => {
		const isCursor = index === cursor && !editing
		const isEditing = editing === field
		const label = field
			.replace(/([A-Z])/g, ' $1')
			.replace(/^./, str => str.toUpperCase())
		const value = renderValue(field)
		const valueColor = isEditing
			? theme.accent
			: isCursor
				? theme.primary
				: theme.muted

		return (
			<Box
				key={field}
				paddingX={1}
			>
				<Text
					color={isCursor ? theme.accent : theme.muted}
					bold={isCursor}
				>
					{isCursor ? '>' : ' '}
				</Text>
				<Box width={22}>
					<Text
						color={isCursor ? theme.primary : theme.muted}
						bold={isCursor}
					>
						{label}
					</Text>
				</Box>
				<Text
					bold
					color={valueColor}
				>
					{isEditing ? `${value} ` : value}
				</Text>
				{isEditing && <Text color={theme.accent}>█</Text>}
			</Box>
		)
	}

	return (
		<Box
			flexDirection="column"
			flexGrow={1}
			height={20}
			paddingX={1}
			borderStyle="single"
			borderColor={theme.border}
			overflow="hidden"
		>
			<Text
				bold
				color={theme.header}
			>
				SETTINGS
			</Text>
			<Text color={theme.muted}>↑↓ navigate · ↵ edit · R reset · Q back</Text>
			<Box
				marginTop={1}
				flexDirection="column"
				flexGrow={1}
				overflow="hidden"
			>
				{EDITABLE_FIELDS.map((field, index) => renderRow(field, index))}
			</Box>
			{status && <Text color={theme.accent}>{status}</Text>}
			<Text color={theme.muted}>
				Provider: {config.aiProvider.provider} · Model:{' '}
				{config.aiProvider.model}
			</Text>
		</Box>
	)
}
