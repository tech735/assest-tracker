import * as React from 'react';
import type { Asset } from '@/types/asset';
import { cn } from '@/lib/utils';

export type DeviceKind = 'laptop' | 'desktop' | 'monitor' | 'phone' | 'tablet' | 'bag' | 'headphones' | 'keyboard' | 'mouse' | 'printer' | 'charger' | 'box';

// The category decides when it's specific; for accessories and anything else, the name and model do.
const BY_CATEGORY: Record<string, DeviceKind> = {
  laptop: 'laptop',
  notebook: 'laptop',
  desktop: 'desktop',
  monitor: 'monitor',
  display: 'monitor',
  phone: 'phone',
  mobile: 'phone',
  tablet: 'tablet',
  printer: 'printer',
};
const BY_NAME: [DeviceKind, RegExp][] = [
  ['bag', /\b(bag|backpack|sleeve|pouch|case)\b/],
  ['headphones', /head(phone|set)|earphone|earbud|airpods/],
  ['mouse', /\bmouse\b|mx master/],
  ['keyboard', /keyboard|mx keys/],
  ['charger', /charger|adapter|power ?bank|cable|dongle|\bhub\b/],
  ['printer', /printer|scanner|laserjet|deskjet|inkjet/],
  ['laptop', /laptop|notebook|macbook|thinkpad|latitude|elitebook|probook|vivobook|zenbook|ideapad|inspiron|vostro|pavilion|victus|viktus|surface laptop/],
  ['tablet', /tablet|ipad|galaxy tab/],
  ['phone', /phone|iphone|pixel|galaxy|mobile/],
  ['monitor', /monitor|display/],
  ['desktop', /desktop|tower|imac|optiplex|workstation|mini pc/],
];

export function deviceKind(asset: Pick<Asset, 'category' | 'name' | 'model' | 'brand'>): DeviceKind {
  const cat = (asset.category || '').trim().toLowerCase().replace(/s$/, '');
  if (BY_CATEGORY[cat]) return BY_CATEGORY[cat];
  const text = `${asset.name} ${asset.model || ''} ${asset.brand || ''}`.toLowerCase();
  return BY_NAME.find(([, re]) => re.test(text))?.[0] ?? 'box';
}

const FRAME = '#262a31';
const METAL = '#c9ced6';
const METAL_DARK = '#9aa1ab';

