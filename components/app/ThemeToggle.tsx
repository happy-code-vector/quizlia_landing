"use client";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <span className="material-symbols-outlined text-yellow-500">light_mode</span>
      ) : (
        <span className="material-symbols-outlined text-gray-700 dark:text-gray-300">dark_mode</span>
      )}
    </button>
  );
}
