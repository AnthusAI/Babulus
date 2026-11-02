import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@babulus/renderer", "@babulus/shared", "@videoml/player", "@videoml/stdlib"],
  output: "standalone",
  webpack: (config) => {
    const rootNodeModules = path.resolve(__dirname, "..", "..", "node_modules");
    const rendererRoot = path.resolve(__dirname, "..", "..", "packages", "renderer");
    const sharedRoot = path.resolve(__dirname, "..", "..", "packages", "shared");
    // Allow importing .ts files as .js (for ESM module resolution)
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
      ".jsx": [".jsx", ".tsx"],
      ".mjs": [".mjs", ".mts"],
      ".cjs": [".cjs", ".cts"],
    };
    config.resolve.modules = [...(config.resolve.modules ?? []), rootNodeModules];
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      "@babulus/renderer": rendererRoot,
      "@babulus/shared": sharedRoot,
      graphql: path.resolve(rootNodeModules, "graphql"),
    };
    return config;
  },
};

export default nextConfig;
