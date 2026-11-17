import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// App is served at https://localhost:5173/SkillStair
export default defineConfig({
  base: '/SkillStair/',
  plugins: [react(), basicSsl()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:8080' } }
})
