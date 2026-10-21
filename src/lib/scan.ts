import type { Asset } from '@/types/asset';

/** Resolve a scanned value to an asset: QR links to /assets/<id>, or a printed tag / serial number. */
export function findAssetByCode(assets: Asset[], raw: string): Asset | undefined {
  const code = raw.trim();
  const fromUrl = code.match(/assets\/([0-9a-f-]{36})/i)?.[1];
  if (fromUrl) return assets.find((a) => a.id === fromUrl);
  const c = code.toLowerCase();
  return assets.find((a) => a.assetTag?.toLowerCase() === c || a.serialNumber?.toLowerCase() === c || a.id === code);
}
