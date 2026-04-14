import { WORK_TYPE_META, type WorkType } from "@/types";
import { cn } from "@/lib/cn";

type Props = {
  workType: string;
  customColor?: string | null;
  className?: string;
};

export function WorkTypeDot({ workType, customColor, className }: Props) {
  const meta = WORK_TYPE_META[workType as WorkType];
  if (customColor) {
    return (
      <span
        aria-hidden
        className={cn("inline-block w-2.5 h-2.5 rounded-full shrink-0", className)}
        style={{ background: customColor }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block w-2.5 h-2.5 rounded-full shrink-0",
        meta?.color ?? "bg-neutral-400",
        className
      )}
    />
  );
}
