import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // 若不想把 API Key 暴露在浏览器端，可启用代理：
    // 前端把 VITE_WEATHER_API_BASE_URL 设为 /api，由 Vite 转发到数据源并注入 Key。
    // proxy: {
    //   '/api': {
    //     target: 'https://devapi.qweather.com',
    //     changeOrigin: true,
    //     rewrite: (path) => path.replace(/^\/api/, ''),
    //   },
    // },
  },
});