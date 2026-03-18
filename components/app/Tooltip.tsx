"use client";

import { ReactNode } from "react";

interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className = "" }: TooltipProps) {
  return (
    <div className={`relative group/tooltip ${className}`}>
      {children}
      {/* Tooltip */}
      <div className="absolute left-0 top-full mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 max-w-xs break-words whitespace-normal pointer-events-none">
        {content}
        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45"></div>
      </div>
    </div>
  );
}
