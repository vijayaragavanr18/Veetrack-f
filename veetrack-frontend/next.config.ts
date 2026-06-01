import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: false,
  serverExternalPackages: ["pdfkit"],
  // BACKEND_URL is injected by scripts/start-backend.sh from the root .env
  // For local dev without the script, it defaults to localhost:8000
  env: {
    BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:8000",
  },
};

export default nextConfig;
