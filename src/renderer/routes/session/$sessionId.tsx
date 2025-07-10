import NiceModal from '@ebay/nice-modal-react'
import ArrowCircleDownIcon from '@mui/icons-material/ArrowCircleDown'
import ArrowCircleUpIcon from '@mui/icons-material/ArrowCircleUp'
import { Box, ButtonGroup, IconButton } from '@mui/material'
import { createFileRoute } from '@tanstack/react-router'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { createMessage, MessageFilePart, ModelProvider, ModelProviderEnum, ProviderSettings } from 'src/shared/types'
import Header from '@/components/Header'
import InputBoxNew from '@/components/InputBox'
import MessageList from '@/components/MessageList'
import ThreadHistoryDrawer from '@/components/ThreadHistoryDrawer'
import Gemeni from '@/packages/models/gemini'
import { getDefaultStore } from 'jotai'
import * as atoms from '@/stores/atoms' // Re-add this import
import { settingsAtom } from '@/stores/atoms/settingsAtoms'
import * as scrollActions from '@/stores/scrollActions'
import * as sessionActions from '@/stores/sessionActions'
import { saveSession } from '@/stores/sessionStorageMutations'

export const Route = createFileRoute('/session/$sessionId')({
  component: RouteComponent,
})

function RouteComponent() {
  const { sessionId: currentSessionId } = Route.useParams()
  const currentSession = useAtomValue(atoms.currentSessionAtom)
  const setChatSessionSettings = useSetAtom(atoms.chatSessionSettingsAtom)
  const setPictureSessionSettings = useSetAtom(atoms.pictureSessionSettingsAtom)
  const lastMessage = currentSession?.messages.length
    ? currentSession.messages[currentSession.messages.length - 1]
    : null

  useEffect(() => {
    setTimeout(() => {
      scrollActions.scrollToBottom('auto') // 每次启动时自动滚动到底部
    }, 200)
  }, [])

  // currentSession变化时（包括session settings变化），存下当前的settings作为新Session的默认值
  useEffect(() => {
    if (currentSession) {
      if (currentSession.type === 'chat' && currentSession.settings) {
        const { provider, modelId } = currentSession.settings
        setChatSessionSettings({ provider, modelId })
      }
      if (currentSession.type === 'picture' && currentSession.settings) {
        const { provider, modelId } = currentSession.settings
        setPictureSessionSettings({ provider, modelId })
      }
    }
  }, [currentSession?.settings])

  return currentSession ? (
    <div className="flex flex-col h-full">
      <Header />

      {/* MessageList 设置 key，确保每个 session 对应新的 MessageList 实例 */}
      <MessageList key={`message-list${currentSessionId}`} currentSession={currentSession} />

      <ScrollButtons />
      <InputBoxNew
        key={`input-box${currentSession.id}`}
        sessionId={currentSession.id}
        sessionType={currentSession.type}
        model={
          currentSession.settings?.provider && currentSession.settings?.modelId
            ? {
                provider: currentSession.settings.provider,
                modelId: currentSession.settings.modelId,
              }
            : undefined
        }
        onStartNewThread={() => {
          sessionActions.startNewThread()
          return true
        }}
        onRollbackThread={() => {
          sessionActions.removeCurrentThread(currentSessionId)
          return true
        }}
        onSelectModel={(provider: ModelProvider, modelId: string) => {
          if (!currentSession) {
            return
          }
          saveSession({
            id: currentSession.id,
            settings: {
              ...(currentSession.settings || {}),
              provider,
              modelId,
            },
          })
        }}
        onClickSessionSettings={() => {
          if (!currentSession) {
            return false
          }
          NiceModal.show('session-settings', {
            session: currentSession,
          })
          return true
        }}
        generating={lastMessage?.generating}
        onSubmit={async ({
          needGenerating = true,
          input = '',
          pictureKeys = [],
          attachments = [],
          links = [],
          webBrowsing = false,
        }) => {
          const newMessage = createMessage('user', input)
          if (pictureKeys?.length) {
            newMessage.contentParts = newMessage.contentParts ?? []
            newMessage.contentParts.push(...pictureKeys.map((k) => ({ type: 'image' as const, storageKey: k })))
          }

          // Handle file uploads for Gemini model
          if (attachments.length > 0 && currentSession?.settings?.provider === ModelProviderEnum.Gemini) {
            const store = getDefaultStore()
            const currentSettings = store.get(settingsAtom)
            const geminiProviderSettings: ProviderSettings | undefined = currentSettings.providers?.[ModelProviderEnum.Gemini]

/*
DEVELOPMENT RULE:
If you encounter a "Gemini API Key or Host is not configured" error, check for missing properties in provider settings.
This is often caused by shallow merging of user settings with provider defaults, resulting in missing fields (e.g., apiHost).
Always deep-merge provider settings with defaults in the settings atom to prevent this class of bug for all providers.
See fix in src/renderer/stores/atoms/settingsAtoms.ts.
*/
            if (!geminiProviderSettings?.apiKey || !geminiProviderSettings?.apiHost) {
              throw new Error('Gemini API Key or Host is not configured.')
            }

            const geminiModel = new Gemeni({
              geminiAPIKey: geminiProviderSettings.apiKey,
              geminiAPIHost: geminiProviderSettings.apiHost,
              model: currentSession.settings.modelId as any, // TODO: Fix type
              temperature: currentSession.settings.temperature || 0.5,
            })

            const uploadedFileParts: MessageFilePart[] = await Promise.all(
              attachments.map(async (file) => {
                const uri = await geminiModel.uploadFile(file)
                return { type: 'file', file, mimeType: file.type, uri }
              })
            )
            newMessage.contentParts = newMessage.contentParts ?? []
            newMessage.contentParts.push(...uploadedFileParts)
          }

          sessionActions.submitNewUserMessage({
            currentSessionId: currentSessionId,
            newUserMsg: newMessage,
            needGenerating,
            attachments, // Keep attachments for now, might be needed for other providers or local processing
            links,
            webBrowsing,
          })
          return true
        }}
        onStopGenerating={() => {
          if (!currentSession) {
            return false
          }
          if (lastMessage?.generating) {
            lastMessage?.cancel?.()
            sessionActions.modifyMessage(currentSession.id, { ...lastMessage, generating: false }, true)
          }
          return true
        }}
      />
      {/* <InputBox /> */}
      <ThreadHistoryDrawer />
    </div>
  ) : null
}

function ScrollButtons() {
  const atScrollTop = useAtomValue(atoms.messageScrollingAtTopAtom)
  const atScrollBottom = useAtomValue(atoms.messageScrollingAtBottomAtom)
  const language = useAtomValue(atoms.languageAtom)
  return (
    <Box className="relative">
      <ButtonGroup
        sx={
          language === 'ar'
            ? {
                position: 'absolute',
                left: '0.4rem',
                top: '-5.5rem',
                opacity: 0.6,
              }
            : {
                position: 'absolute',
                right: '0.4rem',
                top: '-5.5rem',
                opacity: 0.6,
              }
        }
        orientation="vertical"
      >
        <IconButton
          onClick={() => scrollActions.scrollToTop()}
          sx={{
            visibility: atScrollTop ? 'hidden' : 'visible',
          }}
        >
          <ArrowCircleUpIcon />
        </IconButton>
        <IconButton
          onClick={() => scrollActions.scrollToBottom()}
          sx={{
            visibility: atScrollBottom ? 'hidden' : 'visible',
          }}
        >
          <ArrowCircleDownIcon />
        </IconButton>
      </ButtonGroup>
    </Box>
  )
}
