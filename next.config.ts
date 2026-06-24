import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise le HMR depuis le réseau local (téléphone, autre appareil)
  // Sécurité : uniquement actif en mode dev
  output: "standalone",
  allowedDevOrigins: ["192.168.1.27", "*.local"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.ufs.sh",
        pathname: "/f/**",
      },
      {
        protocol: "https",
        hostname: "utfs.io",
        pathname: "/f/**",
      },
    ],
  },
};

export default nextConfig;
