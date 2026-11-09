import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The type scale utilities (globals.css, W-6.3) are font sizes. Without this, tailwind-merge reads
// `text-headline` as a text color and drops `text-primary-foreground` (black text on the rust capsule).
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        { text: ['large-title', 'title', 'title2', 'title3', 'headline', 'body', 'callout', 'subheadline', 'footnote'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
