import * as webpackConfigModule from './webpack.config.js';
const webpackConfig = webpackConfigModule.default || webpackConfigModule;

/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  reactStrictMode: true,
  turbopack: {},
  webpack: webpackConfig,
};

export default nextConfig;
