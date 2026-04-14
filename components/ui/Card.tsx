import { cn } from "@/lib/cn";

type Props = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "sm" | "md" | "lg" | "none";
};

const paddings = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-8",
};

export function Card({
  padding = "md",
  className,
  children,
  ...rest
}: Props) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-xl bg-white dark:bg-[#242424] shadow-sm border border-black/[0.04] dark:border-white/[0.06]",
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  );
}
