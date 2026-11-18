"use client";

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/utils/cn";
import { APP_CONFIG } from "@/shared/constants/config";
import useSettingsStore from "@/store/settingsStore";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "space_dashboard" },
  { href: "/dashboard/endpoint", label: "Endpoint & Key", icon: "api" },
  { href: "/dashboard/providers", label: "Providers", icon: "dns" },
  { href: "/dashboard/combos", label: "Combo & Vision Adapter", icon: "layers" },
  { href: "/dashboard/usage", label: "Usage", icon: "bar_chart" },
  { href: "/dashboard/token-saver", label: "Token Saver", icon: "savings" },
];

const debugItems = [
  { href: "/dashboard/console-log", label: "Console Log", icon: "terminal" },
  { href: "/dashboard/translator", label: "Translator", icon: "translate" },
];

function NavRow({ href, icon, label, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors",
        active ? "bg-primary/10" : "hover:bg-surface-2"
      )}
    >
      {/* Indikator aktif */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary transition-opacity",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <span
        className={cn(
          "grid place-items-center size-8 rounded-md shrink-0 transition-colors",
          active
            ? "bg-primary/15 text-primary"
            : "text-text-muted group-hover:bg-surface-3 group-hover:text-text-main"
        )}
      >
        <span className={cn("material-symbols-outlined text-[18px]", active && "fill-1")}>{icon}</span>
      </span>
      <span
        className={cn(
          "text-[13px] truncate",
          active
            ? "font-semibold text-text-main"
            : "font-medium text-text-muted group-hover:text-text-main"
        )}
      >
        {label}
      </span>
    </Link>
  );
}

export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [enableTranslator, setEnableTranslator] = useState(false);

  useEffect(() => {
    useSettingsStore.getState().fetchSettings().then((data) => {
      if (data?.enableTranslator) setEnableTranslator(true);
    });
  }, []);

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/dashboard/endpoint") return pathname.startsWith("/dashboard/endpoint");
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-bg-alt min-h-full">
      {/* Brand */}
      <div className="px-4 py-4 flex items-center gap-2.5 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0" onClick={onClose}>
          <div className="flex items-center justify-center size-9 rounded-lg bg-brand-500 shadow-[var(--shadow-warm)] shrink-0">
            <img src="/logo-mark.svg" alt="" className="h-[18px] w-auto" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="font-display text-[15px] font-semibold tracking-tight text-text-main truncate">
              {APP_CONFIG.name}
            </div>
            <span className="font-mono text-[10px] text-text-subtle">
              v{APP_CONFIG.version} · stable
            </span>
          </div>
        </Link>
      </div>

      {/* Navigasi utama */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => (
          <NavRow
            key={item.href}
            {...item}
            active={isActive(item.href)}
            onClick={onClose}
          />
        ))}

        {/* System */}
        <div className="pt-4 mt-2 mb-1.5 flex items-center gap-2 px-2">
          <span className="font-mono text-[10px] font-medium text-text-subtle uppercase tracking-[0.14em]">
            System
          </span>
          <span className="h-px flex-1 bg-border" aria-hidden="true" />
        </div>

        {debugItems.map((item) => {
          const show = item.href !== "/dashboard/translator" || enableTranslator;
          return show ? (
            <NavRow
              key={item.href}
              {...item}
              active={isActive(item.href)}
              onClick={onClose}
            />
          ) : null;
        })}
      </nav>

      {/* Settings dipin di bawah */}
      <div className="px-3 py-3 border-t border-border">
        <NavRow
          href="/dashboard/profile"
          icon="settings"
          label="Settings"
          active={isActive("/dashboard/profile")}
          onClick={onClose}
        />
      </div>
    </aside>
  );
}

Sidebar.propTypes = {
  onClose: PropTypes.func,
};
