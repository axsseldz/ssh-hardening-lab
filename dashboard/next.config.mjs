/** @type {import('next').NextConfig} */
const nextConfig = {
  // El dashboard lee los JSON de ../data en tiempo de build/servidor.
  // No hay base de datos ni API externa.
  reactStrictMode: true,
};

export default nextConfig;
