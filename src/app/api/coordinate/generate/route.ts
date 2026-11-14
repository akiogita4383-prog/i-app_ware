import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { readFile } from 'fs/promises'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const CATEGORY_LABELS: Record<string, string> = {
  tops:        'トップス',
  bottoms:     'ボトムス',
  dresses:     'ワンピース',
  outerwear:   'アウター',
  shoes:       '靴',
  bags:        'バッグ',
  accessories: 'アクセサリー',
}

interface ItemPayload {
  name:     string
  category: string
  imageUrl: string
}

async function localPathToFile(urlPath: string, filename: string): Promise<File | null> {
  const ext = urlPath.split('.').pop()?.toLowerCase() ?? ''
  // SVG は gpt-image-1 非対応のためスキップ
  if (!['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return null
  try {
    const absPath = path.join(process.cwd(), 'public', urlPath)
    const buf = await readFile(absPath)
    const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`
    return new File([buf], filename, { type: mime })
  } catch {
    return null
  }
}

async function remoteUrlToFile(url: string, filename: string): Promise<File | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? 'image/jpeg'
    const base = ct.split(';')[0].trim()
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(base)) return null
    const buf = await res.arrayBuffer()
    const ext = base === 'image/jpeg' ? 'jpg' : base.split('/')[1]
    return new File([buf], filename.includes('.') ? filename : `${filename}.${ext}`, { type: base })
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { selectedItems }: { selectedItems: ItemPayload[] } = await req.json()

    if (selectedItems.length === 0) {
      return NextResponse.json({ error: 'アイテムが選択されていません' }, { status: 400 })
    }

    // ── プロンプト構築 ───────────────────────────────────────────
    const outfitDesc = selectedItems
      .map((i) => `${CATEGORY_LABELS[i.category] ?? i.category}「${i.name}」`)
      .join('、')

    const prompt = [
      'ファッションイラスト。かわいいアニメ調の女性モデルが全身写っている。',
      `コーディネート: ${outfitDesc}。`,
      '白またはクリーム色のシンプルな背景。洋服の色・デザイン・シルエットを忠実に再現してください。',
      '高品質、ファッション誌風。縦長構図。',
    ].join('')

    // ── 画像ファイル収集 ─────────────────────────────────────────
    const modelFile = await localPathToFile('/assets/model-base.png', 'model.png')

    const clothingFiles: File[] = []
    for (const item of selectedItems) {
      const url = item.imageUrl
      let file: File | null = null
      if (url.startsWith('/uploads/') || url.startsWith('/assets/')) {
        file = await localPathToFile(url, `${item.category}.${url.split('.').pop()}`)
      } else if (url.startsWith('https://') || url.startsWith('http://')) {
        file = await remoteUrlToFile(url, item.category)
      }
      if (file) clothingFiles.push(file)
    }

    // ── gpt-image-1 で生成 ────────────────────────────────────────
    let result

    if (modelFile) {
      // モデル画像 + 衣服画像を渡してリアルな着せ替えを生成
      result = await openai.images.edit({
        model:  'gpt-image-1',
        image:  [modelFile, ...clothingFiles],
        prompt,
        size:   '1024x1536',
      })
    } else {
      result = await openai.images.generate({
        model:  'gpt-image-1',
        prompt,
        size:   '1024x1536',
      })
    }

    const b64 = result.data?.[0]?.b64_json
    if (!b64) throw new Error('画像データが返却されませんでした')

    return NextResponse.json({ image: b64 })
  } catch (err) {
    console.error('[coordinate/generate]', err)
    const message = err instanceof Error ? err.message : '生成に失敗しました'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
