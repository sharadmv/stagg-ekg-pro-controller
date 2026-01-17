import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/coffee-tools/acaia/',
    resolve: {
        alias: {
            '@coffee-tools/acaia-sdk': '../../packages/acaia-sdk/src/index.ts'
        }
    },
    server: {
        port: 5176
    }
})
