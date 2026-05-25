import appIconUrl from "@/assets/app-icon.svg";
import { cn } from "@/shared/lib/utils";

export function AppBrandIcon({
  className,
  imageClassName,
}: {
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[1.4rem] bg-white shadow-[0_16px_38px_rgba(15,23,42,0.12)] ring-1 ring-slate-200/70",
        className,
      )}
    >
      <img
        src={appIconUrl}
        alt="家庭药箱"
        className={cn("h-14 w-14 rounded-[1.1rem]", imageClassName)}
        draggable={false}
      />
    </div>
  );
}