/** Flat device illustration (laptop, bag, monitor…) for asset cards. */
export function DeviceArt({ kind, className }: { kind: DeviceKind; className?: string }) {
  const id = React.useId().replace(/:/g, '');
  const screen = `url(#scr-${id})`;
  const tiles = (x: number, y: number, w: number, h: number) => (
    <g fill="#fff">
      <rect x={x + w * 0.1} y={y + h * 0.16} width={w * 0.08} height={h * 0.68} opacity={0.35} />
      <rect x={x + w * 0.24} y={y + h * 0.16} width={w * 0.2} height={h * 0.3} opacity={0.3} />
      <rect x={x + w * 0.47} y={y + h * 0.16} width={w * 0.12} height={h * 0.3} opacity={0.22} />
      <rect x={x + w * 0.24} y={y + h * 0.52} width={w * 0.35} height={h * 0.32} opacity={0.25} />
      <rect x={x + w * 0.62} y={y + h * 0.16} width={w * 0.26} height={h * 0.68} opacity={0.14} />
    </g>
  );

  const art: Record<DeviceKind, React.ReactNode> = {
    laptop: (
      <>
        <rect x="30" y="10" width="100" height="66" rx="4" fill={FRAME} />
        <rect x="34" y="14" width="92" height="58" fill={screen} />
        {tiles(34, 14, 92, 58)}
        <path d="M18 78h124l8 10H10z" fill={METAL} />
        <rect x="10" y="88" width="140" height="4" rx="2" fill={METAL_DARK} />
        <rect x="68" y="80" width="24" height="3" rx="1.5" fill={METAL_DARK} />
      </>
    ),
    monitor: (
      <>
        <rect x="20" y="6" width="120" height="74" rx="4" fill={FRAME} />
        <rect x="24" y="10" width="112" height="64" fill={screen} />
        {tiles(24, 10, 112, 64)}
        <rect x="74" y="80" width="12" height="12" fill={METAL_DARK} />
        <rect x="50" y="91" width="60" height="6" rx="3" fill={METAL} />
      </>
    ),
    desktop: (
      <>
        <rect x="8" y="12" width="98" height="62" rx="4" fill={FRAME} />
        <rect x="12" y="16" width="90" height="54" fill={screen} />
        {tiles(12, 16, 90, 54)}
        <rect x="52" y="74" width="10" height="12" fill={METAL_DARK} />
        <rect x="34" y="85" width="46" height="6" rx="3" fill={METAL} />
        <rect x="116" y="14" width="34" height="78" rx="4" fill="#3a3f48" />
        <rect x="122" y="22" width="22" height="3" rx="1.5" fill="#5b616c" />
        <rect x="122" y="29" width="22" height="3" rx="1.5" fill="#5b616c" />
        <circle cx="133" cy="80" r="3" fill="#7cc0ff" />
      </>
    ),
    phone: (
      <>
        <rect x="60" y="4" width="40" height="92" rx="7" fill={FRAME} />
        <rect x="63.5" y="11" width="33" height="78" rx="3" fill={screen} />
        {tiles(63.5, 11, 33, 78)}
        <rect x="74" y="6.5" width="12" height="2" rx="1" fill="#4a4f58" />
      </>
    ),
    tablet: (
      <>
        <rect x="24" y="12" width="112" height="76" rx="8" fill={FRAME} />
        <rect x="30" y="18" width="100" height="64" rx="2" fill={screen} />
        {tiles(30, 18, 100, 64)}
        <circle cx="27" cy="50" r="1.4" fill="#4a4f58" />
      </>
    ),
    bag: (
      <>
        <path d="M66 24c0-10 28-10 28 0" fill="none" stroke="#2f3a4a" strokeWidth="5" strokeLinecap="round" />
        <rect x="48" y="22" width="64" height="74" rx="16" fill="#3d4a5c" />
        <rect x="44" y="40" width="8" height="40" rx="4" fill="#2f3a4a" />
        <rect x="108" y="40" width="8" height="40" rx="4" fill="#2f3a4a" />
        <rect x="57" y="56" width="46" height="32" rx="9" fill="#4f5f75" />
        <path d="M61 64h38" stroke="#2f3a4a" strokeWidth="2" strokeLinecap="round" />
        <rect x="92" y="61" width="5" height="8" rx="1.5" fill={METAL} />
        <path d="M56 38c8-5 40-5 48 0" fill="none" stroke="#2f3a4a" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    headphones: (
      <>
        <path d="M44 66c0-48 72-48 72 0" fill="none" stroke="#2f343c" strokeWidth="7" strokeLinecap="round" />
        <rect x="32" y="56" width="24" height="34" rx="10" fill="#3a3f48" />
        <rect x="104" y="56" width="24" height="34" rx="10" fill="#3a3f48" />
        <rect x="50" y="60" width="8" height="26" rx="4" fill="#5b616c" />
        <rect x="102" y="60" width="8" height="26" rx="4" fill="#5b616c" />
      </>
    ),
    keyboard: (
      <>
        <rect x="12" y="34" width="136" height="46" rx="6" fill="#d5d9df" />
        {Array.from({ length: 3 }).flatMap((_, r) =>
          Array.from({ length: 12 }).map((__, c) => <rect key={`${r}-${c}`} x={18 + c * 10.4} y={40 + r * 10} width="8" height="7" rx="1.5" fill="#f5f6f8" />),
        )}
        <rect x="48" y="70" width="64" height="7" rx="1.5" fill="#f5f6f8" />
      </>
    ),
    mouse: (
      <>
        <rect x="56" y="14" width="48" height="76" rx="24" fill="#2f343c" />
        <path d="M80 14v30M56 44h48" stroke="#4a4f58" strokeWidth="2" />
        <rect x="77" y="24" width="6" height="12" rx="3" fill="#7d838d" />
      </>
    ),
    printer: (
      <>
        <rect x="44" y="12" width="72" height="32" rx="2" fill="#fff" stroke="#d5d9df" strokeWidth="2" />
        <rect x="22" y="38" width="116" height="40" rx="7" fill="#d5d9df" />
        <rect x="22" y="38" width="116" height="10" rx="5" fill="#c3c8d0" />
        <rect x="114" y="54" width="14" height="4" rx="2" fill="#7cc0ff" />
        <rect x="40" y="72" width="80" height="20" rx="2" fill="#fff" stroke="#d5d9df" strokeWidth="2" />
        <path d="M50 80h50M50 86h36" stroke="#c3c8d0" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    charger: (
      <>
        <rect x="36" y="30" width="44" height="40" rx="8" fill="#e8ebef" stroke="#c3c8d0" strokeWidth="2" />
        <rect x="46" y="22" width="5" height="10" rx="1.5" fill={METAL_DARK} />
        <rect x="65" y="22" width="5" height="10" rx="1.5" fill={METAL_DARK} />
        <path d="M80 52c22 0 16 32 40 26" fill="none" stroke="#3a3f48" strokeWidth="4" strokeLinecap="round" />
        <rect x="116" y="70" width="18" height="12" rx="3" fill="#3a3f48" />
      </>
    ),
    box: (
      <>
        <path d="M80 14l50 22v42L80 96 30 78V36z" fill="#d9c3a0" />
        <path d="M80 14l50 22-50 20-50-20z" fill="#e8d6b8" />
        <path d="M80 56v40" stroke="#c4aa82" strokeWidth="2" />
        <path d="M55 25l50 21" stroke="#c4aa82" strokeWidth="6" />
      </>
    ),
  };

  return (
    <svg viewBox="0 0 160 100" className={cn('h-full w-full', className)} role="img" aria-label={kind}>
      <defs>
        <linearGradient id={`scr-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5aaef5" />
          <stop offset="1" stopColor="#1f6fd1" />
        </linearGradient>
      </defs>
      {art[kind]}
    </svg>
  );
}
