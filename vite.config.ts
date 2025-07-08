import react from "@vitejs/plugin-react";
import fs from "fs";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
    base: "/nfc-bank/",
    plugins: [
        react(),
        VitePWA({
            workbox: {
                globPatterns: ["**/*"],
            },
            includeAssets: ["**/*"],
            manifest: {
                theme_color: "#171923",
                background_color: "#171923",
                display: "standalone",
                scope: "/nfc-bank/",
                start_url: "/nfc-bank/",
                short_name: "Duhová Banka",
                description: "Aplikace pro správu karet Duhové banky",
                name: "Duhová Banka",
                icons: [
                    {
                        src: "/nfc-bank/web-app-manifest-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "/nfc-bank/web-app-manifest-256x256.png",
                        sizes: "256x256",
                        type: "image/png",
                    },
                    {
                        src: "/nfc-bank/web-app-manifest-384x384.png",
                        sizes: "384x384",
                        type: "image/png",
                    },
                    {
                        src: "/nfc-bank/web-app-manifest-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                ],
            },
        }),
    ],
    server: {
        https: {
            key: fs.readFileSync("./cert/key.pem"),
            cert: fs.readFileSync("./cert/cert.pem"),
        },
    },
});
