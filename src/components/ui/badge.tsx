import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-muted text-quiet-strong",
        destructive: "bg-destructive-soft text-destructive-strong",
        outline: "border border-border text-foreground",
        success: "bg-success-soft text-success-strong",
        warning: "bg-warning-soft text-warning-strong",
        info: "bg-info-soft text-info-strong",
        special: "bg-special-soft text-special-strong",
        available: "bg-success-soft text-success-strong",
        assigned: "bg-info-soft text-info-strong",
        repair: "bg-warning-soft text-warning-strong",
        retired: "bg-quiet-soft text-quiet-strong",
        lost: "bg-destructive-soft text-destructive-strong",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
