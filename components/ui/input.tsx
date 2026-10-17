import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      className={cn(
        "h-14 w-full rounded-xl border border-white/[0.1] bg-[#0c1117] px-4 text-lg font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-300/60 focus:ring-4 focus:ring-emerald-300/[0.08] disabled:opacity-60",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";
