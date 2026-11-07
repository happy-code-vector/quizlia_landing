import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

// W-4.2 states. Primary is the rust capsule (lock rule 4: one per screen above the fold).
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-subheadline font-semibold transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] disabled:cursor-not-allowed disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active active:scale-[0.98] disabled:active:scale-100',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98]',
        outline:
          'border border-divider bg-card text-label hover:border-input active:bg-hover-fill',
        secondary:
          'border border-divider bg-card text-label hover:border-input active:bg-hover-fill',
        ghost: 'text-label hover:bg-hover-fill active:bg-hover-fill',
        link: 'rounded-none text-rust underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5',
        sm: 'h-9 px-4',
        lg: 'h-12 px-7 text-headline',
        icon: 'size-[2.125rem] relative after:absolute after:-inset-[0.3125rem] after:content-[""]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
