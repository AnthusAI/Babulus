const nextConfig = {
  transpilePackages: ["@babulus/renderer", "@babulus/shared"],
  output: "standalone",
  webpack: (config) => {
    // Allow importing .ts files as .js (for ESM module resolution)
    config.resolve.extensionAlias = {
      ".js": [".js", ".ts", ".tsx"],
      ".jsx": [".jsx", ".tsx"],
      ".mjs": [".mjs", ".mts"],
      ".cjs": [".cjs", ".cts"],
    };
    return config;
  },
};

export default nextConfig;
