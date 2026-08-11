// AMC (Annual Maintenance Contract) status helpers.
//
// AMC_REMINDER_DAYS is the single source of truth for reminder windows used by
// the AMC status badge below and by the scheduled amc-expiry-check edge
// function (supabase/functions/amc-expiry-check/index.ts), which cannot import
// from src/ since it runs on Deno. Keep the two arrays in sync if this changes.
export const AMC_REMINDER_DAYS = [30, 15, 7] as const;

export type AmcStatus = 'active' | 'expiring_soon' | 'expired' | 'not_configured';

export function getAmcStatus(amcEndDate?: string | null): AmcStatus {
  if (!amcEndDate) return 'not_configured';

  const end = new Date(amcEndDate);
  const daysRemaining = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) return 'expired';
  if (daysRemaining <= Math.max(...AMC_REMINDER_DAYS)) return 'expiring_soon';
  return 'active';
}

export const amcStatusLabels: Record<AmcStatus, string> = {
  active: 'Active',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  not_configured: 'Not Configured',
};
