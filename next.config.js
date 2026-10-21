/** @type {import('next').NextConfig} */
const nextConfig = {
  // firebase-admin uses dynamic requires (grpc-js/protobufjs) that break
  // when bundled into serverless functions (empty-body 500s on Netlify;
  // seen live 2026-10-21 on every /api/ios/* route). Keeping it external
  // makes the runtime resolve it from node_modules instead.
  serverExternalPackages: ["firebase-admin", "@google-cloud/firestore"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'framerusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.cdnlogo.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
    ],
  },
};

module.exports = nextConfig;
