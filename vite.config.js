import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    import.meta.env.MODE !== 'production'
      ? react({
          jsxRuntime: 'classic',
        })
      : react(),
  ],
})
