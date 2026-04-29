import { ServerResponse } from '@/types/response';
import { User } from '@/types/user';
import { fetchApi } from '@/utils/fetch';
import Cookies from 'js-cookie';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Interface for authentication response
interface AuthUser extends ServerResponse {
    id: number;
    role_id: number;
    username: string;
    picture?: string | null;
};

interface UserState {
    user: User | null;
    isInitialized: boolean;
    setUser: (user: User | null) => void;
    checkAuth: () => Promise<void>;
    logout: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set) => ({
            user: null,
            isInitialized: false,

            setUser: (user) => set({ user }),

            checkAuth: async () => {
                if (!Cookies.get('uat')) {
                    set({ user: null, isInitialized: true });
                    return;
                }

                try {
                    const data = await fetchApi<AuthUser>('/api/v2/user');

                    if (data.success) {
                        set({
                            user: {
                                id: data.id,
                                roleId: data.role_id,
                                username: data.username,
                                picture: data.picture ?? null,
                            }, isInitialized: true
                        });
                    } else {
                        set({ user: null, isInitialized: true });
                        Cookies.remove('uat');
                    }
                } catch {
                    set({ user: null, isInitialized: true });
                }
            },

            logout: () => {
                Cookies.remove('uat');
                localStorage.removeItem('user');
                set({ user: null });
                window.location.href = "/";
            },
        }),
        {
            name: 'user',
            partialize: (state) => ({ user: state.user }),
        }
    )
);