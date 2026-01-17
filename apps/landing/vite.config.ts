import { defineConfig } from 'vite'

export default defineConfig({
    base: '/coffee-tools/',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 5173,
        proxy: {
            '/coffee-tools/stagg/': {
                target: 'http://localhost:5175',
                changeOrigin: true,
            },
            '/coffee-tools/coffee_assistant/': {
                target: 'http://localhost:5174',
                changeOrigin: true,
            },
            '/coffee-tools/acaia/': {
                target: 'http://localhost:5176',
                changeOrigin: true,
            }
        }
    }
})
