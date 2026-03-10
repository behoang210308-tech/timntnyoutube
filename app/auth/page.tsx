'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { useUiStore, Plan } from '@/lib/store/ui-store';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface AuthUser {
  id: string;
  fullName: string;
  phone: string;
  plan: Plan;
  referralCode: string;
}

export default function AuthPage() {
  const { setPlan } = useUiStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    phone: '',
    password: '',
    referralCode: '',
  });
  const [loginForm, setLoginForm] = useState({
    phone: '',
    password: '',
  });
  const tabParam = searchParams.get('tab');
  const referralParam = searchParams.get('referralCode') || '';
  const requestedNext = searchParams.get('returnTo') || searchParams.get('next') || '/timsieungach';
  const nextPath = requestedNext.startsWith('/') ? requestedNext : '/timsieungach';
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  useEffect(() => {
    const hasFlowParams = Boolean(searchParams.get('returnTo') || searchParams.get('next') || searchParams.get('referralCode'));
    if (!hasFlowParams && !tabParam) {
      router.replace('/');
    }
  }, [router, searchParams, tabParam]);

  useEffect(() => {
    setActiveTab(tabParam === 'register' ? 'register' : 'login');
  }, [tabParam]);

  useEffect(() => {
    if (!referralParam) return;
    setRegisterForm((prev) => ({ ...prev, referralCode: referralParam.toUpperCase() }));
    setActiveTab('register');
  }, [referralParam]);

  useEffect(() => {
    const loadMe = async () => {
      const response = await fetch('/api/auth/me');
      const json = (await response.json()) as { ok?: boolean; data?: AuthUser };
      if (response.ok && json.ok && json.data) {
        setMe(json.data);
        setPlan(json.data.plan);
        return;
      }
      setMe(null);
    };

    loadMe().catch(() => setMe(null));
  }, [setPlan]);

  const handleRegister = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerForm),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; data?: AuthUser };
      if (!response.ok || !json.ok || !json.data) {
        throw new Error(json.message || 'Đăng ký thất bại');
      }
      setMe(json.data);
      setPlan(json.data.plan);
      toast({
        title: 'Đăng ký thành công',
        description: 'Tài khoản đã được lưu vào database.',
      });
      router.replace(nextPath);
    } catch (error) {
      toast({
        title: 'Đăng ký thất bại',
        description: error instanceof Error ? error.message : 'Không thể đăng ký.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const json = (await response.json()) as { ok?: boolean; message?: string; data?: AuthUser };
      if (!response.ok || !json.ok || !json.data) {
        throw new Error(json.message || 'Đăng nhập thất bại');
      }
      setMe(json.data);
      setPlan(json.data.plan);
      toast({
        title: 'Đăng nhập thành công',
        description: `Xin chào ${json.data.fullName}`,
      });
      router.replace(nextPath);
    } catch (error) {
      toast({
        title: 'Đăng nhập thất bại',
        description: error instanceof Error ? error.message : 'Không thể đăng nhập.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setMe(null);
      setPlan('TEST');
      toast({
        title: 'Đã đăng xuất',
        description: 'Phiên làm việc đã kết thúc.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-blue-50 to-indigo-100">
      <div className="max-w-xl mx-auto px-4 py-10 space-y-4">
        <Card className="rounded-2xl border-red-100 p-5 bg-gradient-to-r from-red-100 via-blue-100 to-indigo-100 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Đăng nhập tài khoản</h1>
          <p className="text-sm text-slate-700 mt-1">Lưu tài khoản vào database và đồng bộ gói sử dụng SaaS.</p>
          <p className="text-xs text-blue-800 font-semibold mt-2">Sau đăng nhập sẽ vào: {nextPath}</p>
          {me ? (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Badge className="bg-red-50 text-red-700 border border-red-200">{me.fullName}</Badge>
              <Badge className="bg-blue-50 text-blue-700 border border-blue-200">{me.phone}</Badge>
              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200">Plan {me.plan}</Badge>
              <Badge className="bg-blue-100 text-blue-800 border border-blue-200">Mã giới thiệu: {me.referralCode}</Badge>
            </div>
          ) : null}
        </Card>

        {me ? (
          <Card className="rounded-2xl border-blue-100 p-5 bg-white shadow-sm">
            <p className="text-sm text-slate-700">Bạn đang đăng nhập. Bấm tiếp tục để vào chức năng bạn vừa chọn.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={() => router.replace(nextPath)}>
                Tiếp tục
              </Button>
              <Link href="/">
                <Button variant="outline" className="rounded-xl border-blue-200 text-blue-700 hover:bg-blue-50">Về trang chủ</Button>
              </Link>
              <Button className="rounded-xl bg-red-600 hover:bg-red-700" onClick={handleLogout} disabled={loading}>
                Đăng xuất
              </Button>
            </div>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value === 'register' ? 'register' : 'login')} className="w-full">
            <TabsList className="bg-blue-100 rounded-xl">
              <TabsTrigger value="login" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">Đăng nhập</TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Đăng ký</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card className="rounded-2xl border-blue-100 p-5 bg-white shadow-sm space-y-3">
                <Input
                  placeholder="Số điện thoại"
                  value={loginForm.phone}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="rounded-xl border-blue-200 focus-visible:ring-blue-500"
                />
                <Input
                  placeholder="Mật khẩu"
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="rounded-xl border-blue-200 focus-visible:ring-blue-500"
                />
                <Button className="rounded-xl bg-blue-600 hover:bg-blue-700" onClick={handleLogin} disabled={loading}>
                  Đăng nhập
                </Button>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card className="rounded-2xl border-red-100 p-5 bg-white shadow-sm space-y-3">
                <Input
                  placeholder="Họ và tên"
                  value={registerForm.fullName}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  className="rounded-xl border-red-200 focus-visible:ring-red-500"
                />
                <Input
                  placeholder="Số điện thoại"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, phone: e.target.value }))}
                  className="rounded-xl border-red-200 focus-visible:ring-red-500"
                />
                <Input
                  placeholder="Mật khẩu (>= 6 ký tự)"
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="rounded-xl border-red-200 focus-visible:ring-red-500"
                />
                <Input
                  placeholder="Mã giới thiệu (nếu có)"
                  value={registerForm.referralCode}
                  onChange={(e) => setRegisterForm((prev) => ({ ...prev, referralCode: e.target.value }))}
                  className="rounded-xl border-red-200 focus-visible:ring-red-500"
                />
                <Button className="rounded-xl bg-red-600 hover:bg-red-700" onClick={handleRegister} disabled={loading}>
                  Tạo tài khoản
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  );
}
