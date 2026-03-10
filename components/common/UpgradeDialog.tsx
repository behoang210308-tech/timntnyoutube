'use client';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Lock } from 'lucide-react';
import Link from 'next/link';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featureName: string;
  requiredPlan: string;
}

export const UpgradeDialog = ({ open, onOpenChange, featureName, requiredPlan }: UpgradeDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-slate-200 bg-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Lock className="w-5 h-5 text-blue-600" />
            Tính năng đang bị khóa
          </DialogTitle>
        </DialogHeader>
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">{featureName}</span> yêu cầu gói <span className="font-bold text-blue-700">{requiredPlan}</span> trở lên.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Để sau</Button>
          <Link href="/pricing">
            <Button className="bg-blue-500 hover:bg-blue-600">
              <Crown className="w-4 h-4 mr-1.5" />
              Nâng cấp ngay
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
