import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
