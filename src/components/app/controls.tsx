import * as React from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, Search, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Tone } from '@/lib/assetMeta';
import { toneClasses } from './primitives';

/* ---------- KPI card (🧩 KPI card) ---------- */

export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return <div className={cn('h-8', className)} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${28 - ((v - min) / range) * 24}`).join(' ');
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn('h-8 w-full', className)} aria-hidden>
      <polyline points={pts} fill="none" stroke="hsl(var(--ring))" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function KpiCard({
  label,
  value,
  caption,
  delta,
  deltaTone = 'success',
  icon: Icon,
  iconTone,
  trend,
  to,
  compact,
}: {
  label: string;
  value: React.ReactNode;
  caption?: string;
  delta?: string;
  deltaTone?: Tone;
  icon?: LucideIcon;
  iconTone?: Tone;
  trend?: number[];
  to?: string;
  compact?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <p className="flex-1 truncate text-[13px] font-medium text-muted-foreground">{label}</p>
        {Icon && <Icon className={cn('h-4 w-4 shrink-0', iconTone ? toneClasses(iconTone).bubble.split(' ')[1] : 'text-faint')} />}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <p className={cn('font-semibold leading-none tracking-tight tabular', compact ? 'text-2xl' : 'text-[30px]')}>{value}</p>
        {delta && <span className={cn('mb-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium', toneClasses(deltaTone).pill)}>{delta}</span>}
      </div>
      {trend && !compact && <Sparkline data={trend} className="mt-3" />}
      {caption && <p className={cn('truncate text-xs text-faint', compact ? 'mt-1.5' : 'mt-2')}>{caption}</p>}
    </>
  );
  const cls = cn(
    'block rounded-xl border bg-card transition-[border-color,box-shadow] duration-150',
    compact ? 'p-3.5' : 'px-5 py-[18px]',
    to && 'hover:border-border-strong hover:shadow-card focus-visible:ring-[3px]',
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* ---------- Underline view tabs with counts (🧩 Tab) ---------- */

export interface ViewTab<T extends string> {
  value: T;
  label: string;
  count?: number | string;
}

export function ViewTabs<T extends string>({
  tabs,
  value,
  onChange,
  trailing,
  className,
}: {
  tabs: ViewTab<T>[];
  value: T;
  onChange: (v: T) => void;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-5 overflow-x-auto border-b scrollbar-hide sm:gap-6', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button type="button"
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative flex h-10 shrink-0 items-center gap-1.5 text-sm font-medium transition-colors duration-150',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-xs leading-5 tabular', active ? 'bg-primary-soft text-link' : 'bg-muted text-muted-foreground')}>
                {t.count}
              </span>
            )}
            <span
              aria-hidden
              className={cn(
                'absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary transition-transform duration-200 ease-standard',
                active ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </button>
        );
      })}
      {trailing}
    </div>
  );
}

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('inline-flex rounded-lg bg-muted p-0.5', className)} role="radiogroup">
      {options.map((o) => (
        <button type="button"
          key={o.value}
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 whitespace-nowrap rounded-md font-medium transition-[background-color,color,box-shadow] duration-150',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
            o.value === value ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Search field ---------- */

export const SearchField = React.forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; placeholder?: string; className?: string; autoFocus?: boolean }
>(({ value, onChange, placeholder = 'Search', className, autoFocus }, ref) => (
  <label className={cn('relative flex h-8 items-center', className)}>
    <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-faint" />
    <input
      ref={ref}
      type="search"
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-full w-full rounded-lg border border-input bg-card pl-8 pr-7 text-[13px] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-faint hover:border-border-strong focus:border-ring focus:ring-[3px] focus:ring-ring/20 [&::-webkit-search-cancel-button]:hidden"
    />
    {value && (
      <button type="button" aria-label="Clear search" onClick={() => onChange('')} className="absolute right-2 text-faint hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </label>
));
SearchField.displayName = 'SearchField';

/* ---------- Filter chip with multi-select popover (🧩 Filter chip) ---------- */

export function FilterChip({
  label,
  options,
  selected,
  onChange,
  searchable,
}: {
  label: string;
  options: { value: string; label: string; count?: number }[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
}) {
  const [q, setQ] = React.useState('');
  const active = selected.length > 0;
  const shown = searchable && q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  const summary = active
    ? `${label}: ${selected
        .map((v) => options.find((o) => o.value === v)?.label ?? v)
        .slice(0, 2)
        .join(', ')}${selected.length > 2 ? ` +${selected.length - 2}` : ''}`
    : label;
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);

  return (
    <Popover onOpenChange={(o) => !o && setQ('')}>
      <div
        className={cn(
          'inline-flex h-8 shrink-0 items-center rounded-lg border text-[13px] font-medium transition-colors duration-150',
          active ? 'border-ring bg-primary-soft text-link' : 'border-border bg-card text-foreground hover:bg-background',
        )}
      >
        <PopoverTrigger className="flex h-full items-center gap-1.5 pl-2.5 pr-2 outline-none">
          <span className="max-w-[220px] truncate">{summary}</span>
          {!active && <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
        </PopoverTrigger>
        {active && (
          <button type="button" aria-label={`Clear ${label} filter`} onClick={() => onChange([])} className="flex h-full items-center pr-2 hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <PopoverContent align="start" className="w-60 p-1.5">
        {searchable && (
          <div className="p-1">
            <SearchField value={q} onChange={setQ} placeholder={`Search ${label.toLowerCase()}`} autoFocus />
          </div>
        )}
        <div className="max-h-64 overflow-y-auto">
          {shown.map((o) => {
            const on = selected.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-muted"
              >
                <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-border-strong bg-card')}>
                  {on && <Check className="h-3 w-3" />}
                </span>
                <span className="flex-1 truncate">{o.label}</span>
                {o.count !== undefined && <span className="text-xs text-faint tabular">{o.count}</span>}
              </button>
            );
          })}
          {shown.length === 0 && <p className="px-2 py-3 text-center text-xs text-muted-foreground">No options</p>}
        </div>
        {active && (
          <div className="mt-1 border-t px-1 pt-1">
            <button type="button" onClick={() => onChange([])} className="w-full rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-link hover:bg-muted">
              Clear
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ---------- Floating bulk action bar (🧩 Bulk action bar) ---------- */

export interface BulkBarAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  destructive?: boolean;
}

export function BulkBar({
  count,
  actions,
  overflow,
  onClear,
  onSelectAll,
  totalMatching,
}: {
  count: number;
  actions: BulkBarAction[];
  overflow?: React.ReactNode;
  onClear: () => void;
  onSelectAll?: () => void;
  totalMatching?: number;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClear();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClear]);

  if (count === 0) return null;
  return (
    <div
      role="toolbar"
      aria-label="Bulk actions"
      className="fixed bottom-[88px] left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 animate-bar-in items-center gap-1 rounded-xl bg-foreground py-1.5 pl-4 pr-1.5 text-background shadow-elevated md:bottom-6"
    >
      <span className="whitespace-nowrap pr-1 text-sm font-semibold tabular">{count} selected</span>
      {onSelectAll && totalMatching !== undefined && totalMatching > count && (
        <button type="button" onClick={onSelectAll} className="hidden whitespace-nowrap px-2 text-xs font-medium text-background/70 underline-offset-2 hover:underline lg:inline">
          Select all {totalMatching}
        </button>
      )}
      <span className="mx-1 h-5 w-px bg-background/25" />
      <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
        {actions.map((a) => (
          <button type="button"
            key={a.label}
            onClick={a.onClick}
            className={cn('flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-background/10', a.destructive && 'text-red-300')}
            title={a.label}
          >
            <a.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>
      {overflow}
      <button type="button" onClick={onClear} aria-label="Clear selection" className="ml-0.5 rounded-lg p-1.5 text-background/60 hover:bg-background/10 hover:text-background">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

/* ---------- Simple pagination footer ---------- */

export function PaginationFooter({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize?: (n: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const nums: (number | '…')[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) nums.push(i);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
      <p className="flex-1 text-[13px] text-muted-foreground tabular">
        Showing {from}–{to} of {total.toLocaleString()}
      </p>
      {onPageSize && (
        <label className="hidden items-center gap-1.5 text-[13px] text-muted-foreground sm:flex">
          Rows per page
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} className="rounded-md border bg-card px-1.5 py-0.5 text-foreground">
            {[10, 25, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-md px-2 py-1 text-[13px] text-muted-foreground hover:bg-muted disabled:opacity-40" aria-label="Previous page">
          ‹
        </button>
        {nums.map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="px-1 text-[13px] text-faint">…</span>
          ) : (
            <button type="button"
              key={n}
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={cn('h-7 min-w-7 rounded-md px-1.5 text-[13px] font-medium tabular', n === page ? 'border border-border-strong bg-card text-foreground' : 'text-muted-foreground hover:bg-muted')}
            >
              {n}
            </button>
          ),
        )}
        <button type="button" disabled={page >= pages} onClick={() => onPage(page + 1)} className="rounded-md px-2 py-1 text-[13px] text-muted-foreground hover:bg-muted disabled:opacity-40" aria-label="Next page">
          ›
        </button>
      </div>
    </div>
  );
}
