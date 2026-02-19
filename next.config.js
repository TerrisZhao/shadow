/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // 生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  // 启用 standalone 输出模式以优化 Docker 镜像大小
  output: 'standalone',
};

module.exports = nextConfig;
