import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jaswanth.cinephile",
  appName: "Cinephile",
  server: {
    url: "https://cinephile-vert.vercel.app",
    cleartext: true
  }
};

export default config;
