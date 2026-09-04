import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relativer Pfad, damit der Build unabhängig vom Repo-Namen läuft,
  // z. B. unter https://<benutzer>.github.io/<repo>/ auf GitHub Pages.
  base: './',
  plugins: [react()],
})
