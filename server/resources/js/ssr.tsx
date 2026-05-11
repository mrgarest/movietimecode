import './lib/i18n'
import { createInertiaApp } from '@inertiajs/react'
import createServer from '@inertiajs/react/server'
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ReactDOMServer from 'react-dom/server'
import MainLayout from './layouts/MainLayout'
import DashboardLayout from './layouts/DashboardLayout'

createServer(page =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        layout: (name) => {
            if (name.startsWith('dashboard/')) return DashboardLayout
            return MainLayout
        },
        resolve: name => {
            const pages = import.meta.glob<{ default: any }>('./pages/**/*.tsx', { eager: true })
            return pages[`./pages/${name}.tsx`]
        },
        setup: ({ App, props }: any) => {
            const queryClient = new QueryClient()
            return createElement(QueryClientProvider, { client: queryClient }, createElement(App, props))
        },
    })
)