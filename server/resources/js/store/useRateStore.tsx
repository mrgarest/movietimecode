import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RateState {
    movieSearchCount: number;
    isDialogShown: boolean;
    incrementMovieSearchCount: () => void;
    setDialogShown: () => void;
    shouldShowDialog: () => boolean;
}

export const useRateStore = create<RateState>()(
    persist(
        (set, get) => ({
            movieSearchCount: 0,
            isDialogShown: false,

            incrementMovieSearchCount: () => set((state) => ({ movieSearchCount: state.movieSearchCount + 1 })),

            setDialogShown: () => set({ isDialogShown: true }),

            shouldShowDialog: () => !get().isDialogShown && get().movieSearchCount > 5,
        }),
        {
            name: 'rate',
            partialize: ({ movieSearchCount, isDialogShown }) => ({ movieSearchCount, isDialogShown }),
        }
    )
);
