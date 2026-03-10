'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NicheResult } from '@/lib/services/youtube';

export interface SavedProject {
  id: string;
  name: string;
  keyword: string;
  market: string;
  timeRange: string;
  videoType: string;
  minViews: number;
  minSubs: number;
  totalResults: number;
  createdAt: number;
  updatedAt: number;
  topResults: NicheResult[];
}

export interface WatchlistChannel {
  id: string;
  title: string;
  subscriberCount: number;
  viewSubRatio: number;
  growthSignal: number;
  lastAddedAt: number;
}

interface ResearchState {
  projects: SavedProject[];
  watchlist: WatchlistChannel[];
  saveProject: (project: Omit<SavedProject, 'id' | 'createdAt' | 'updatedAt'>) => void;
  removeProject: (id: string) => void;
  addWatchlistChannel: (channel: Omit<WatchlistChannel, 'lastAddedAt'>) => void;
  removeWatchlistChannel: (id: string) => void;
  isInWatchlist: (id: string) => boolean;
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      projects: [],
      watchlist: [],
      saveProject: (project) => {
        const now = Date.now();
        const newProject: SavedProject = {
          ...project,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          projects: [newProject, ...state.projects],
        }));
      },
      removeProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((item) => item.id !== id),
        }));
      },
      addWatchlistChannel: (channel) => {
        const exists = get().watchlist.some((item) => item.id === channel.id);
        if (exists) return;

        set((state) => ({
          watchlist: [{ ...channel, lastAddedAt: Date.now() }, ...state.watchlist],
        }));
      },
      removeWatchlistChannel: (id) => {
        set((state) => ({
          watchlist: state.watchlist.filter((item) => item.id !== id),
        }));
      },
      isInWatchlist: (id) => {
        return get().watchlist.some((item) => item.id === id);
      },
    }),
    {
      name: 'tim-ntn-research',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
