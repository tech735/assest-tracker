import {
  Headphones,
  Laptop,
  Monitor,
  Package,
  Printer,
  Smartphone,
  Tablet,
  type LucideIcon,
} from 'lucide-react';
import { differenceInCalendarDays, format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';
import type { Asset, AssetStatus, Employee, Location } from '@/types/asset';

export type Tone = 'success' | 'warning' | 'destructive' | 'info' | 'special' | 'quiet';

export const STATUS_META: Record<AssetStatus, { label: string; tone: Tone }> = {
  available: { label: 'Available', tone: 'success' },
  assigned: { label: 'Assigned', tone: 'info' },
  repair: { label: 'In repair', tone: 'warning' },
  lost: { label: 'Lost', tone: 'destructive' },
  retired: { label: 'Retired', tone: 'quiet' },
};

export const STATUS_ORDER: AssetStatus[] = ['assigned', 'available', 'retired', 'repair', 'lost'];

export const EMPLOYEE_STATUS_META: Record<Employee['status'], { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'success' },
  remote: { label: 'Remote', tone: 'info' },
  'on-leave': { label: 'On leave', tone: 'quiet' },
  inactive: { label: 'Inactive', tone: 'quiet' },
  offboarded: { label: 'Offboarded', tone: 'destructive' },
};

export const LOCATION_TYPE_META: Record<Location['type'], { label: string; tone: Tone }> = {
  office: { label: 'Office', tone: 'info' },
  warehouse: { label: 'Warehouse', tone: 'warning' },
  outlet: { label: 'Outlet', tone: 'special' },
  remote: { label: 'Remote', tone: 'quiet' },
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  laptop: Laptop,
  laptops: Laptop,
  desktop: Monitor,
  desktops: Monitor,
  monitor: Monitor,
  monitors: Monitor,
  phone: Smartphone,
  phones: Smartphone,
  tablet: Tablet,
  tablets: Tablet,
  printer: Printer,
  printers: Printer,
  accessory: Headphones,
  accessories: Headphones,
};

export const categoryIcon = (category?: string): LucideIcon =>
  CATEGORY_ICONS[(category || '').toLowerCase()] ?? Package;

export const titleCase = (s?: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '');

export const initials = (name?: string) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** The legacy data stores the main store as "Warehouse"; the app has always shown it as "Central Warehouse". */
export const displayLocation = (name?: string) => (name === 'Warehouse' ? 'Central Warehouse' : name || '—');

const toDate = (d?: string | Date | null) => {
  if (!d) return null;
  const date = typeof d === 'string' ? parseISO(d) : d;
  return isValid(date) ? date : null;
};

export const formatDate = (d?: string | Date | null, pattern = 'dd MMM yyyy') => {
  const date = toDate(d);
  return date ? format(date, pattern) : '—';
};

export const timeAgo = (d?: string | Date | null) => {
  const date = toDate(d);
  return date ? `${formatDistanceToNowStrict(date)} ago` : '';
};

/** Days from today until the date (negative = in the past). null when no date. */
export const daysUntil = (d?: string | Date | null) => {
  const date = toDate(d);
  return date ? differenceInCalendarDays(date, new Date()) : null;
};

export const formatMoney = (amount?: number | null, currency = 'INR') => {
  if (amount == null || Number.isNaN(amount)) return '—';
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return amount.toLocaleString();
  }
};

/** Straight-line depreciation, default 3-year useful life (common for IT equipment). */
export const bookValue = (asset: Pick<Asset, 'purchaseCost' | 'purchaseDate'>, lifeYears = 3) => {
  const cost = asset.purchaseCost ?? 0;
  const start = toDate(asset.purchaseDate);
  if (!cost || !start) return null;
  const ageYears = Math.max(0, differenceInCalendarDays(new Date(), start) / 365);
  const value = Math.max(0, cost * (1 - ageYears / lifeYears));
  return { value, depreciatedPct: Math.min(100, Math.round((1 - value / cost) * 100)) };
};

export type CoverageState = { tone: Tone; label: string; days: number | null; pct: number };

/** Coverage summary for an AMC or warranty window. */
export const coverage = (start?: string, end?: string): CoverageState | null => {
  const days = daysUntil(end);
  if (days === null) return null;
  const s = toDate(start);
  const e = toDate(end)!;
  const total = s ? Math.max(1, differenceInCalendarDays(e, s)) : 365;
  const pct = Math.max(0, Math.min(1, days / total));
  if (days < 0) return { tone: 'destructive', label: `Expired ${Math.abs(days)} days ago`, days, pct: 0 };
  if (days <= 30) return { tone: days <= 7 ? 'destructive' : 'warning', label: `${days} days left`, days, pct };
  return { tone: 'success', label: `${days} days left`, days, pct };
};

/** Asset status for display: an assigned/available asset whose AMC ends within 30 days is flagged. */
export const amcExpiring = (asset: Asset) => {
  const d = daysUntil(asset.amcEndDate);
  return d !== null && d >= 0 && d <= 30;
};
