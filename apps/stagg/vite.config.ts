import { defineConfig } from 'vite'

export default defineConfig({
    base: '/coffee-tools/stagg/',
    build: {
        outDir: 'dist',
        rollupOptions: {
            output: {
                entryFileNames: `[name].js`,
                chunkFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`
            }
        }
    },
    server: {
        port: 5175,
    }
})
