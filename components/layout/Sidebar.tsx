
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, BarChart2, Key, Sparkles, CircleDollarSign, BookOpen, Crown, ChevronRight, MessageCircle, FolderKanban, HandCoins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/lib/store/ui-store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, useReducedMotion } from 'framer-motion';

export const Sidebar = () => {
  const pathname = usePathname();
  const { plan, hasFeature } = useUiStore();
  const reduceMotion = useReducedMotion();
  const [viewerName, setViewerName] = useState('Guest');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [logoSrc, setLogoSrc] = useState('/logo-search.png');

  const menuItems = [
    { href: '/timsieungach', label: 'Tìm Ngách', icon: Search, iconBg: 'bg-blue-100 text-blue-600' },
    { href: '/channel-analyzer', label: 'Phân Tích Kênh', icon: BarChart2, badge: hasFeature('channelAnalyzer') ? 'NEW' : 'BASIC+', iconBg: 'bg-violet-100 text-violet-600' },
    { href: '/keyword-explorer', label: 'Keyword Explorer', icon: Sparkles, badge: hasFeature('keywordExplorer') ? 'PRO' : 'STANDARD+', iconBg: 'bg-amber-100 text-amber-600' },
    { href: '/saved-projects', label: 'Saved Projects', icon: FolderKanban, badge: hasFeature('savedProjects') ? undefined : 'STANDARD+', iconBg: 'bg-emerald-100 text-emerald-600' },
    { href: '/affiliate', label: 'Affiliate', icon: HandCoins, iconBg: 'bg-pink-100 text-pink-600' },
    { href: '/settings/keys', label: 'API Keys', icon: Key, iconBg: 'bg-cyan-100 text-cyan-600' },
    { href: '/pricing', label: 'Bảng Giá', icon: CircleDollarSign, iconBg: 'bg-red-100 text-red-600' },
    { href: '/guides', label: 'Hướng Dẫn Sử Dụng', icon: BookOpen, iconBg: 'bg-indigo-100 text-indigo-600' },
  ];

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
    window.location.assign(`/login?returnTo=${encodeURIComponent(pathname || '/timsieungach')}`);
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
    <aside className="w-[278px] border-r border-slate-100 bg-white h-screen sticky top-0 p-4 flex flex-col shrink-0">
      <div className="px-2 py-2 mb-4">
        <Link href="/" className="rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm flex items-center gap-2.5 hover:bg-slate-50 transition">
          <img
            src={logoSrc}
            alt="Tìm NTN YouTube"
            onError={() => setLogoSrc('/logo-search.svg')}
            className="h-12 w-12 object-contain rounded-lg drop-shadow-sm [image-rendering:auto]"
          />
          <div>
            <p className="font-extrabold text-slate-900 leading-none text-[22px]">Tìm NTN</p>
            <p className="text-sm text-red-500 mt-0.5 font-bold leading-none">Youtube</p>
          </div>
        </Link>
      </div>

      <nav className="flex flex-col gap-1.5">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={reduceMotion ? undefined : { opacity: 0, x: -8 }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              whileHover={reduceMotion ? undefined : { y: -1, scale: 1.01 }}
              transition={{ duration: 0.18 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'h-11 rounded-xl px-3 flex items-center justify-between transition-all border ui-hover-lift',
                  isActive
                    ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                    : 'bg-white border-transparent text-slate-700 hover:bg-slate-50'
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className={cn('w-6 h-6 rounded-lg flex items-center justify-center', isActive ? 'bg-white/20 text-white' : item.iconBg)}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-[15px] font-semibold tracking-tight">{item.label}</span>
                </span>
                {item.badge ? (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-md font-semibold',
                      isActive ? 'bg-white/20 text-white' : 'bg-red-50 text-red-500'
                    )}
                  >
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            </motion.div>
          );
        })}
      </nav>

      <div className="rounded-2xl bg-slate-50 border border-slate-100 px-3 py-3 mt-5">
        <p className="text-sm font-semibold text-slate-800">Gói của bạn</p>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-sm text-slate-600">Hết hạn: 15/12/2025</p>
          <span className="text-[10px] px-2 py-1 rounded-lg bg-amber-100 text-amber-600 font-bold">{plan}</span>
        </div>
      </div>

      <div className="mt-auto space-y-3 pt-3">
        <Link href="/pricing" className="h-11 w-full rounded-xl text-white font-semibold text-sm bg-blue-500 hover:bg-blue-600 transition shadow-sm inline-flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5">
            <Crown className="w-4 h-4" />
            Nâng Cấp Ngay
          </span>
        </Link>

        <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-red-50 p-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-2xl border border-white p-3.5 bg-white w-full text-left hover:bg-slate-50 transition">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                    {viewerName.slice(0, 1).toUpperCase() || 'G'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{viewerName}</p>
                    <p className={`text-xs mt-0.5 font-semibold ${isLoggedIn ? 'text-emerald-500' : 'text-blue-600'}`}>
                      {isLoggedIn ? 'Online' : 'Chưa đăng nhập'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
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

        <button className="h-14 w-full rounded-2xl border border-blue-100 bg-blue-50 text-left px-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-sm text-slate-900 font-semibold">Hỗ Trợ 24/7</p>
                <p className="text-xs text-blue-600 font-bold">0345.336.453</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-500" />
          </div>
        </button>
      </div>
    </aside>
  );
};
