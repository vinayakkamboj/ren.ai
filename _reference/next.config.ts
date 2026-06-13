import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Nutrient Web SDK is loaded at runtime from Nutrient's CDN (see
  // lib/nutrient/cdn-loader.ts), NOT bundled. Transpiling the prebuilt SDK with
  // SWC produced "_Symbol$iterator is not defined" at runtime, so it is no
  // longer in transpilePackages.
  transpilePackages: [
    "@codesandbox/sandpack-react",
    "@codesandbox/sandpack-core",
    "@codesandbox/sandpack-client",
  ],

  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        canvas: false,
      };

      // Stable module IDs so chunk hashes don't shift on every re-deploy.
      config.optimization = {
        ...config.optimization,
        moduleIds: "deterministic",
      };
    }

    return config;
  },
};

export default nextConfig;
