"use client";

import Link from "next/link";
import { Icon } from "@/components/app/Icon";

interface FolderTileProps {
  href: string;
  name: string;
  count: number;
  icon?: string;          // emoji for user folders
  materialIcon?: string;  // Material Symbols name for the special tiles
}

export function FolderTile({ href, name, count, icon, materialIcon }: FolderTileProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col items-center gap-3 p-5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm hover:shadow-lg hover:border-purple-400 dark:hover:border-purple-400 transition-all"
    >
      <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-105 transition-transform">
        {materialIcon ? (
          <Icon name={materialIcon} className="text-3xl text-purple-600" />
        ) : (
          <span className="text-3xl">{icon}</span>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {count} note{count !== 1 ? "s" : ""}
        </p>
      </div>
    </Link>
  );
}
