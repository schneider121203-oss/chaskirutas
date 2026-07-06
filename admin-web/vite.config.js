import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El panel corre en el puerto 5173; el backend en http://localhost:3000
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
