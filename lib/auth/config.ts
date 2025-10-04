import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { db } from '@/lib/db/drizzle';
import { users, accounts, sessions, verificationTokens } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { compare } from 'bcryptjs';

/**
 * NextAuth 配置
 * 支持 Google、GitHub OAuth 和用户名密码登录
 */
const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' as const },
  pages: {
    signIn: '/sign-in',
    signOut: '/',
    error: '/sign-in',
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string;
        const password = credentials?.password as string;
        
        if (!email || !password) return null;
        
        const result = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.email, email),
              isNull(users.deletedAt)
            )
          )
          .limit(1);
        
        if (result.length === 0) return null;
        const user = result[0];
        
        if (!user.passwordHash) return null;
        
        const ok = await compare(password, user.passwordHash);
        if (!ok) return null;
        
        return {
          id: String(user.id),
          email: user.email,
          name: user.name || undefined
        } as any;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      // 密码登录直接允许
      if (!account?.provider || account.provider === 'credentials') {
        return true;
      }
      
      try {
        // 检查用户是否已存在
        const existingUser = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email!))
          .limit(1);
        
        if (existingUser.length === 0) {
          // 创建新用户
          await db.insert(users).values({
            email: user.email!,
            name: user.name || undefined,
            provider: account.provider,
            providerId: user.id,
            passwordHash: null,
            role: 'user',
          });
        } else {
          const existingUserData = existingUser[0];
          
          // 检查用户是否已被删除
          if (existingUserData.deletedAt) {
            return false;
          }
          
          // 更新现有用户信息
          await db
            .update(users)
            .set({
              provider: account.provider,
              providerId: user.id,
              updatedAt: new Date(),
            })
            .where(eq(users.email, user.email!));
        }
        
        return true;
      } catch (error) {
        console.error(`Error in ${account.provider} signIn:`, error);
        return false;
      }
    },
    
    async redirect({ url, baseUrl }: any) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
    
    async jwt({ token, user, account }: any) {
      if (user) {
        // 对于 OAuth 登录，需要从数据库获取实际的用户ID
        if (account?.provider && account.provider !== 'credentials') {
          const dbUser = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email!))
            .limit(1);
          
          if (dbUser.length > 0) {
            token.sub = String(dbUser[0].id);
            token.role = dbUser[0].role;
          }
        } else {
          // 对于credentials登录，需要从数据库获取用户角色
          const dbUser = await db
            .select()
            .from(users)
            .where(eq(users.id, parseInt((user as any).id)))
            .limit(1);
          
          if (dbUser.length > 0) {
            token.sub = (user as any).id ?? token.sub;
            token.role = dbUser[0].role;
          }
        }
      }
      return token;
    },
    
    async session({ session, token }: any) {
      if (session.user && token?.sub) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    }
  }
};

export default NextAuth(authOptions);
export { authOptions };


