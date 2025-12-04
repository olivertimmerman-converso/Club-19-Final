/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["img.clerk.com"],
  },
  // Redirects removed - root page now handles routing based on user role
};

module.exports = nextConfig;
