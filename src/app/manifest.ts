import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "AIC Scholar Command Center", short_name: "AIC Scholar", description: "Academic, work and life intelligence for PhD progress.", start_url: "/command-center", display: "standalone", background_color: "#f4f7f8", theme_color: "#06223c", icons: [{ src: "/brand/aic-scholar-logo.png", sizes: "1024x1024", type: "image/png" }] };
}
