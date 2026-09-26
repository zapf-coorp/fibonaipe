import { create } from 'zustand';

type UiState = {
  deckSheetOpen: boolean;
  toast: string | null;
  searchQuery: string;
  setDeckSheetOpen: (open: boolean) => void;
  toggleDeckSheet: () => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setSearchQuery: (q: string) => void;
};

export const useUiStore = create<UiState>((set) => ({
  deckSheetOpen: false,
  toast: null,
  searchQuery: '',
  setDeckSheetOpen: (open) => set({ deckSheetOpen: open }),
  toggleDeckSheet: () => set((s) => ({ deckSheetOpen: !s.deckSheetOpen })),
  showToast: (message) => set({ toast: message }),
  clearToast: () => set({ toast: null }),
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
