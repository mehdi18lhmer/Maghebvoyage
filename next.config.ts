import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      // CDC §5.4: real trip photos and agency verification docs, uploaded
      // direct-to-Cloudinary via src/lib/upload-client.ts.
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
