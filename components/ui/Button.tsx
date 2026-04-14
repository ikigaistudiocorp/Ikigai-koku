"use client";

import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
};

const variants: Record<Variant, string> = {
  primary: "bg-ikigai-purple text-white hover:bg-ikigai-purple/90",
  secondary:
    "bg-white dark:bg-neutral-900 text-ikigai-dark dark:text-ikigai-cream border border-black/10 dark:border-white/15 hover:bg-black/[0.03]",
  danger: "bg-ikigai-rose text-white hover:bg-ikigai-rose/90",
  ghost:
    "bg-transparent text-ikigai-dark dark:text-ikigai-cream hover:bg-black/[0.05] dark:hover:bg-white/[0.05]",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-14 px-5 text-base",
  lg: "h-16 px-6 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
    >
      {loading ? <span className="animate-pulse">...</span> : children}
    </button>
  );
}
