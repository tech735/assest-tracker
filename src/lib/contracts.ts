import type { Asset, ContractCoverage, ContractKind, ServiceContract } from '@/types/asset';

export const CONTRACT_KIND_LABEL: Record<ContractKind, string> = { amc: 'AMC', warranty: 'Warranty' };

export const COVERAGE_META: Record<ContractCoverage, { label: string; hint: string }> = {
  comprehensive: { label: 'Comprehensive', hint: 'Parts and labour included' },
  non_comprehensive: { label: 'Non-comprehensive', hint: 'Service and labour included — parts billed separately' },
};

/** "Laptops" vs "laptop" vs "LAPTOP": categories are typed by hand, so compare loosely. */
export const sameCategory = (a?: string, b?: string) => {
  const norm = (s?: string) => (s || '').trim().toLowerCase().replace(/s$/, '');
  return !!a && !!b && norm(a) === norm(b);
};

/** Total including tax, from units × rate when no total was entered. */
export const contractTotal = (c: Pick<ServiceContract, 'units' | 'rate' | 'taxPercent' | 'totalAmount'>) => {
  if (c.totalAmount != null) return c.totalAmount;
  if (c.units == null || c.rate == null) return undefined;
  return Math.round(c.units * c.rate * (1 + (c.taxPercent || 0) / 100) * 100) / 100;
};

export const contractIdOf = (asset: Asset, kind: ContractKind) => (kind === 'amc' ? asset.amcContractId : asset.warrantyContractId);

