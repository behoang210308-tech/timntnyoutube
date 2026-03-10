
'use client';

import React, { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { Toaster } from '@/components/ui/toaster';
import { Search, Bell, Plus, ChevronDown, Sun, Moon } from 'lucide-react';
import { useUiStore } from '@/lib/store/ui-store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, useReducedMotion } from 'framer-motion';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { theme, toggleTheme } = useUiStore();
  const reduceMotion = useReducedMotion();
  const [viewerName, setViewerName] = useState('Guest');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((json: { ok?: boolean; data?: { fullName?: string } }) => {
        if (json.ok && json.data?.fullName) {
          setViewerName(json.data.fullName);
          setIsLoggedIn(true);
        } else {
          setViewerName('Guest');
          setIsLoggedIn(false);
        }
      })
      .catch(() => {
        setViewerName('Guest');
        setIsLoggedIn(false);
      });
  }, []);

  const handleLogin = () => {
    window.location.assign(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  };

  const handleLogout = async () => {
    if (authLoading) return;
    setAuthLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setViewerName('Guest');
      setIsLoggedIn(false);
      window.location.assign('/');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-foreground">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <header className="h-[74px] bg-white/95 backdrop-blur border-b border-slate-100 px-6 flex items-center justify-between">
          <div className="relative w-full max-w-[500px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full h-11 rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
              placeholder="Tìm kiếm ngách, video, từ khóa..."
            />
          </div>
          <div className="flex items-center gap-3 ml-6">
            <motion.button
              whileHover={reduceMotion ? undefined : { y: -1 }}
              whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              className="h-11 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm"
            >
              <span className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Tạo File Quét
              </span>
            </motion.button>
            <button className="h-11 px-3 rounded-xl border border-slate-200 flex items-center justify-center gap-1 text-slate-700 hover:bg-slate-50 transition">
              <span className="text-sm font-semibold">VN</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>
            <button className="h-11 w-11 rounded-xl border border-slate-200 flex items-center justify-center text-rose-500 hover:bg-rose-50 relative transition">
              <Bell className="w-4 h-4" />
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 absolute top-2 right-2" />
            </button>
            <button className="h-11 w-11 rounded-xl border border-slate-200 flex items-center justify-center text-amber-500 hover:bg-amber-50 transition" onClick={toggleTheme}>
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-11 px-3 rounded-xl border border-slate-200 flex items-center gap-2 text-left hover:bg-slate-50 transition">
                  <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                    {viewerName.slice(0, 1).toUpperCase() || 'G'}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">{isLoggedIn ? viewerName : 'Đăng nhập'}</span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-2xl border-blue-200 bg-white shadow-lg p-1.5">
                <DropdownMenuLabel className="text-slate-900 rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">{isLoggedIn ? viewerName : 'Khách'}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isLoggedIn ? (
                  <>
                    <DropdownMenuItem
                      className="rounded-xl border border-slate-200 bg-slate-50 mb-1 font-semibold text-slate-800 focus:bg-slate-100 focus:text-slate-900"
                      onSelect={() => window.location.assign('/account')}
                    >
                      Thông tin tài khoản
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-xl border border-rose-200 bg-rose-50 font-bold text-rose-700 focus:bg-rose-100 focus:text-rose-800"
                      onSelect={() => void handleLogout()}
                      disabled={authLoading}
                    >
                      {authLoading ? 'Đang xử lý...' : 'Đăng xuất'}
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem
                    className="rounded-xl border border-blue-200 bg-blue-50 font-semibold text-blue-700 focus:bg-blue-100 focus:text-blue-800"
                    onSelect={handleLogin}
                  >
                    Đăng nhập
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="p-6">
          {children}
        </div>
      </main>
      <Toaster />
    </div>
  );
};
