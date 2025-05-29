import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths' // Ensure this import exists

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths() // Make sure this is called
  ]
})