import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface LikedCoordinate {
  id: string
  imageDataUrl: string
  savedAt: string
  label?: string
}

interface LikedCoordinatesState {
  coordinates: LikedCoordinate[]
  add: (imageDataUrl: string, label?: string) => void
  remove: (id: string) => void
}

export const useLikedCoordinates = create<LikedCoordinatesState>()(
  persist(
    (set) => ({
      coordinates: [],
      add: (imageDataUrl, label) =>
        set((state) => ({
          coordinates: [
            {
              id: `liked-${Date.now()}`,
              imageDataUrl,
              savedAt: new Date().toISOString(),
              label,
            },
            ...state.coordinates,
          ],
        })),
      remove: (id) =>
        set((state) => ({
          coordinates: state.coordinates.filter((c) => c.id !== id),
        })),
    }),
    { name: 'ware-liked-coordinates' }
  )
)
