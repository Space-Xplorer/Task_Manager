import { create } from 'zustand';

interface AdminStore {
  isCreateOpen: boolean;
  openCreate:   () => void;
  closeCreate:  () => void;
}

export const useAdminStore = create<AdminStore>((set) => ({
  isCreateOpen: false,
  openCreate:  () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
}));
