import type { Metadata, Viewport } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const noto = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto',
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'my coordy♡ — あなたのクローゼットを知るAI',
  description: '毎朝30秒でTPO・天気・気分に最適なコーデを提案するAIスタイリストアプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'WARE',
  },
}

export const viewport: Viewport = {
  themeColor: '#1c1917',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full bg-stone-50 font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
