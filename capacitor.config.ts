import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jaswanth.cinephile",
  appName: "Cinephile",
  server: {
    url: "https://cinephile-vert.vercel.app",
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      clientId: "396186270248-webclientid.apps.googleusercontent.com", // Replace with your OAuth web client ID
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
