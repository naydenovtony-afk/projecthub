import { defineConfig } from 'vite';
import { resolve } from 'path';

const SUPABASE_URL = 'https://tfcbldsthanflvzlwtlv.supabase.co';

export default defineConfig({
  server: {
    port: 5178,
    proxy: {
      // Route Supabase API calls through Vite dev server to bypass browser extension blocking
      '/__supabase': {
        target: SUPABASE_URL,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/__supabase/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'pages/demo.html'),
        login: resolve(__dirname, 'pages/login.html'),
        register: resolve(__dirname, 'pages/register.html'),
        dashboard: resolve(__dirname, 'pages/dashboard.html'),
        projects: resolve(__dirname, 'pages/projects.html'),
        'project-users': resolve(__dirname, 'pages/project-users.html'),
        'project-details': resolve(__dirname, 'pages/project-details.html'),
        'project-form': resolve(__dirname, 'pages/project-form.html'),
        profile: resolve(__dirname, 'pages/profile.html'),
        admin: resolve(__dirname, 'pages/admin.html'),
        '404': resolve(__dirname, 'pages/404.html'),
        '500': resolve(__dirname, 'pages/500.html'),
      },
    },
  },
});
