import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === 'production';
const repo = 'alpha_weights_next';

const nextConfig: NextConfig = {
    output: 'export',      // 启用静态导出
    images: { unoptimized: true },  // 禁用图片优化
    basePath: isProd ? `/${repo}` : '',
    assetPrefix: isProd ? `/${repo}/` : '',
};

export default nextConfig;
