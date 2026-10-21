import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { categoryIcon, initials, STATUS_META, type Tone } from '@/lib/assetMeta';
import type { AssetStatus } from '@/types/asset';

const TONE_CLASSES: Record<Tone, { pill: string; dot: string; bubble: string }> = {
  success: { pill: 'bg-success-soft text-success-strong', dot: 'bg-success', bubble: 'bg-success-soft text-success-strong' },
  warning: { pill: 'bg-warning-soft text-warning-strong', dot: 'bg-warning', bubble: 'bg-warning-soft text-warning-strong' },
  destructive: {
    pill: 'bg-destructive-soft text-destructive-strong',
    dot: 'bg-destructive',
    bubble: 'bg-destructive-soft text-destructive-strong',
  },
  info: { pill: 'bg-info-soft text-info-strong', dot: 'bg-info', bubble: 'bg-info-soft text-info-strong' },
  special: { pill: 'bg-special-soft text-special-strong', dot: 'bg-special', bubble: 'bg-special-soft text-special-strong' },
  quiet: { pill: 'bg-quiet-soft text-quiet-strong', dot: 'bg-quiet', bubble: 'bg-quiet-soft text-quiet-strong' },
};

export const toneClasses = (tone: Tone) => TONE_CLASSES[tone];

/** Status pill with dot. Color is always paired with a text label. */
export function Pill({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 text-xs font-medium',
        dot ? 'pl-2 pr-2.5' : 'px-2',
        t.pill,
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.dot)} aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: AssetStatus; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.available;
  return (
    <Pill tone={meta.tone} className={className}>
      {meta.label}
    </Pill>
  );
}

export function IconBubble({
  icon: Icon,
  tone = 'info',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dims = { sm: 'h-8 w-8 rounded-lg [&_svg]:h-4 [&_svg]:w-4', md: 'h-9 w-9 rounded-[10px] [&_svg]:h-[18px] [&_svg]:w-[18px]', lg: 'h-10 w-10 rounded-[10px] [&_svg]:h-5 [&_svg]:w-5' }[size];
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', dims, TONE_CLASSES[tone].bubble, className)}>
      <Icon />
    </span>
  );
}

export function AssetThumb({ category, size = 'md', className }: { category?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }) {
  const Icon = categoryIcon(category);
  const dims = {
    sm: 'h-8 w-8 rounded-lg [&_svg]:h-4 [&_svg]:w-4',
    md: 'h-9 w-9 rounded-lg [&_svg]:h-[18px] [&_svg]:w-[18px]',
    lg: 'h-12 w-12 rounded-xl [&_svg]:h-6 [&_svg]:w-6',
    xl: 'h-16 w-16 rounded-2xl [&_svg]:h-8 [&_svg]:w-8',
  }[size];
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center bg-muted text-muted-foreground', dims, className)}>
      <Icon />
    </span>
  );
}

export function PersonAvatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name?: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const dims = {
    xs: 'h-5 w-5 text-[9px]',
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-12 w-12 text-[15px]',
    xl: 'h-[72px] w-[72px] text-2xl',
  }[size];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft font-semibold text-link',
        dims,
        className,
      )}
      aria-hidden
    >
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : initials(name)}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumb?: { label: string; to?: string }[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {breadcrumb && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground">
          {breadcrumb.map((b, i) => (
            <React.Fragment key={b.label}>
              {i > 0 && <span className="text-faint">/</span>}
              {b.to ? (
                <Link to={b.to} className="hover:text-foreground">
                  {b.label}
                </Link>
              ) : (
                <span className="text-foreground/80">{b.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight sm:text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn('rounded-xl border bg-card', className)}>
      {(title || action) && (
        <header className="flex items-center gap-2 px-5 pt-4">
          {title && <h2 className="flex-1 text-[15px] font-semibold">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn('p-5', title || action ? 'pt-3' : '', bodyClassName)}>{children}</div>
    </section>
  );
}

export function CardLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-[13px] font-medium text-link hover:underline">
      {children}
    </Link>
  );
}

export function ProgressBar({ value, tone = 'info', className }: { value: number; tone?: Tone | 'primary'; className?: string }) {
  const fill = tone === 'primary' ? 'bg-primary' : TONE_CLASSES[tone].dot;
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-[width] duration-300 ease-standard', fill)} style={{ width: `${Math.max(2, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function KeyValue({ label, children, icon: Icon }: { label: string; children: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-start gap-2.5 text-[13px]">
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-faint" />}
      <span className="w-[120px] shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 font-medium text-foreground [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-faint">{label}</p>
      <div className="mt-0.5 truncate text-[13px] font-medium text-foreground">{children}</div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}>
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <div>
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ListRow({
  icon,
  title,
  subtitle,
  right,
  to,
  onClick,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  to?: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>}
      </span>
      {right}
      {(to || onClick) && !right && <ChevronRight className="h-4 w-4 shrink-0 text-faint" />}
    </>
  );
  const cls = cn('flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-100', (to || onClick) && 'hover:bg-subtle', className);
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

export function PageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label={label}>
      <div className="h-8 w-48 animate-pulse rounded-lg bg-muted" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/70" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-muted/60" />
    </div>
  );
}
