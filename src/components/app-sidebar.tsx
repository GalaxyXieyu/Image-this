
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, FolderOpen, Settings, Wand2 } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const navigation = [
  { title: '工作台', url: '/', icon: Home },
  { title: '图片管理', url: '/gallery', icon: FolderOpen },
  { title: '设置', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state: sidebarState } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className="border-border/30 glass-effect">
      <SidebarHeader className="border-b border-amber-200/30 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl warm-gradient flex items-center justify-center shadow-md">
            <Wand2 className="w-4 h-4 text-amber-700" />
          </div>
          {sidebarState === 'expanded' && (
            <div>
              <h2 className="font-bold text-amber-800">AI Studio</h2>
              <p className="text-xs text-amber-600">图像处理工作台</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-amber-700/70 font-medium px-3 py-2 text-sm">
            主要功能
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-1">
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-auto p-0">
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                          isActive
                            ? 'warm-gradient text-amber-800 font-medium shadow-sm border border-amber-200/50'
                            : 'hover:bg-white/60 hover:shadow-sm text-amber-700'
                        }`
                      }
                    >
                      <div className={`w-5 h-5 ${isActive ? 'text-amber-700' : 'text-amber-600'}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      {sidebarState === 'expanded' && (
                        <span className="font-medium">{item.title}</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
