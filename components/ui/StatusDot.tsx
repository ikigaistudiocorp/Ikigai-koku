import { cn } from "@/lib/cn";

export type Status = "green" | "amber" | "red";

const colors: Record<Status, string> = {
  green: "bg-ikigai-emerald",
  amber: "bg-ikigai-amber",
  red: "bg-ikigai-rose",
};

const sizes = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

export function StatusDot({
  status,
  size = "md",
  className,
}: {
  status: Status;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-label={`status-${status}`}
      className={cn(
        "inline-block rounded-full",
        colors[status],
        sizes[size],
        className
      )}
    />
  );
}
