'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SettingsState {
  dateOfBirth: string
  yahooId: string
  yahooPassword: string
  personalColors: string[]
  setDateOfBirth: (v: string) => void
  setYahooId: (v: string) => void
  setYahooPassword: (v: string) => void
  setPersonalColors: (colors: string[]) => void
  togglePersonalColor: (colorId: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      dateOfBirth: '',
      yahooId: '',
      yahooPassword: '',
      personalColors: [],
      setDateOfBirth: (v) => set({ dateOfBirth: v }),
      setYahooId: (v) => set({ yahooId: v }),
      setYahooPassword: (v) => set({ yahooPassword: v }),
      setPersonalColors: (colors) => set({ personalColors: colors }),
      togglePersonalColor: (colorId) =>
        set((state) => ({
          personalColors: state.personalColors.includes(colorId)
            ? state.personalColors.filter((c) => c !== colorId)
            : [...state.personalColors, colorId],
        })),
    }),
    {
      name: 'ware-settings',
      partialize: (state) => ({
        dateOfBirth: state.dateOfBirth,
        yahooId: state.yahooId,
        yahooPassword: state.yahooPassword,
        personalColors: state.personalColors,
      }),
    }
  )
)
