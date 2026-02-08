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
    const videomlPlayerRoot = path.resolve(__dirname, "..", "..", "packages", "videoml-player");
    const videomlStdlibRoot = path.resolve(__dirname, "..", "..", "packages", "videoml-stdlib");
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
      "@videoml/player": videomlPlayerRoot,
      "@videoml/stdlib": videomlStdlibRoot,
      graphql: path.resolve(rootNodeModules, "graphql"),
    };
    return config;
  },
};

export default nextConfig;
