"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, ImageIcon, Star, Clock, ArrowRight } from "lucide-react";
import Navbar from "@/components/navigation/Navbar";
import Footer from "./Footer";

export default function AuthenticatedHomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-12">
        {/* 欢迎区域 */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            欢迎回来！
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            继续您的 AI 图像处理之旅，探索无限创意可能
          </p>
          <Button 
            size="lg" 
            asChild 
            className="bg-orange-500 hover:bg-orange-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 px-8 py-4 text-lg"
          >
            <Link href="/workspace">
              开始创作
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>

        {/* 快速操作卡片 */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white bg-opacity-90 backdrop-blur-sm cursor-pointer">
            <Link href="/workspace">
              <CardHeader className="pb-6">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Wand2 className="w-8 h-8 text-orange-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-2">一键增强</CardTitle>
                <CardDescription className="text-gray-600">
                  智能扩图 + AI高清化
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white bg-opacity-90 backdrop-blur-sm cursor-pointer">
            <Link href="/workspace">
              <CardHeader className="pb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <ImageIcon className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-2">背景替换</CardTitle>
                <CardDescription className="text-gray-600">
                  智能换背景
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white bg-opacity-90 backdrop-blur-sm cursor-pointer">
            <Link href="/gallery">
              <CardHeader className="pb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Star className="w-8 h-8 text-blue-600" />
                </div>
                <CardTitle className="text-lg font-bold text-gray-900 mb-2">我的作品</CardTitle>
                <CardDescription className="text-gray-600">
                  查看历史作品
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>

          <Card className="text-center hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-0 bg-white bg-opacity-90 backdrop-blur-sm cursor-pointer">
            <Link href="/history">
              <CardHeader className="pb-6">
                <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Clock className="w-8 h-8 text-orange-600" />
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
          <Card className="border-0 bg-white bg-opacity-90 backdrop-blur-sm shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl font-bold text-gray-900">
                <Clock className="w-6 h-6 mr-3 text-orange-600" />
                最近活动
              </CardTitle>
            </CardHeader>
            <div className="p-6">
              <div className="text-center py-12 text-gray-500">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
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
