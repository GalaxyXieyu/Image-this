"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Wand2, ImageIcon, Expand, Zap, ArrowRight, TrendingUp, Clock, Star } from "lucide-react";
import Navbar from "@/components/navigation/Navbar";
import { useState } from "react";
import Image from "next/image";

// 微信二维码组件
function WeChatQRCode({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-8 rounded-lg shadow-xl text-center" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl font-bold mb-4">扫码联系客服</h3>
        <div className="flex gap-8">
          <div>
            <Image src="/客服1.jpg" alt="客服1" width={150} height={150} />
            <p className="mt-2">客服1</p>
          </div>
          <div>
            <Image src="/客服2.jpg" alt="客服2" width={150} height={150} />
            <p className="mt-2">客服2</p>
          </div>
        </div>
        <Button onClick={onClose} className="mt-6">关闭</Button>
      </div>
    </div>
  );
}

// 页脚组件
function Footer() {
  const [showQRCode, setShowQRCode] = useState(false);

  return (
    <>
      <footer className="bg-gray-100 text-gray-800 py-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">博捷科技</h3>
            <p className="text-gray-600">专业提供化妆品定制、批量生产、样品申请和设计咨询服务</p>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">联系我们</h3>
            <ul className="space-y-2 text-gray-600">
              <li>电话: <a href="tel:16626181662" className="hover:text-amber-600">16626181662</a></li>
              <li>邮箱: <a href="mailto:1216278493@qq.com" className="hover:text-amber-600">1216278493@qq.com</a></li>
              <li>地址: 广东省汕头市金平区岐山街道寨头南澳路F栋1号</li>
              <li><button onClick={() => setShowQRCode(true)} className="text-amber-600 hover:underline">微信客服</button></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">服务支持</h3>
            <ul className="space-y-2 text-gray-600">
              <li><a href="#" className="hover:text-amber-600">产品定制</a></li>
              <li><a href="#" className="hover:text-amber-600">批量生产</a></li>
              <li><a href="#" className="hover:text-amber-600">样品申请</a></li>
              <li><a href="#" className="hover:text-amber-600">设计咨询</a></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 text-center mt-8 border-t pt-6">
          <p className="text-gray-500">© 2024 Imagine This. 专业AI图像处理平台.</p>
        </div>
      </footer>
      {showQRCode && <WeChatQRCode onClose={() => setShowQRCode(false)} />}
    </>
  );
}


export default function Home() {
  const { status, data: session } = useSession();
  const router = useRouter();

  // 如果用户已登录，显示已登录用户的首页
  if (status === "authenticated") {
    return <AuthenticatedHomePage />;
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-amber-400/20 to-orange-600/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      {/* Header */}
      <header className="border-b border-white/20 bg-white/70 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Imagine This</h1>
          </div>
          <div className="space-x-3">
            <Button variant="outline" asChild className="border-gray-200 hover:border-gray-300 hover:bg-white/80 transition-all duration-200">
              <Link href="/auth/login">登录</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl transition-all duration-200">
              <Link href="/auth/register">开始使用</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/20 text-sm font-medium text-gray-700 mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
              全新 AI 图像处理体验
            </div>
          </div>

          <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
              AI 图像处理
            </span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 animate-gradient">
              神器
            </span>
          </h2>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            专业的 AI 图像处理平台，支持背景替换、图像扩展、高清化等功能。
            <br className="hidden md:block" />
            让您的图像处理工作变得简单高效，释放创意无限可能。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg">
              <Link href="/auth/register">
                免费开始使用
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="border-gray-200 hover:border-gray-300 hover:bg-white/80 backdrop-blur-sm transition-all duration-200 px-8 py-4 text-lg">
              <Link href="#features">了解更多</Link>
            </Button>
          </div>

          {/* 统计数据 */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">10,000+</div>
              <div className="text-gray-600">用户信赖</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">99.9%</div>
              <div className="text-gray-600">处理成功率</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">24/7</div>
              <div className="text-gray-600">在线服务</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20 relative z-10">
        <div className="text-center mb-16">
          <h3 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">强大的功能特性</h3>
          <p className="text-gray-600 text-xl max-w-2xl mx-auto">一站式解决您的图像处理需求，让 AI 成为您的创意助手</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Wand2 className="w-8 h-8 text-amber-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mb-3">一键AI增强</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                智能扩图 + AI高清化，一键完成专业级图像处理，让您的图片焕然一新
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <ImageIcon className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mb-3">智能换背景</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                AI自动识别主体，智能更换背景，保持边缘自然，创造无限可能
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Expand className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mb-3">智能扩图</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                AI智能扩展图片边界，保持内容自然连贯，突破画面限制
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/70 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Zap className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mb-3">AI高清化</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                使用先进AI算法，智能提升图片分辨率和细节，让模糊变清晰
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-amber-500 to-orange-500 py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            立即开始您的AI图像处理之旅
          </h3>
          <p className="text-amber-100 text-lg mb-8">
            无需复杂设置，注册即用，让AI为您的创意插上翅膀
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/auth/register">
              免费注册
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// 已登录用户的首页组件
function AuthenticatedHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        {/* 欢迎区域 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6">
            欢迎回来！
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            继续您的 AI 图像处理之旅，探索无限创意可能
          </p>
          <Button size="lg" asChild className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg">
            <Link href="/workspace">
              开始创作
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>

        {/* 快速操作卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/70 backdrop-blur-sm cursor-pointer">
            <Link href="/workspace">
              <CardHeader className="pb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Wand2 className="w-8 h-8 text-amber-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-2">一键增强</CardTitle>
                <CardDescription className="text-gray-600">
                  智能扩图 + AI高清化
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/70 backdrop-blur-sm cursor-pointer">
            <Link href="/workspace">
              <CardHeader className="pb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <ImageIcon className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-2">背景替换</CardTitle>
                <CardDescription className="text-gray-600">
                  智能换背景
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/70 backdrop-blur-sm cursor-pointer">
            <Link href="/gallery">
              <CardHeader className="pb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Star className="w-8 h-8 text-green-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-2">我的作品</CardTitle>
                <CardDescription className="text-gray-600">
                  查看历史作品
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white/70 backdrop-blur-sm cursor-pointer">
            <Link href="/history">
              <CardHeader className="pb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-2">处理记录</CardTitle>
                <CardDescription className="text-gray-600">
                  查看历史记录
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        </div>

        {/* 最近活动 */}
        <div className="max-w-4xl mx-auto">
          <Card className="border-0 bg-white/70 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl font-bold text-gray-900">
                <Clock className="w-6 h-6 mr-3 text-amber-600" />
                最近活动
              </CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-lg mb-2">暂无处理记录</p>
                <p className="text-sm">开始您的第一次 AI 图像处理吧！</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
