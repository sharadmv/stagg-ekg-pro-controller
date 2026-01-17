import { defineConfig } from 'vite'

export default defineConfig({
    base: '/coffee-tools/acaia/',
    build: {
        outDir: 'dist',
    },
    server: {
        port: 5176
    }
})
