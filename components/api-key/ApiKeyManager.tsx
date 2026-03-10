
import React, { useMemo, useState } from 'react';
import { useApiKeyStore, ApiService } from '@/lib/store/api-key-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Key, CheckCircle, XCircle, Loader2, ShieldCheck, Database, PlugZap, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const ApiKeyManager = () => {
  const { keys, addKey, removeKey, toggleKey, getDecryptedKeyById, incrementUsage } = useApiKeyStore();
  const [newKey, setNewKey] = useState('');
  const [service, setService] = useState<ApiService>('youtube');
  const [label, setLabel] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testState, setTestState] = useState<Record<string, 'idle' | 'success' | 'failed'>>({});

  const keyProviderLinks: Record<ApiService, string> = {
    youtube: 'https://console.cloud.google.com/apis/credentials',
    gemini: 'https://aistudio.google.com/app/apikey',
    openai: 'https://platform.openai.com/api-keys',
    openrouter: 'https://openrouter.ai/keys',
  };

  const serviceStats = useMemo(() => {
    const grouped = new Map<ApiService, number>();
    keys.forEach((item) => {
      grouped.set(item.service, (grouped.get(item.service) || 0) + 1);
    });
    return grouped;
  }, [keys]);

  const handleAddKey = () => {
    if (!newKey.trim()) {
      toast({
        title: "Error",
        description: "API Key cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    // Basic validation
    if (service === 'youtube' && !newKey.startsWith('AIza')) {
       toast({
        title: "Warning",
        description: "This doesn't look like a standard YouTube API Key (usually starts with AIza)",
        variant: "destructive", // Or warning if supported
      });
      // We still allow it, just warn
    }

    addKey(service, newKey, label || `${service.toUpperCase()} Key`);
    setNewKey('');
    setLabel('');
    toast({
      title: "Success",
      description: "API Key added successfully",
    });
  };

  const testKeyConnection = async (id: string, keyService: ApiService) => {
    const plainKey = getDecryptedKeyById(id);
    if (!plainKey) {
      toast({
        title: 'Không tìm thấy key',
        description: 'Vui lòng thêm lại key.',
        variant: 'destructive',
      });
      return;
    }

    setTestingId(id);
    try {
      const res = await fetch('/api/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: keyService,
          key: plainKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || 'Kết nối thất bại.');
      }

      incrementUsage(id);
      setTestState((prev) => ({ ...prev, [id]: 'success' }));
      toast({
        title: 'Kết nối thành công',
        description: `Đã test ${keyService.toUpperCase()} API.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể kết nối API.';
      setTestState((prev) => ({ ...prev, [id]: 'failed' }));
      toast({
        title: 'Kết nối thất bại',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <Card className="w-full rounded-2xl border-slate-100 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 rounded-t-2xl">
        <CardTitle className="flex items-center gap-2 text-2xl font-black text-slate-900">
          <Key className="w-6 h-6 text-blue-600" />
          API Key Center
        </CardTitle>
        <p className="text-sm text-slate-600">
          Lưu key mã hóa local và test kết nối thật theo từng dịch vụ.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 pt-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-xs text-blue-700 font-semibold">YouTube</p>
              <p className="text-2xl font-black text-blue-900">{serviceStats.get('youtube') || 0}</p>
            </div>
            <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
              <p className="text-xs text-violet-700 font-semibold">Gemini / OpenRouter</p>
              <p className="text-2xl font-black text-violet-900">{(serviceStats.get('gemini') || 0) + (serviceStats.get('openrouter') || 0)}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700 font-semibold">Đang active</p>
              <p className="text-2xl font-black text-emerald-900">{keys.filter((item) => item.isActive).length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border border-slate-100 rounded-2xl p-4 bg-slate-50/50">
            <div className="space-y-2">
              <Label>Dịch vụ</Label>
              <Select value={service} onValueChange={(val) => setService(val as ApiService)}>
                <SelectTrigger className="rounded-xl border-slate-300 bg-white">
                  <SelectValue placeholder="Chọn dịch vụ" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 bg-white">
                  <SelectItem value="youtube">YouTube Data API</SelectItem>
                  <SelectItem value="gemini">Gemini AI</SelectItem>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                </SelectContent>
              </Select>
              <a
                href={keyProviderLinks[service]}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                Lấy API key
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="space-y-2 col-span-1 md:col-span-2">
              <Label>API Key</Label>
              <Input 
                type="password" 
                placeholder="Dán API key..." 
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="rounded-xl border-slate-300 bg-white"
              />
            </div>
             <div className="space-y-2">
              <Label>Nhãn (tuỳ chọn)</Label>
              <Input 
                placeholder="Key chính" 
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="rounded-xl border-slate-300 bg-white"
              />
            </div>
            <Button onClick={handleAddKey} className="w-full md:w-auto rounded-xl bg-blue-500 hover:bg-blue-600">
              <Database className="w-4 h-4 mr-1.5" />
              Lưu Key
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Danh sách key đã lưu</h3>
            {keys.length === 0 ? (
              <div className="text-center text-slate-500 py-8 border border-dashed border-slate-200 rounded-2xl">
                Chưa có API key. Thêm key để bật tính năng chạy thật.
              </div>
            ) : (
              <Table className="rounded-xl overflow-hidden border border-slate-100">
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Dịch vụ</TableHead>
                    <TableHead>Nhãn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium uppercase">
                        <span className="inline-flex items-center gap-1.5">
                          <PlugZap className="w-4 h-4 text-blue-500" />
                          {key.service}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">{key.label}</TableCell>
                      <TableCell>
                        <Badge className={key.isActive ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}>
                          {key.isActive ? "Active" : "Inactive"}
                        </Badge>
                        {testState[key.id] === 'success' ? (
                          <Badge className="ml-1 bg-blue-100 text-blue-700 border border-blue-200">Connected</Badge>
                        ) : null}
                        {testState[key.id] === 'failed' ? (
                          <Badge className="ml-1 bg-rose-100 text-rose-700 border border-rose-200">Disconnected</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>{key.quotaUsage} calls</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => testKeyConnection(key.id, key.service)}
                          disabled={testingId === key.id}
                        >
                          {testingId === key.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-1" />}
                          Test API
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleKey(key.id)}
                          title={key.isActive ? "Deactivate" : "Activate"}
                        >
                          {key.isActive ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-gray-400" />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeKey(key.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
