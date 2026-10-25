import { defineConfig, loadEnv } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Public SEO settings are baked into the build; never expose secrets here.
  const siteUrl = process.env.SITE_URL ?? env.SITE_URL ?? "";
  const indexSite = process.env.INDEX_SITE ?? env.INDEX_SITE ?? "false";
  return {
    define: {
      "process.env.SITE_URL": JSON.stringify(siteUrl),
      "process.env.GOOGLE_SITE_VERIFICATION": JSON.stringify(
        process.env.GOOGLE_SITE_VERIFICATION ?? env.GOOGLE_SITE_VERIFICATION ?? ""
      ),
      "process.env.INDEX_SITE": JSON.stringify(indexSite),
    },
    plugins: [
      vinext(),
      cloudflare({ viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] } }),
    ],
  };
});
