'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { AiAnalysisResult, Category } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import api from '@/lib/api'
import toast from 'react-hot-toast'

const categoryOptions = [
  { value: 'tops',        label: 'トップス' },
  { value: 'bottoms',     label: 'ボトムス' },
  { value: 'outer',       label: 'アウター' },
  { value: 'shoes',       label: 'シューズ' },
  { value: 'accessories', label: 'アクセサリー' },
  { value: 'other',       label: 'その他' },
]

interface AnalysisItem extends AiAnalysisResult {
  tempImageUrl?: string
  previewUrl?: string
}

type Step = 'idle' | 'removing-bg' | 'analyzing'

interface ImageUploaderProps {
  onSuccess: (items: unknown[]) => void
  onCancel: () => void
}

export function ImageUploader({ onSuccess, onCancel }: ImageUploaderProps) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [previews, setPreviews]   = useState<string[]>([])
  const [files, setFiles]         = useState<File[]>([])
  const [step, setStep]           = useState<Step>('idle')
  const [results, setResults]     = useState<AnalysisItem[] | null>(null)
  const [saving, setSaving]       = useState(false)

  // Canvas でリサイズ（透過PNG対応）
  const resizeBlob = async (blob: Blob, maxDim = 1024): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = document.createElement('img')
      const url = URL.createObjectURL(blob)
      img.onload = () => {
        const scale  = Math.min(1, maxDim / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width  = img.width  * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')!
        ctx.clearRect(0, 0, canvas.width, canvas.height)   // 透過を維持
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        canvas.toBlob((b) => resolve(b!), 'image/png')     // 常にPNGで出力
      }
      img.src = url
    })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 5)
    if (!selected.length) return
    setPreviews(selected.map((f) => URL.createObjectURL(f)))
    setFiles(selected)
    setResults(null)
  }

  const handleAnalyze = async () => {
    if (!files.length) return

    // ── Step 1: 背景除去 ──────────────────────────────────────
    setStep('removing-bg')

    const processedBlobs: Blob[] = []
    const bgPreviews = [...previews]

    try {
      const { removeBackground } = await import('@imgly/background-removal')

      for (let i = 0; i < files.length; i++) {
        try {
          const result = await removeBackground(files[i])
          processedBlobs.push(result)
          bgPreviews[i] = URL.createObjectURL(result)
        } catch {
          // 除去失敗時は元画像をそのまま使う
          processedBlobs.push(files[i])
        }
      }
      setPreviews(bgPreviews)
    } catch {
      // ライブラリ読み込み失敗時は全て元画像
      files.forEach((f) => processedBlobs.push(f))
    }

    // ── Step 2: AI解析 ───────────────────────────────────────
    setStep('analyzing')

    try {
      const formData = new FormData()
      for (let i = 0; i < processedBlobs.length; i++) {
        const resized = await resizeBlob(processedBlobs[i])
        formData.append('images', new File([resized], `item-${i}.png`, { type: 'image/png' }))
      }

      const res = await api.post('/items/analyze', formData)

      const items: AnalysisItem[] = res.data.data.map(
        (r: AiAnalysisResult & { tempImageUrl?: string }, i: number) => ({
          ...r,
          previewUrl: bgPreviews[i],
        })
      )
      setResults(items)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        .response?.data?.error ?? '解析に失敗しました'
      toast.error(msg)
    } finally {
      setStep('idle')
    }
  }

  const updateResult = (index: number, field: string, value: unknown) => {
    setResults((prev) =>
      prev ? prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)) : prev
    )
  }

  const handleSave = async () => {
    if (!results) return
    setSaving(true)
    try {
      const payload = results.map((r) => ({
        category:      r.category,
        name:          r.name,
        color:         r.color,
        material:      r.material,
        silhouette:    r.silhouette,
        tags:          r.tags,
        aiConfidence:  r.confidence,
        tempImageUrl:  r.tempImageUrl,
      }))
      const res = await api.post('/items/confirm', payload)
      onSuccess(res.data.data)
      toast.success(`${res.data.data.length}点追加しました`)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })
        .response?.data?.error ?? '保存に失敗しました'
      toast.error(msg)
    } finally {
      setSaving(false)
    }
  }

  const isProcessing = step !== 'idle'

  return (
    <div className="space-y-5">
      {!results && (
        <>
          {/* ドロップゾーン */}
          <div
            onClick={() => !isProcessing && fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
              isProcessing
                ? 'border-stone-200 cursor-not-allowed'
                : 'border-stone-200 cursor-pointer hover:border-stone-400'
            }`}
          >
            {previews.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((url, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-xl overflow-hidden bg-[url('/assets/checker.svg')] bg-[length:12px_12px]"
                  >
                    <Image src={url} alt="" fill className="object-contain" unoptimized />
                    {/* 背景除去中：個別インジケーター */}
                    {step === 'removing-bg' && (
                      <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                        <svg className="w-5 h-5 animate-spin text-pink-400" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-stone-400">
                <svg className="w-12 h-12 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-medium">写真を選択</p>
                <p className="text-xs mt-1">最大5枚・10MB以下</p>
              </div>
            )}
          </div>

          {/* ステータスメッセージ */}
          {step === 'removing-bg' && (
            <p className="text-center text-sm text-pink-500 font-medium animate-pulse">
              ✨ 背景を除去しています…
            </p>
          )}
          {step === 'analyzing' && (
            <p className="text-center text-sm text-stone-500 font-medium animate-pulse">
              🤖 AIで解析しています…
            </p>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={onCancel} disabled={isProcessing}>
              キャンセル
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleAnalyze}
              disabled={!files.length || isProcessing}
              loading={isProcessing}
            >
              {step === 'removing-bg'
                ? '背景を除去中...'
                : step === 'analyzing'
                  ? 'AI解析中...'
                  : 'AIで解析'}
            </Button>
          </div>
        </>
      )}

      {/* 解析結果 */}
      {results && (
        <div className="space-y-6">
          {results.map((result, i) => (
            <div key={i} className="border border-stone-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                {result.previewUrl && (
                  <div className="relative w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-stone-50 border border-stone-100">
                    <Image src={result.previewUrl} alt="" fill className="object-contain" unoptimized />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-900">アイテム {i + 1}</span>
                    {result.confidence < 70 && (
                      <Badge variant="warning">精度低め・要確認</Badge>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 mt-0.5">信頼度 {result.confidence}%</p>
                </div>
              </div>

              <Select
                label="カテゴリ"
                options={categoryOptions}
                value={result.category}
                onChange={(e) => updateResult(i, 'category', e.target.value)}
              />
              <Input
                label="アイテム名"
                value={result.name}
                onChange={(e) => updateResult(i, 'name', e.target.value)}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="色"
                  value={result.color}
                  onChange={(e) => updateResult(i, 'color', e.target.value)}
                />
                <Input
                  label="素材"
                  value={result.material}
                  onChange={(e) => updateResult(i, 'material', e.target.value)}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-3">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setResults(null)}>
              やり直す
            </Button>
            <Button type="button" className="flex-1" onClick={handleSave} loading={saving}>
              クローゼットに追加
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
