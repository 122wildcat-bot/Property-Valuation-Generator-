/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["puppeteer", "@anthropic-ai/sdk"],
  },
  output: "standalone",
};

module.exports = nextConfig;
