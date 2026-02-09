import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

const apiTarget = process.env.API_URL || "http://localhost:3050";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": resolve(__dirname, "src"),
		},
	},
	server: {
		port: Number(process.env.FRONTEND_PORT) || 5173,
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
