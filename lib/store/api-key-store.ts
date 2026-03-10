
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { encryptData, decryptData } from '@/lib/security/crypto';

export type ApiService = 'youtube' | 'gemini' | 'openai' | 'openrouter';

export interface ApiKey {
  id: string;
  service: ApiService;
  key: string; // Encrypted when stored, but we might keep it in memory as is for usage? No, better keep encrypted and decrypt on usage.
  label: string;
  isActive: boolean;
  quotaUsage: number;
  lastUsed?: number;
}

interface ApiKeyState {
  keys: ApiKey[];
  addKey: (service: ApiService, key: string, label?: string) => void;
  removeKey: (id: string) => void;
  toggleKey: (id: string) => void;
  getKey: (service: ApiService) => string | null;
  getDecryptedKeyById: (id: string) => string | null;
  rotateKey: (service: ApiService) => string | null;
  incrementUsage: (id: string) => void;
}

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set, get) => ({
      keys: [],
      addKey: (service, key, label) => {
        const encryptedKey = encryptData(key);
        const newKey: ApiKey = {
          id: crypto.randomUUID(),
          service,
          key: encryptedKey,
          label: label || `${service.toUpperCase()} Key`,
          isActive: true,
          quotaUsage: 0,
        };
        set((state) => ({ keys: [...state.keys, newKey] }));
      },
      removeKey: (id) => {
        set((state) => ({ keys: state.keys.filter((k) => k.id !== id) }));
      },
      toggleKey: (id) => {
        set((state) => ({
          keys: state.keys.map((k) =>
            k.id === id ? { ...k, isActive: !k.isActive } : k
          ),
        }));
      },
      getKey: (service) => {
        const state = get();
        const activeKeys = state.keys.filter(
          (k) => k.service === service && k.isActive
        );
        if (activeKeys.length === 0) return null;
        
        // Simple strategy: return the first active key.
        // In a real scenario, we might want to check quota or load balance.
        return decryptData(activeKeys[0].key);
      },
      getDecryptedKeyById: (id) => {
        const state = get();
        const key = state.keys.find((item) => item.id === id);
        if (!key) return null;
        return decryptData(key.key);
      },
      rotateKey: (service) => {
        const state = get();
        const activeKeys = state.keys.filter(
          (k) => k.service === service && k.isActive
        );
        if (activeKeys.length === 0) return null;

        // Logic to rotate could be implemented here if we track current key index
        // For now, just return a random one or the next one
        const randomIndex = Math.floor(Math.random() * activeKeys.length);
        return decryptData(activeKeys[randomIndex].key);
      },
      incrementUsage: (id) => {
        set((state) => ({
          keys: state.keys.map((k) =>
            k.id === id
              ? { ...k, quotaUsage: k.quotaUsage + 1, lastUsed: Date.now() }
              : k
          ),
        }));
      },
    }),
    {
      name: 'tim-ntn-api-keys',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
