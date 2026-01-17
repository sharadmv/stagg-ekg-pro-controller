import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'Acaia Controller',
                short_name: 'Acaia',
                description: 'Web controller for Acaia coffee scales',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'icon.svg',
                        sizes: 'any',
                        type: 'image/svg+xml',
                        purpose: 'any maskable'
                    }
                ]
            }
        })
    ],
    base: '/coffee-tools/acaia/',
    resolve: {
        alias: {
            '@coffee-tools/acaia-sdk': path.resolve(__dirname, '../../packages/acaia-sdk/src/index.ts')
        }
    },
    server: {
        port: 5176
    }
})
