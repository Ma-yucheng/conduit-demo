/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 开发服务器默认拦截跨源 dev 资源；允许用 127.0.0.1 打开页面
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
