import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const backendPort = process.env.BACKEND_API_PORT || "3050";
const apiTarget = process.env.API_URL || `http://localhost:${backendPort}`;

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
	server: {
		port: Number(process.env.APP_FRONTEND_PORT) || 5100,
		proxy: {
			"/api": {
				target: apiTarget,
				changeOrigin: true,
			},
			"/health": {
				target: apiTarget,
				changeOrigin: true,
			},
		},
	},
});
