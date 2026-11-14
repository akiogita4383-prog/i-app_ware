import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken, getRefreshTokenExpiry } from '@/lib/jwt'
import { apiError } from '@/lib/utils'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!)
    authUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google`)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'email profile')
    return NextResponse.redirect(authUrl.toString())
  }

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google`,
        grant_type: 'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()

    const userRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const googleUser = await userRes.json()

    let user = await prisma.user.findUnique({ where: { googleId: googleUser.id } })
    if (!user) {
      user = await prisma.user.findUnique({ where: { email: googleUser.email } })
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: googleUser.id },
        })
      } else {
        user = await prisma.user.create({
          data: {
            email: googleUser.email,
            name: googleUser.name,
            googleId: googleUser.id,
          },
        })
      }
    }

    const payload = { userId: user.id, email: user.email }
    const accessToken = signAccessToken(payload)
    const refreshToken = signRefreshToken(payload)

    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: getRefreshTokenExpiry() },
    })

    const redirectUrl = new URL('/auth/callback', process.env.NEXT_PUBLIC_APP_URL)
    redirectUrl.searchParams.set('accessToken', accessToken)
    redirectUrl.searchParams.set('refreshToken', refreshToken)
    return NextResponse.redirect(redirectUrl.toString())
  } catch (e) {
    console.error(e)
    return apiError('Google認証に失敗しました', 500)
  }
}
