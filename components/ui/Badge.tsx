import { cn } from "@/lib/cn";
import { WORK_TYPE_META, type WorkType } from "@/types";

type Props = {
  workType: WorkType;
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

export function Badge({ workType, label, size = "md", className }: Props) {
  const meta = WORK_TYPE_META[workType];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full text-white font-medium",
        meta.color,
        size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className
      )}
    >
      <span aria-hidden>{meta.emoji}</span>
      <span>{label ?? meta.label_es}</span>
    </span>
  );
}
