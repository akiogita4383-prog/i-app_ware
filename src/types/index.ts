export type Category = 'tops' | 'bottoms' | 'outer' | 'shoes' | 'accessories' | 'other'
export type OutfitStatus = 'adopted' | 'skipped' | 'draft'
export type Weather = '晴れ' | '曇り' | '雨' | '雪'
export type Temperature = '〜10℃' | '10〜16℃' | '16〜22℃' | '22〜27℃' | '27℃〜'
export type Schedule = 'オフィス' | 'カジュアル打合せ' | '重要商談' | 'ランチ' | 'デート' | '休日' | '在宅'
export type Mood = 'きれいめ' | 'カジュアル' | 'ミニマル' | 'トレンド' | 'ラク' | 'モード'

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface ClothingItem {
  id: string
  userId: string
  category: Category
  name: string
  color: string
  material?: string
  silhouette?: string
  tags: string[]
  imageUrl?: string
  thumbnailUrl?: string
  aiConfidence?: number
  wornCount: number
  lastWornAt?: string
  memo?: string
  createdAt: string
  updatedAt: string
}

export interface OutfitContext {
  weather: Weather
  temperature: Temperature
  schedule: Schedule
  mood: Mood
}

export interface OutfitItem {
  itemId: string
  category: string
  name: string
  reason: string
}

export interface OutfitHistory {
  id: string
  userId: string
  date: string
  context: OutfitContext
  itemIds: string[]
  itemReasons: Record<string, string>
  aiTitle?: string
  aiTips?: string
  aiTags: string[]
  status: OutfitStatus
  rating?: number
  ratingNote?: string
  wornAt?: string
  createdAt: string
  items?: ClothingItem[]
}

export interface AiAnalysisResult {
  category: Category
  name: string
  color: string
  material: string
  silhouette: string
  tags: string[]
  confidence: number
}

export interface OutfitGenerationResult {
  title: string
  outfit: OutfitItem[]
  tips: string
  tags: string[]
}

export interface WeeklyStats {
  wornDays: number
  topCategory: string | null
  utilizationRate: number
  avgRating: number | null
  weekStart: string
  weekEnd: string
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  user: User
}
