'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AvatarConfig, BodyType, HairColor, HairStyle, SkinTone } from '@/types/avatar'

export interface AvatarOption {
  id: string
  label: string
  src: string
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'default',  label: 'デフォルト',   src: '/assets/avatars/avatar-default.png' },
  { id: 'dark',     label: 'ダークヘア',   src: '/assets/avatars/avatar-dark.png' },
  { id: 'straight', label: 'ストレート',   src: '/assets/avatars/avatar-straight.png' },
  { id: 'bob',      label: 'ボブ',         src: '/assets/avatars/avatar-bob.png' },
]

const defaultConfig: AvatarConfig = {
  height: 165,
  bodyType: 'ノーマル',
  hairStyle: 'ミディアム',
  hairColor: 'ブラック',
  skinTone: '自然',
}

interface AvatarState {
  config: AvatarConfig
  avatarId: string
  setConfig: (config: AvatarConfig) => void
  updateField: <K extends keyof AvatarConfig>(field: K, value: AvatarConfig[K]) => void
  resetConfig: () => void
  setAvatarId: (id: string) => void
}

export const useAvatarStore = create<AvatarState>()(
  persist(
    (set) => ({
      config: defaultConfig,
      avatarId: 'default',
      setConfig: (config) => set({ config }),
      updateField: (field, value) => set((state) => ({ config: { ...state.config, [field]: value } })),
      resetConfig: () => set({ config: defaultConfig }),
      setAvatarId: (id) => set({ avatarId: id }),
    }),
    {
      name: 'fitme-avatar',
      partialize: (state) => ({ config: state.config, avatarId: state.avatarId }),
    }
  )
)
