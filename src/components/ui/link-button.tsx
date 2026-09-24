import type { ComponentProps } from "react";

type Variant = "primary" | "outline";

const variants: Record<Variant, string> = {
  primary:
    "gap-2 bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc]",
  outline:
    "border border-solid border-black/[.08] hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]",
};

export function LinkButton({
  variant = "primary",
  className = "",
  ...props
}: ComponentProps<"a"> & { variant?: Variant }) {
  return (
    <a
      target="_blank"
      rel="noopener noreferrer"
      className={`flex h-12 w-full items-center justify-center rounded-full px-5 transition-colors md:w-[158px] ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
