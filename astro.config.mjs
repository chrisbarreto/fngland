// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";
import { fileURLToPath } from "url";

// https://astro.build/config
export default defineConfig({
  site: "https://formulang.com.py",
  output: "server",
  adapter: node({ mode: "standalone" }),
  image: {
    service: { entrypoint: "astro/assets/services/noop" },
  },
  vite: {
    envDir: "..",
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
        "~": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  },
});
