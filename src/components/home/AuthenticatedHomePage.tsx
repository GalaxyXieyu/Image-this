"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, ImageIcon, Star, Clock, ArrowRight, Sparkles, Zap, Expand } from "lucide-react";
import Navbar from "@/components/navigation/Navbar";

export default function AuthenticatedHomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-orange-50/30 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-200/40 to-purple-200/40 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-200/40 to-pink-200/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-blue-100/20 to-purple-100/20 rounded-full blur-3xl"></div>
      </div>

      <Navbar />

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* 欢迎区域 - 更加精致 */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center px-5 py-2 rounded-full bg-gradient-to-r from-orange-500/10 to-blue-500/10 backdrop-blur-sm border border-white/50 text-sm font-medium text-gray-700 mb-8 shadow-lg">
            <Sparkles className="w-4 h-4 mr-2 text-orange-500 animate-pulse" />
            AI 驱动的创意工作台
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-orange-600">
            欢迎回来！
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
            继续您的 AI 图像处理之旅，探索无限创意可能
            <br className="hidden md:block" />
            <span className="text-orange-600 font-medium">让每一张图片都成为艺术品</span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              asChild 
              className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 transform hover:scale-105 px-10 py-6 text-lg group"
            >
              <Link href="/workspace">
                <Sparkles className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
                开始创作
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              asChild 
              className="border-2 border-gray-200 hover:border-orange-300 hover:bg-white/80 backdrop-blur-sm transition-all duration-300 px-10 py-6 text-lg"
            >
              <Link href="/gallery">
                <Star className="w-5 h-5 mr-2" />
                浏览作品
              </Link>
            </Button>
          </div>
        </div>

        {/* 快速操作卡片 - 更加现代化 */}
        <div className="max-w-6xl mx-auto mb-20">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">快速开始</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/workspace" className="group">
              <Card className="h-full text-center hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 transform hover:-translate-y-3 border-0 bg-white/80 backdrop-blur-sm cursor-pointer overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="pb-6 relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    <Wand2 className="w-10 h-10 text-orange-600 group-hover:rotate-12 transition-transform" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">一键增强</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    智能扩图 + AI高清化
                    <br />
                    <span className="text-xs text-orange-600 font-medium">一键完成专业处理</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/workspace" className="group">
              <Card className="h-full text-center hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 transform hover:-translate-y-3 border-0 bg-white/80 backdrop-blur-sm cursor-pointer overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="pb-6 relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    <ImageIcon className="w-10 h-10 text-blue-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">背景替换</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    智能换背景
                    <br />
                    <span className="text-xs text-blue-600 font-medium">AI 精准识别主体</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/gallery" className="group">
              <Card className="h-full text-center hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300 transform hover:-translate-y-3 border-0 bg-white/80 backdrop-blur-sm cursor-pointer overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="pb-6 relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    <Star className="w-10 h-10 text-purple-600 group-hover:rotate-12 transition-transform" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors">我的作品</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    查看历史作品
                    <br />
                    <span className="text-xs text-purple-600 font-medium">精彩作品集</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/history" className="group">
              <Card className="h-full text-center hover:shadow-2xl hover:shadow-green-500/20 transition-all duration-300 transform hover:-translate-y-3 border-0 bg-white/80 backdrop-blur-sm cursor-pointer overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="pb-6 relative z-10">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                    <Clock className="w-10 h-10 text-green-600 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardTitle className="text-xl font-bold text-gray-900 mb-3 group-hover:text-green-600 transition-colors">处理记录</CardTitle>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    查看历史记录
                    <br />
                    <span className="text-xs text-green-600 font-medium">追踪每次创作</span>
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>

        {/* 功能亮点展示 */}
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">为什么选择我们</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">极速处理</h3>
              <p className="text-gray-600 leading-relaxed">
                先进的 AI 算法，秒级完成图像处理，让创作更高效
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">专业品质</h3>
              <p className="text-gray-600 leading-relaxed">
                企业级 AI 模型，确保每一次处理都达到专业水准
              </p>
            </div>

            <div className="text-center p-8 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Expand className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">无限可能</h3>
              <p className="text-gray-600 leading-relaxed">
                多种 AI 功能组合，满足各种创意需求，释放想象力
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
