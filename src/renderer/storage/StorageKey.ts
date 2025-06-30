import { v4 as uuidv4 } from 'uuid';

export enum StorageKey {
  ChatSessions = 'chat-sessions',
  Configs = 'configs',
  Settings = 'settings',
  MyCopilots = 'myCopilots',
  ConfigVersion = 'configVersion',
  RemoteConfig = 'remoteConfig',
  ChatSessionsList = 'chat-sessions-list',
  ChatSessionSettings = 'chat-session-settings',
  PictureSessionSettings = 'picture-session-settings',
}

export const StorageKeyGenerator = {
  session(id: string) {
    return `session:${id}`;
  },
  picture(category: string) {
    return `picture:${category}:${uuidv4()}`;
  },
  file(sessionId: string, msgId: string) {
    return `file:${sessionId}:${msgId}:${uuidv4()}`;
  },
};