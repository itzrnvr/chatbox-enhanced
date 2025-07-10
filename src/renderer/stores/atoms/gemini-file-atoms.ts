import { atom } from 'jotai'

export interface AttachedFile {
  name: string
  status: 'uploading' | 'ready'
  uri?: string
}

export const attachedFilesAtom = atom<AttachedFile[]>([])