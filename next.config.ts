import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
      },
      // Yahoo! Shopping 商品画像 (item-shopping.c.yimg.jp など)
      {
        protocol: 'https',
        hostname: '*.yimg.jp',
      },
      {
        protocol: 'https',
        hostname: '*.c.yimg.jp',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
}

export default nextConfig
