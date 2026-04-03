/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep dev and production artifacts separate to avoid cache collisions.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  images: {
    // Only allow images from trusted storage providers.
    // Add your CDN / object-storage hostname here when you migrate from base64.
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
};

export default nextConfig;
