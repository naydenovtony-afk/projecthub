import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        demo: resolve(__dirname, 'pages/demo.html'),
        login: resolve(__dirname, 'pages/login.html'),
        register: resolve(__dirname, 'pages/register.html'),
        dashboard: resolve(__dirname, 'pages/dashboard.html'),
        projects: resolve(__dirname, 'pages/projects.html'),
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
