import { useCallback, useEffect } from "react";
import type { Theme } from "@/types/app";
import { useLocalStorage } from "./use-local-storage";

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	if (theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
		root.classList.add("dark");
	} else {
		root.classList.remove("dark");
	}
}

export function useTheme() {
	const [theme, setTheme] = useLocalStorage<Theme>("skatteassistenten_theme", "system");

	useEffect(() => {
		applyTheme(theme);

		if (theme === "system") {
			const mq = window.matchMedia("(prefers-color-scheme: dark)");
			const handler = () => applyTheme("system");
			mq.addEventListener("change", handler);
			return () => mq.removeEventListener("change", handler);
		}
	}, [theme]);

	const toggleTheme = useCallback(
		(newTheme: Theme) => {
			setTheme(newTheme);
		},
		[setTheme],
	);

	return { theme, setTheme: toggleTheme };
}
