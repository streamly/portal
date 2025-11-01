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
                "index": resolve(__dirname, "pages/index.html"),
                "after-signin/index": resolve(__dirname, "pages/after-signin/index.html"),
                "profile/index": resolve(__dirname, "pages/profile/index.html"),
            },
        },
    },
    resolve: {
        alias: { '/src': resolve(__dirname, 'src') }
    }
})