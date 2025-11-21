'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sparkles,
  Wand2,
  Image,
  Settings,
  LogOut,
  User,
  Home,
  ListTodo
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import TaskStatsPopover from './TaskStatsPopover';



export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session) {
    return null;
  }



  const navigationItems = [
    {
      name: '首页',
      href: '/',
      icon: Home,
      active: pathname === '/'
    },
    {
      name: '工作区',
      href: '/workspace',
      icon: Wand2,
      active: pathname === '/workspace'
    },
    {
      name: '图片库',
      href: '/gallery',
      icon: Image,
      active: pathname === '/gallery'
    },
    {
      name: '任务中心',
      href: '/history',
      icon: ListTodo,
      active: pathname === '/history'
    },
    {
      name: '设置',
      href: '/settings',
      icon: Settings,
      active: pathname === '/settings'
    }
  ];

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <Link href="/" className="text-xl font-bold text-gray-900">
              Imagine This
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-orange-50 text-orange-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            {/* 任务统计悬浮按钮 */}
            <TaskStatsPopover />

            <div className="hidden md:flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{session.user?.email}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="w-4 h-4 mr-2" />
              登出
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="flex items-center justify-around py-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center px-2 py-1 text-xs ${
                  item.active
                    ? 'text-orange-600'
                    : 'text-gray-600'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}