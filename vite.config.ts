import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    publicDir: '../public',
    root: 'pages',
    build: {
        outDir: "../dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                "dev/index": resolve(__dirname, "pages/dev/index.html"),
                "dev/after-signin/index": resolve(__dirname, "pages/dev/after-signin/index.html"),
            },
        },
    },
    resolve: {
        alias: { '/src': resolve(__dirname, 'src') }
    }
})