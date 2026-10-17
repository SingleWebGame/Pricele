import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-2xl border border-white/[0.075] bg-[#111820]/80 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl", className)}
      {...props}
    />
  );
}
