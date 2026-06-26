import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    // 邮箱密码登录
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: '邮箱', type: 'email' },
        password: { label: '密码', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.hashedPassword) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.hashedPassword
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      }
    }),
    
    // Google 登录
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    
    // GitHub 登录
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    }),
  ],
  
  session: {
    strategy: 'jwt',
  },
  
  pages: {
    signIn: '/auth/login',
  },
  
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        (token as Record<string, unknown>).checkedAt = Date.now();
        return token;
      }

      // 已签发 JWT 在每次请求都会到这里。每 60 秒回查 DB 一次，
      // 防止「session 还在但用户行已被删」的僵尸态（部署期 DB 路径错位、
      // 手动清表等场景）。找不到则清空 token，强制重登。
      const checkedAt = (token as Record<string, unknown>).checkedAt as number | undefined;
      if (token.id && (!checkedAt || Date.now() - checkedAt > 60_000)) {
        const exists = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true },
        });
        if (!exists) {
          // 清掉 id 让 middleware/session 把它当未登录处理；JWT 本身保留
          // 是为了避免类型出错，下次请求会自然进入登录流程。
          delete (token as Record<string, unknown>).id;
          delete (token as Record<string, unknown>).checkedAt;
          return token;
        }
        (token as Record<string, unknown>).checkedAt = Date.now();
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};
