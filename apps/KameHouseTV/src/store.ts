import { create } from 'zustand';

export type ScreenState = 'loading' | 'config' | 'error' | 'home' | 'details' | 'player';

interface AppState {
  currentScreen: ScreenState;
  serverUrl: string;
  selectedAnimeId: string | null;
  selectedEpisodeId: string | null;
  setScreen: (screen: ScreenState) => void;
  setServerUrl: (url: string) => void;
  setSelectedAnime: (id: string | null) => void;
  setSelectedEpisode: (id: string | null) => void;
  handleBack: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  currentScreen: 'config',
  serverUrl: localStorage.getItem('kamehouse_server') || '',
  selectedAnimeId: null,
  selectedEpisodeId: null,
  
  setScreen: (screen) => set({ currentScreen: screen }),
  
  setServerUrl: (url) => {
    localStorage.setItem('kamehouse_server', url);
    set({ serverUrl: url });
  },
  
  setSelectedAnime: (id) => set({ selectedAnimeId: id }),
  setSelectedEpisode: (id) => set({ selectedEpisodeId: id }),
  
  handleBack: () => {
    const { currentScreen } = get();
    if (currentScreen === 'player') {
      set({ currentScreen: 'details' });
    } else if (currentScreen === 'details') {
      set({ currentScreen: 'home' });
    } else if (currentScreen === 'home') {
      set({ currentScreen: 'config' });
    }
  }
}));
