"use client";

import { cn } from "@/shared/utils/cn";

export default function SegmentedControl({
  options = [],
  value,
  onChange,
  size = "md",
  className,
}) {
  const sizes = {
    sm: "h-6 text-xs",
    md: "h-7 text-[13px]",
    lg: "h-8 text-sm",
  };

  return (
    <div
      role="group"
      className={cn(
        "inline-flex items-center p-0.5 rounded-md overflow-x-auto",
        "bg-surface-2 border border-border",
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "shrink-0 px-3 rounded-[5px] font-medium transition-colors",
            sizes[size],
            value === option.value
              ? "bg-surface text-text-main shadow-[var(--shadow-soft)]"
              : "text-text-muted hover:text-text-main"
          )}
        >
          {option.icon && (
            <span className="material-symbols-outlined text-[15px] mr-1.5">
              {option.icon}
            </span>
          )}
          {option.label}
        </button>
      ))}
    </div>
  );
}
