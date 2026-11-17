/** @type {import('next').NextConfig} */
const aliases = Object.assign({}, require('./content/study/aliases.json'), require('./content/study/aliases-history.json'), require('./content/study/aliases-english.json'), require('./content/study/aliases-science.json'));

const nextConfig = {
  // Short spoken addresses for the video call to action: quizliai.com/<alias> -> /study/<slug>.
  async redirects() {
    return Object.entries(aliases).map(([alias, slug]) => ({ source: `/${alias}`, destination: `/study/${slug}`, permanent: false }));
  },
  // firebase-admin is bundled INLINE (no serverExternalPackages): Netlify's
  // function runtime failed to resolve both Turbopack externals (hashed
  // registry ids) and webpack dynamic-import externals (empty-body 500s on
  // /api/ios/*, seen live 2026-10-21). Bundled = nothing to resolve at
  // runtime. Requires the webpack build (see package.json build script).
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
