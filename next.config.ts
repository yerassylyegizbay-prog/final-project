import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages run only on the server and work best un-bundled.
  serverExternalPackages: ["unpdf", "jszip", "@google/genai", "@anthropic-ai/sdk"],
  // Keep the samples folder available to the "Try a sample" button after `next build`.
  outputFileTracingIncludes: { "/api/lectures": ["./samples/**/*"] },
};

export default nextConfig;
