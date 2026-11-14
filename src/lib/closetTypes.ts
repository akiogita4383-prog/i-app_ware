export type ClosetCategory =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'shoes'
  | 'bags'
  | 'accessories'

export interface FitPreset {
  x: number        // アバターエリア内の中心X（%）
  y: number        // アバターエリア内の中心Y（%）
  width: number    // アバターエリア幅に対する表示幅（%）
  rotation: number // 回転角度（deg）
  zIndex: number
}

export interface ClosetItem {
  id: string
  name: string
  category: ClosetCategory
  imageUrl: string
  thumbnailUrl?: string
  fit?: FitPreset   // 保存済み個別フィット（なければカテゴリプリセットを使用）
}

export type SelectedItems = Partial<Record<ClosetCategory, ClosetItem>>
