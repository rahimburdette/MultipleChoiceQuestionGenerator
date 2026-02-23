/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow images from medical image sources
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
  webpack: (config) => {
    // Handle pdfjs-dist canvas dependency (not needed in browser)
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
