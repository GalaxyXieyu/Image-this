
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
    <Sidebar className="border-border/50">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wand2 className="w-4 h-4 text-primary-foreground" />
          </div>
          {sidebarState === 'expanded' && (
            <div>
              <h2 className="font-bold text-foreground">AI Studio</h2>
              <p className="text-xs text-muted-foreground">图像处理工作台</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>主要功能</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) =>
                        `flex items-center space-x-3 p-2 rounded-md transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'hover:bg-muted/50'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      {sidebarState === 'expanded' && <span>{item.title}</span>}
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
