/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure for GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/reader' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/reader/' : '',
}

export default nextConfig
