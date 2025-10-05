// filepath: play-designer/vite.config.ts
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwind from "@tailwindcss/vite"
import path from "path"

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") }
  },
  plugins: [react(), tailwind()],
})