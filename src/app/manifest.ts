import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RentalHub NG",
    short_name: "RentalHub",
    description: "Verified off-campus accommodation platform for students in Nigeria.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#192F59",
    icons: [
      {
        src: "/favicon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

