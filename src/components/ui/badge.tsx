import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        {
          "border-transparent bg-accent-cyan/20 text-accent-cyan": variant === "default",
          "border-transparent bg-surface-600 text-gray-300": variant === "secondary",
          "border-transparent bg-red-500/20 text-red-400": variant === "destructive",
          "border-surface-500 text-gray-400": variant === "outline",
        },
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
