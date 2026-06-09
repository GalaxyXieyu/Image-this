'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Mail } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [callbackUrl, setCallbackUrl] = useState('/workspace/scene');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    const nextUrl = new URLSearchParams(window.location.search).get('callbackUrl');
    if (nextUrl?.startsWith('/') && !nextUrl.startsWith('//')) {
      setCallbackUrl(nextUrl);
    }
  }, []);

  const registerHref = `/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError('邮箱或密码错误');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setError('社交登录失败，请稍后重试');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="ImageThis"
      title="创意账号，开启视觉之旅"
      description="登录后管理商品素材、生成任务和本地作品资产。"
    >
      <div className="space-y-7">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">登录账号</h2>
          <p className="text-xs text-muted-foreground">Access your AI visual workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-foreground">邮箱</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              className="h-9 rounded-sm border-[#e5e7eb] bg-white text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-foreground">密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="请输入密码"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              className="h-9 rounded-sm border-[#e5e7eb] bg-white text-sm"
            />
          </div>

          {error && (
            <div className="rounded-sm bg-red-50 px-3 py-2 text-center text-xs text-red-600">{error}</div>
          )}

          <Button
            type="submit"
            className="h-9 w-full rounded-sm bg-[#2f67ff] text-sm font-medium hover:bg-[#2858dc]"
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            或使用社交账号登录
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              disabled={isLoading}
              className="h-9 rounded-sm text-xs"
            >
              <Mail className="mr-2 h-3.5 w-3.5" />
              Google
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSocialLogin('github')}
              disabled={isLoading}
              className="h-9 rounded-sm text-xs"
            >
              <Github className="mr-2 h-3.5 w-3.5" />
              GitHub
            </Button>
          </div>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          还没有账号？{' '}
          <Link href={registerHref} className="font-medium text-[#2f67ff] hover:underline">
            立即注册
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
