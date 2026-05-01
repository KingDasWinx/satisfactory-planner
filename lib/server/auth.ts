import 'server-only'

import NextAuth, { type NextAuthConfig } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import bcrypt from 'bcrypt'

import { prisma } from '@/lib/server/prisma'

function env(name: string): string | undefined {
  const v = process.env[name]
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

export const authOptions: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  // Credentials provider requer JWT strategy nesta versão do Auth.js.
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
        const password = typeof credentials?.password === 'string' ? credentials.password : ''
        if (!email || !password) return null

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, name: true, username: true, passwordHash: true },
        })
        if (!user?.passwordHash) return null

        const ok = await bcrypt.compare(password, user.passwordHash)
        if (!ok) return null

        return { id: user.id, email: user.email, name: user.name ?? undefined, username: user.username }
      },
    }),
    ...(env('AUTH_GITHUB_ID') && env('AUTH_GITHUB_SECRET')
      ? [GitHub({ clientId: env('AUTH_GITHUB_ID')!, clientSecret: env('AUTH_GITHUB_SECRET')! })]
      : []),
    ...(env('AUTH_GOOGLE_ID') && env('AUTH_GOOGLE_SECRET')
      ? [Google({ clientId: env('AUTH_GOOGLE_ID')!, clientSecret: env('AUTH_GOOGLE_SECRET')! })]
      : []),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id
        const uname = (user as unknown as { username?: unknown } | undefined)?.username
        if (typeof uname === 'string' && uname.length > 0) token.username = uname
      }
      // Para OAuth (user pode não conter username): garante que o token tenha username consultando o DB.
      if (typeof token.id === 'string' && (token.username === undefined || token.username === null)) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
          select: { username: true },
        })
        if (dbUser?.username) token.username = dbUser.username
      }
      return token
    },
    session: async ({ session, token }) => {
      if (session.user) {
        ;(session.user as unknown as { id?: string }).id = typeof token.id === 'string' ? token.id : undefined
        ;(session.user as unknown as { username?: string }).username =
          typeof token.username === 'string' ? token.username : undefined
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)

