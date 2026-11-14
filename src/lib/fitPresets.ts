import type { ClosetCategory, FitPreset } from './closetTypes'

/**
 * カテゴリごとのデフォルト配置プリセット。
 * x / y はアバター表示エリア内の中心位置（%）、
 * width はエリア幅に対するパーセント。
 * model-base.png のポーズに合わせて調整してください。
 */
export const categoryFitPresets: Record<ClosetCategory, FitPreset> = {
  tops:        { x: 50, y: 33, width: 38, rotation: 0, zIndex: 30 },
  bottoms:     { x: 50, y: 53, width: 36, rotation: 0, zIndex: 25 },
  dresses:     { x: 50, y: 42, width: 42, rotation: 0, zIndex: 35 },
  outerwear:   { x: 50, y: 31, width: 45, rotation: 0, zIndex: 40 },
  shoes:       { x: 50, y: 88, width: 28, rotation: 0, zIndex: 45 },
  bags:        { x: 67, y: 62, width: 22, rotation: 0, zIndex: 50 },
  accessories: { x: 50, y: 22, width: 16, rotation: 0, zIndex: 55 },
}

/** zIndex 昇順（下レイヤーから描画） */
export const LAYER_ORDER: ClosetCategory[] = [
  'bottoms',
  'dresses',
  'tops',
  'outerwear',
  'shoes',
  'bags',
  'accessories',
]
