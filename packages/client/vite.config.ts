import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const BASE_PATH = "/_services/interactive-screens";

export default defineConfig({
	base: `${BASE_PATH}/`,
	build: {
		outDir: "../server/public",
		emptyOutDir: true,
	},
	plugins: [
		react(),
		babel({ presets: [reactCompilerPreset()] }),
		tailwindcss(),
	],
	server: {
		allowedHosts: ["local.j26.se"],
		proxy: {
			[`${BASE_PATH}/api`]: {
				target: "http://localhost:3000",
			},
			[`${BASE_PATH}/ws`]: {
				target: "ws://localhost:3000",
				ws: true,
				changeOrigin: true,
			},
		},
	},
});
