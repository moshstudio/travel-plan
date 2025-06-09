import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { VantResolver } from "unplugin-vue-components/resolvers";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const isDeploy = process.env.npm_lifecycle_event === "deploy";
  console.log("is deploy:", isDeploy);

  return {
    plugins: [
      vue(),
      tailwindcss(),
      AutoImport({
        resolvers: [VantResolver()],
      }),
      Components({
        resolvers: [VantResolver()],
      }),
      nodePolyfills({
        // 明确包含需要的 polyfills
        globals: {
          Buffer: true,
        },
      }),
    ],

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // 3. tell vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: isDeploy ? "/travel-plan/" : "/", // 替换为你的仓库名
    build: {
      minify: "terser" as const,
      terserOptions: {
        compress: {
          defaults: false, // 禁用默认值，使用下面指定的更激进的配置
          dead_code: true,
          unused: true,
          keep_fargs: false,
          drop_debugger: true,
          drop_console: true,
          passes: 2, // 多次压缩
        },
        format: {
          beautify: false, // 不美化输出
          comments: false, // 移除注释
          indent_level: 0, // 缩进级别为0
          preserve_annotations: false,
          preamble: null,
          quote_style: 3, // 总是使用最有效的引号
          wrap_iife: false,
          wrap_func_args: false,
        },
        mangle: {
          toplevel: true, // 混淆顶级变量名
        },
      },
    },
  };
});
