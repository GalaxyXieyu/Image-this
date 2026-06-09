'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Mail, Check } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState('/workspace/scene');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    const nextUrl = new URLSearchParams(window.location.search).get('callbackUrl');
    if (nextUrl?.startsWith('/') && !nextUrl.startsWith('//')) {
      setCallbackUrl(nextUrl);
    }
  }, []);

  const loginHref = `/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // 验证密码匹配
    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不匹配');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || '注册失败');
      } else {
        setSuccess(true);
        // 注册成功后自动登录
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.ok) {
          router.push(callbackUrl);
          router.refresh();
        }
      }
    } catch {
      setError('注册失败，请稍后重试');
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

  if (success) {
    return (
      <AuthShell
        eyebrow="ImageThis"
        title="创意账号，开启视觉之旅"
        description="正在准备你的商品视觉生产工作台。"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <Check className="h-7 w-7 text-[#2f67ff]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">注册成功！</h2>
            <p className="text-xs text-muted-foreground">正在为您自动登录...</p>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="ImageThis"
      title="创意账号，开启视觉之旅"
      description="创建账号后即可上传商品图、生成场景图并管理任务结果。"
    >
      <div className="space-y-6">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">注册账号</h2>
          <p className="text-xs text-muted-foreground">Access your AI visual workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-foreground">姓名</Label>
            <Input
              id="name"
              type="text"
              placeholder="请输入您的姓名"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="h-9 rounded-sm border-[#e5e7eb] bg-white text-sm"
            />
          </div>
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
              placeholder="至少6个字符"
              value={formData.password}
              onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              required
              minLength={6}
              className="h-9 rounded-sm border-[#e5e7eb] bg-white text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="再次输入密码"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
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
            {isLoading ? '注册中...' : '注册'}
          </Button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            或使用社交账号注册
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
          已有账号？{' '}
          <Link href={loginHref} className="font-medium text-[#2f67ff] hover:underline">
            立即登录
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
