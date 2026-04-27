import { create } from 'zustand';

interface SSEState {
  connected:       boolean;
  setConnected:    (v: boolean) => void;

  notification:    string | null;
  setNotification: (n: string | null) => void;

  highlightedIds:  Record<string, true>;
  highlightTask:   (id: string) => void;
  clearHighlight:  (id: string) => void;
  reset:           () => void;
}

export const useSSEStore = create<SSEState>((set) => ({
  connected:       false,
  setConnected:    (v) => set({ connected: v }),

  notification:    null,
  setNotification: (n) => set({ notification: n }),

  highlightedIds:  {},
  highlightTask:   (id) => set((s) => ({ highlightedIds: { ...s.highlightedIds, [id]: true } })),
  clearHighlight:  (id) => set((s) => {
    const next = { ...s.highlightedIds };
    delete next[id];
    return { highlightedIds: next };
  }),
  reset: () => set({ connected: false, notification: null, highlightedIds: {} }),
}));
