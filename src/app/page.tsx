"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Wand2, ImageIcon, Expand, Zap, ArrowRight } from "lucide-react";
import AuthenticatedHomePage from "@/components/home/AuthenticatedHomePage";


export default function Home() {
  const { status } = useSession();

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
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-100 rounded-full blur-3xl opacity-30"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-50 rounded-full blur-3xl opacity-20"></div>
      </div>

      {/* Header */}
      <header className="border-b border-gray-200 bg-white bg-opacity-95 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-300">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Imagine This</h1>
          </div>
          <div className="space-x-3">
            <Button variant="outline" asChild className="border-gray-200 hover:border-gray-300 hover:bg-white transition-all duration-200">
              <Link href="/auth/login">登录</Link>
            </Button>
            <Button asChild className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200">
              <Link href="/auth/register">开始使用</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white bg-opacity-80 backdrop-blur-sm border border-white border-opacity-50 text-sm font-medium text-gray-700 mb-6 shadow-sm">
              <Sparkles className="w-4 h-4 mr-2 text-orange-500" />
              全新 AI 图像处理体验
            </div>
          </div>

          <h2 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-gray-900">
              AI 图像处理
            </span>
            <br />
            <span className="text-orange-500">
              神器
            </span>
          </h2>

          <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed max-w-3xl mx-auto">
            专业的 AI 图像处理平台，支持背景替换、图像扩展、高清化等功能。
            <br className="hidden md:block" />
            让您的图像处理工作变得简单高效，释放创意无限可能。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" asChild className="bg-orange-500 hover:bg-orange-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg">
              <Link href="/auth/register">
                免费开始使用
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="border-gray-200 hover:border-gray-300 hover:bg-white bg-opacity-90 backdrop-blur-sm transition-all duration-200 px-8 py-4 text-lg">
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
          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white bg-opacity-90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Wand2 className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mb-3">一键AI增强</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                智能扩图 + AI高清化，一键完成专业级图像处理，让您的图片焕然一新
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white bg-opacity-90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <ImageIcon className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mb-3">智能换背景</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                AI自动识别主体，智能更换背景，保持边缘自然，创造无限可能
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white bg-opacity-90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Expand className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 mb-3">智能扩图</CardTitle>
              <CardDescription className="text-gray-600 leading-relaxed">
                AI智能扩展图片边界，保持内容自然连贯，突破画面限制
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white bg-opacity-90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Zap className="w-8 h-8 text-orange-600" />
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
      <section className="bg-orange-500 py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            立即开始您的AI图像处理之旅
          </h3>
          <p className="text-white text-opacity-90 text-lg mb-8">
            无需复杂设置，注册即用，让AI为您的创意插上翅膀
          </p>
          <Button size="lg" variant="secondary" asChild className="bg-white text-orange-600 hover:bg-gray-50">
            <Link href="/auth/register">
              免费注册
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

    </div>
  );
}
