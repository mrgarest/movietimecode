import './bootstrap';
import './lib/i18n'
import { hydrateRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReactGA from 'react-ga4'
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'

const gaId = (import.meta as any).env.VITE_GOOGLE_ANALYTICS

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
})

createInertiaApp({
    progress: {
        color: '#fff',
        showSpinner: false,
    },
    layout: (name) => {
        if (name.startsWith('dashboard/')) return DashboardLayout
        return MainLayout
    },
    resolve: name => {
        const pages = import.meta.glob<{ default: any }>('./pages/**/*.tsx', { eager: true })
        return pages[`./pages/${name}.tsx`]
    },
    setup({ el, App, props }) {
        if (gaId) ReactGA.initialize(gaId)

        hydrateRoot(el,
            <QueryClientProvider client={queryClient}>
                <App {...props} />
            </QueryClientProvider>
        )
    },
})