import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
  preview: {
    allowedHosts: ['ifb-inventario-1.onrender.com'], // ✅ adicione seu domínio aqui
    port: process.env.PORT ? parseInt(process.env.PORT) : 4173,
    host: '0.0.0.0',
  },
})
