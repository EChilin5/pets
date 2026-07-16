import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        details1: resolve(__dirname, 'details1.html'),
        details2: resolve(__dirname, 'details2.html'),
        details3: resolve(__dirname, 'details3.html'),
        details4: resolve(__dirname, 'details4.html'),
        details5: resolve(__dirname, 'details5.html'),
        details6: resolve(__dirname, 'details6.html'),
        details7: resolve(__dirname, 'details7.html'),
        details8: resolve(__dirname, 'details8.html'),
        details9: resolve(__dirname, 'details9.html'),
      }
    }
  }
})