import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "日報",
    short_name: "日報",
    description: "日報入力フォーム",
    start_url: "/",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
