"use client";

import { cn } from "@/shared/utils/cn";

/**
 * Empty state standalone — dipakai ketika list/tabel/chart tidak punya data.
 * Dark-tech: struktur garis + tipe, bukan ilustrasi dekoratif.
 */
export default function EmptyState({
  icon = "inbox",
  title = "Belum ada data",
  description,
  action,
  size = "md",
  className,
}) {
  const sizes = {
    sm: { box: "size-9", icon: "text-[18px]", title: "text-xs", desc: "text-[11px]", gap: "gap-2" },
    md: { box: "size-11", icon: "text-[22px]", title: "text-sm", desc: "text-xs", gap: "gap-2.5" },
    lg: { box: "size-14", icon: "text-[28px]", title: "text-base", desc: "text-sm", gap: "gap-3" },
  };
  const s = sizes[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-lg border border-dashed border-border px-4 py-8",
        s.gap,
        className
      )}
    >
      <div className={cn("grid place-items-center rounded-md bg-bg-alt text-text-subtle", s.box)}>
        <span className={cn("material-symbols-outlined", s.icon)} aria-hidden="true">{icon}</span>
      </div>
      <div className={cn("font-display font-semibold text-text-main", s.title)}>{title}</div>
      {description && (
        <p className={cn("text-text-muted max-w-sm", s.desc)}>{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
