import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    import.meta.env.NODE_ENV !== 'production'
      ? react({
          jsxRuntime: 'classic',
        })
      : react(),
  ],
})
