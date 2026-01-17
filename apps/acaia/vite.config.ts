import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
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
