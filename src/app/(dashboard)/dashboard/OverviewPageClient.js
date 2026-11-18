"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/shared/utils/cn";
import { Card, Badge, Button, EmptyState } from "@/shared/components";

/* ---------- format ---------- */
const fmtInt = (n) => {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US");
};

const fmtTokens = (n) => {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

const shortProvider = (p) => {
  if (!p) return "—";
  const s = String(p);
  return s.length > 18 ? `${s.slice(0, 16)}…` : s;
};

const timeAgo = (ts) => {
  if (!ts) return "—";
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return "—";
  const s = Math.max(0, (Date.now() - d) / 1000);
  if (s < 60) return `${Math.floor(s)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

/* ---------- sparkline dari usage/stats.last10Minutes ---------- */
function Sparkline({ points }) {
  const w = 560;
  const h = 96;
  const pad = 6;
  const values = points?.length ? points.map((p) => p.requests || 0) : [];
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? (w - pad * 2) / (values.length - 1) : 0;
  const xy = values.map((v, i) => [pad + i * step, h - pad - (v / max) * (h - pad * 2)]);
  const line = xy.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = xy.length ? `${line} L${xy[xy.length - 1][0].toFixed(1)},${h - pad} L${xy[0][0].toFixed(1)},${h - pad} Z` : "";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-24" role="img" aria-label="Traffic 10 menit terakhir">
      <defs>
        <linearGradient id="ovSpark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((t) => (
        <line key={t} x1={pad} x2={w - pad} y1={h * t} y2={h * t} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="3 4" />
      ))}
      {area ? <path d={area} fill="url(#ovSpark)" /> : null}
      {line ? <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" /> : null}
    </svg>
  );
}

function StatCard({ label, value, hint, tone }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{label}</span>
      <span className={cn("font-display text-2xl font-semibold leading-none tracking-tight", tone || "text-text-main")}>
        {value}
      </span>
      {hint ? <span className="text-[11px] text-text-muted">{hint}</span> : null}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-surface" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="h-56 rounded-lg border border-border bg-surface lg:col-span-2" />
        <div className="h-56 rounded-lg border border-border bg-surface" />
      </div>
    </div>
  );
}

export default function OverviewPageClient() {
  const [state, setState] = useState({ loading: true, error: "", stats: null, connections: [], combos: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [statsRes, provRes, comboRes] = await Promise.all([
          fetch("/api/usage/stats?period=today", { cache: "no-store" }),
          fetch("/api/providers", { cache: "no-store" }),
          fetch("/api/combos", { cache: "no-store" }),
        ]);
        const stats = statsRes.ok ? await statsRes.json() : null;
        const prov = provRes.ok ? await provRes.json() : { connections: [] };
        const combos = comboRes.ok ? await comboRes.json() : { combos: [] };
        if (!alive) return;
        setState({ loading: false, error: "", stats, connections: prov.connections || [], combos: combos.combos || [] });
      } catch (e) {
        if (!alive) return;
        setState({ loading: false, error: "Gagal memuat ringkasan. Coba muat ulang.", stats: null, connections: [], combos: [] });
      }
    })();
    return () => { alive = false; };
  }, []);

  const activeConns = useMemo(() => state.connections.filter((c) => c.isActive !== false), [state.connections]);
  const errorConns = useMemo(() => state.connections.filter((c) => c.errorCode || c.testStatus === "error"), [state.connections]);
  const recent = state.stats?.recentRequests || [];
  const activeNow = state.stats?.activeRequests?.length || 0;

  if (state.loading) return <Skeleton />;

  return (
    <div className="flex flex-col gap-4">
      {/* Aksi cepat */}
      <div className="flex flex-wrap items-center gap-2">
        <Button as={Link} href="/dashboard/endpoint" icon="add">Buat Key</Button>
        <Button as={Link} href="/dashboard/providers/new" variant="outline" icon="dns">Tambah Provider</Button>
        <Button as={Link} href="/dashboard/combos" variant="ghost" icon="layers">Combo Baru</Button>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">
          {state.connections.length} koneksi · {state.combos.length} combo
        </span>
      </div>

      {state.error ? (
        <EmptyState icon="error" title="Tidak bisa memuat data" description={state.error} />
      ) : null}

      {/* Metrik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <StatCard label="Requests Hari Ini" value={fmtInt(state.stats?.totalRequests)} hint={`${activeNow} aktif sekarang`} />
        </Card>
        <Card>
          <StatCard label="Input Tokens" value={fmtTokens(state.stats?.totalPromptTokens)} hint={`${fmtTokens(state.stats?.totalCachedTokens)} cached`} />
        </Card>
        <Card>
          <StatCard label="Output Tokens" value={fmtTokens(state.stats?.totalCompletionTokens)} />
        </Card>
        <Card>
          <StatCard label="Est. Cost" value={fmtCost(state.stats?.totalCost)} hint="Estimasi, bukan tagihan" />
        </Card>
      </div>

      {/* Traffic + status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card
          title="Traffic"
          subtitle="Request per 10 menit"
          icon="monitoring"
          className="lg:col-span-2"
          action={<Badge variant="primary" dot>Live</Badge>}
        >
          {state.stats?.last10Minutes?.length ? (
            <Sparkline points={state.stats.last10Minutes} />
          ) : (
            <EmptyState size="sm" icon="bar_chart" title="Belum ada traffic" />
          )}
        </Card>

        <Card
          title="Status Koneksi"
          subtitle={`${activeConns.length} aktif · ${errorConns.length} error`}
          icon="dns"
          action={<Link href="/dashboard/providers" className="font-mono text-[11px] text-primary hover:underline">Kelola</Link>}
        >
          {state.connections.length === 0 ? (
            <EmptyState size="sm" icon="dns" title="Belum ada provider" action={<Button size="sm" variant="outline" as={Link} href="/dashboard/providers/new">Tambah</Button>} />
          ) : (
            <div className="flex flex-col -mx-3">
              {state.connections.slice(0, 5).map((c) => {
                const bad = Boolean(c.errorCode) || c.testStatus === "error";
                const off = c.isActive === false;
                return (
                  <Link
                    key={c.id}
                    href={`/dashboard/providers/${c.provider}`}
                    className="flex items-center gap-2.5 px-3 py-2 border-b border-border last:border-b-0 hover:bg-surface-2/50 transition-colors"
                  >
                    <span className={cn("size-1.5 rounded-full shrink-0", bad ? "bg-danger" : off ? "bg-text-subtle" : "bg-success")} aria-hidden="true" />
                    <span className="flex-1 min-w-0 truncate text-[13px] text-text-main">{c.providerSpecificData?.nodeName || c.name || c.provider}</span>
                    <span className="font-mono text-[10px] text-text-subtle hidden sm:inline">{c.defaultModel || "—"}</span>
                    <Badge variant={bad ? "error" : off ? "default" : "success"} size="sm">
                      {bad ? "error" : off ? "nonaktif" : "aktif"}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Request terakhir + combo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card
          title="Request Terakhir"
          subtitle="Dari usage history"
          icon="history"
          className="lg:col-span-2"
          action={<Link href="/dashboard/usage" className="font-mono text-[11px] text-primary hover:underline">Detail</Link>}
        >
          {recent.length === 0 ? (
            <EmptyState size="sm" icon="inbox" title="Belum ada request tercatat" description="Request yang lewat endpoint akan muncul di sini." />
          ) : (
            <div className="flex flex-col -mx-3">
              {recent.slice(0, 7).map((r, i) => {
                const bad = r.status && r.status !== "ok" && r.status !== "200";
                return (
                  <div key={`${r.timestamp}-${i}`} className="flex items-center gap-2.5 px-3 py-2 border-b border-border last:border-b-0">
                    <span className={cn("size-1.5 rounded-full shrink-0", bad ? "bg-danger" : "bg-success")} aria-hidden="true" />
                    <span className="flex-1 min-w-0 truncate font-mono text-[12px] text-text-main">{r.model}</span>
                    <span className="font-mono text-[11px] text-text-muted hidden md:inline">{shortProvider(r.provider)}</span>
                    <span className="font-mono text-[11px] text-text-subtle hidden sm:inline">
                      {fmtInt(r.promptTokens)}↑ {fmtInt(r.completionTokens)}↓
                    </span>
                    <span className="font-mono text-[10px] text-text-subtle w-16 text-right shrink-0">{timeAgo(r.timestamp)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="Combo Aktif"
          subtitle={`${state.combos.length} combo`}
          icon="layers"
          action={<Link href="/dashboard/combos" className="font-mono text-[11px] text-primary hover:underline">Semua</Link>}
        >
          {state.combos.length === 0 ? (
            <EmptyState size="sm" icon="layers" title="Belum ada combo" action={<Button size="sm" variant="outline" as={Link} href="/dashboard/combos">Buat</Button>} />
          ) : (
            <div className="flex flex-col -mx-3">
              {state.combos.slice(0, 5).map((c) => (
                <Link key={c.id} href="/dashboard/combos" className="flex items-center gap-2.5 px-3 py-2 border-b border-border last:border-b-0 hover:bg-surface-2/50 transition-colors">
                  <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-text-main">{c.name}</span>
                  <span className="font-mono text-[10px] text-text-subtle">{c.models?.length || 0} model</span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
