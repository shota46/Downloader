import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  // 開発時: /api/* を localhost:4040 にプロキシ
  server: {
    proxy: {
      "/api":    { target: "http://localhost:4040", changeOrigin: true },
      "/health": { target: "http://localhost:4040", changeOrigin: true },
    },
  },

  // ビルド後はサーバーが静的ファイルをserve
  build: {
    outDir: "dist",
  },

  define: {
    // 本番ビルド時にも DL_API を埋め込める (必要に応じて変更)
    // __DL_API__: JSON.stringify("http://your-server:4040"),
  },
});
