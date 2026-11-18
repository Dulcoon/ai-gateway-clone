"use client";

import { cn } from "@/shared/utils/cn";

export default function Card({
  children,
  title,
  subtitle,
  icon,
  action,
  padding = "md",
  hover = false,
  elev = false,
  className,
  ...props
}) {
  const paddings = {
    none: "",
    xs: "p-3",
    sm: "p-3.5",
    md: "p-4",
    lg: "p-5",
  };

  return (
    <div
      className={cn(
        "bg-surface border border-border-strong rounded-lg shadow-[var(--shadow-soft)]",
        elev && "shadow-[var(--shadow-elev)]",
        hover && "hover:border-primary/40 hover:bg-surface-2/40 transition-colors cursor-pointer",
        paddings[padding],
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {icon && (
              <div className="p-1.5 rounded-md bg-bg-alt text-text-muted">
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
              </div>
            )}
            <div>
              {title && (
                <h3 className="font-display text-sm font-semibold tracking-tight text-text-main">{title}</h3>
              )}
              {subtitle && (
                <p className="text-xs text-text-muted">{subtitle}</p>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

Card.Section = function CardSection({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "p-3 rounded-md",
        "bg-bg-alt border border-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Row = function CardRow({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "px-3 py-2.5 transition-colors",
        "border-b border-border last:border-b-0",
        "hover:bg-surface-2/50",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.ListItem = function CardListItem({
  children,
  actions,
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between px-3 py-2.5",
        "border-b border-border last:border-b-0",
        "hover:bg-surface-2/50 transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {actions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  );
};
