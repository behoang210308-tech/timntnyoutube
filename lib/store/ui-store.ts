'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';
export type Plan = 'TEST' | 'BASIC' | 'STANDARD' | 'PRO' | 'PREMIUM';
export type FeatureKey = 'nicheFinder' | 'channelAnalyzer' | 'keywordExplorer' | 'savedProjects' | 'aiAdvanced';

const planRank: Record<Plan, number> = {
  TEST: 1,
  BASIC: 2,
  STANDARD: 3,
  PRO: 4,
  PREMIUM: 5,
};

const featureMinimumPlan: Record<FeatureKey, Plan> = {
  nicheFinder: 'TEST',
  channelAnalyzer: 'BASIC',
  keywordExplorer: 'STANDARD',
  savedProjects: 'STANDARD',
  aiAdvanced: 'PRO',
};

interface UiState {
  theme: ThemeMode;
  plan: Plan;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setPlan: (plan: Plan) => void;
  hasFeature: (feature: FeatureKey) => boolean;
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      plan: 'PRO',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setPlan: (plan) => set({ plan }),
      hasFeature: (feature) => {
        const current = get().plan;
        return planRank[current] >= planRank[featureMinimumPlan[feature]];
      },
    }),
    {
      name: 'tim-ntn-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
