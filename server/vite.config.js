import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import react from '@vitejs/plugin-react'
import inertia from '@inertiajs/vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        tailwindcss(),
        laravel({
            input: ['resources/js/app.tsx', 'resources/css/app.css', 'resources/js/auth.tsx'],
            refresh: true,
        }),
        inertia(),
        react(),
    ],
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
})