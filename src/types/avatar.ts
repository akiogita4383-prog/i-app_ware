export type BodyType = 'スリム' | 'ノーマル' | 'マッスル'
export type HairStyle = 'ショート' | 'ミディアム' | 'ロング' | 'ポニーテール' | 'ボブ'
export type HairColor = 'ブラック' | 'ブラウン' | 'ブロンド' | 'ピンク' | 'ブルー' | 'グレー'
export type SkinTone = '明るい' | '自然' | '健康的' | '日焼け'

export interface AvatarConfig {
  height: number
  bodyType: BodyType
  hairStyle: HairStyle
  hairColor: HairColor
  skinTone: SkinTone
}
