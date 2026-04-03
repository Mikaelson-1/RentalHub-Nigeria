import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix workspace root detection when running from a git worktree
  outputFileTracingRoot: __dirname,
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
