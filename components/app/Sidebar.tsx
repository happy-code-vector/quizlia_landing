"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const avatarColors: Record<string, string> = {
  "avatar-1": "from-blue-400 to-purple-400",
  "avatar-2": "from-green-400 to-teal-400",
  "avatar-3": "from-orange-400 to-red-400",
  "avatar-4": "from-pink-400 to-rose-400",
  "avatar-5": "from-yellow-400 to-orange-400",
  "avatar-6": "from-indigo-400 to-blue-400",
};

interface Profile {
  id: number;
  name: string;
  type: string;
  avatar: string;
}

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sidebarExpanded");
      if (stored !== null) {
        setExpanded(stored === "true");
      }
    }
  }, []);

  const toggleSidebar = () => {
    const newState = !expanded;
    setExpanded(newState);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarExpanded", String(newState));
    }
  };

  const navItems = [
    { href: "/note/dashboard", icon: "home", label: "Dashboard", fill: true },
    { href: "/note/notes", icon: "description", label: "All Notes" },
    { href: "/note/flashcards", icon: "style", label: "All Flashcards" },
    { href: "/note/quizzes", icon: "quiz", label: "All Quizzes" },
  ];

  return (
    <div className="relative hidden md:flex flex-shrink-0">
      <aside className={`${expanded ? "w-64" : "w-20"} bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300`}>
        <div className="flex h-full flex-col justify-between p-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 items-center">
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center rounded-lg w-10 h-10">
                <span className="material-symbols-outlined">auto_stories</span>
              </div>
              {expanded && <h1 className="text-lg font-bold text-gray-900 dark:text-white">QuickNote</h1>}
            </div>

            <Link href="/note/profile-selection" className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${expanded ? "hover:bg-gray-100 dark:hover:bg-gray-800" : "justify-center"}`} title="Switch Profile">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColors[profile.avatar] || "from-gray-400 to-gray-500"} shrink-0 ${!expanded ? "hover:ring-2 hover:ring-purple-400 transition-all" : ""}`} />
              {expanded && (
                <div className="flex flex-col flex-1 min-w-0">
                  <h1 className="text-sm font-medium text-gray-900 dark:text-white truncate">{profile.name}</h1>
                  <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{profile.type}</p>
                </div>
              )}
              {expanded && <span className="material-symbols-outlined text-gray-400 text-sm">swap_horiz</span>}
            </Link>

            <nav className="flex flex-col gap-1 mt-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${isActive ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
                    <span className={`material-symbols-outlined ${item.fill && isActive ? "fill" : ""}`}>{item.icon}</span>
                    {expanded && <p className="text-sm font-medium">{item.label}</p>}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <Link href="/note/settings" className={`flex items-center gap-3 px-3 py-2 rounded-lg ${pathname === "/note/settings" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600" : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"}`}>
              <span className="material-symbols-outlined">settings</span>
              {expanded && <p className="text-sm font-medium">Settings</p>}
            </Link>
          </div>
        </div>
      </aside>

      {/* Collapse/Expand toggle button - centered on the border line */}
      <button
        onClick={toggleSidebar}
        className="absolute top-1/2 -translate-y-1/2 -right-3 z-10 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-md transition-all group"
        title={expanded ? "Collapse sidebar" : "Expand sidebar"}
      >
        <span className="material-symbols-outlined text-sm text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
          {expanded ? "chevron_left" : "chevron_right"}
        </span>
      </button>
    </div>
  );
}
