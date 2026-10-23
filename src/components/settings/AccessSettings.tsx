import * as React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAccess, useProfiles, useRolePermissions, useSetProfileRole, useSetRolePermission } from '@/hooks/useCollab';
import type { Permission } from '@/services/collabService';
import type { UserRole } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, PersonAvatar } from '@/components/app/primitives';
import { SearchField } from '@/components/app/controls';

const ROLE_INFO: Record<UserRole, { label: string; description: string }> = {
  ADMIN: { label: 'Admin', description: 'Everything, including settings and roles' },
  SUPPORT: { label: 'IT Support', description: 'Day-to-day asset work and people' },
  WAREHOUSE: { label: 'Warehouse', description: 'Stock, locations, repairs and audits' },
  INVOICING: { label: 'Finance', description: 'Costs, depreciation and reports' },
  VIEWER: { label: 'Viewer', description: 'My assets, People and Locations (read-only); can report repairs. New sign-ins start here' },
};
const ROLES: UserRole[] = ['ADMIN', 'SUPPORT', 'WAREHOUSE', 'INVOICING', 'VIEWER'];

const GROUPS: { title: string; items: { p: Permission; label: string }[] }[] = [
  {
    title: 'Pages — what each role sees (My assets is always on)',
    items: [
      { p: 'dashboard.view', label: 'Dashboard & notifications' },
      { p: 'assets.view', label: 'Assets (all company assets, scan)' },
      { p: 'maintenance.view', label: 'Maintenance & AMC' },
      { p: 'audits.view', label: 'Audits' },
      { p: 'people.view', label: 'People' },
      { p: 'locations.view', label: 'Locations' },
      { p: 'reports.view', label: 'Reports & exports' },
      { p: 'settings.view', label: 'Settings (read-only without “Settings, users & roles”)' },
    ],
  },
  { title: 'Assets', items: [{ p: 'assets.edit', label: 'Create, edit & import assets' }, { p: 'assets.checkout', label: 'Check out / check in, handover forms' }, { p: 'assets.delete', label: 'Delete assets & history' }] },
  { title: 'Operations', items: [{ p: 'maintenance.manage', label: 'Log repairs & renew AMC' }, { p: 'audits.run', label: 'Run audits' }] },
  { title: 'Directory', items: [{ p: 'people.manage', label: 'Add, edit & offboard people' }, { p: 'locations.manage', label: 'Manage locations' }] },
  { title: 'Insights & admin', items: [{ p: 'costs.view', label: 'See costs & depreciation' }, { p: 'settings.manage', label: 'Settings, users & roles' }] },
];

export function AccessSettings() {
  const { toast } = useToast();
  const { access, can } = useAccess();
  const isAdmin = can('settings.manage');
  const { data: perms, error, isLoading } = useRolePermissions();
  const { data: profiles = [] } = useProfiles(isAdmin);
  const setPerm = useSetRolePermission();
  const setRole = useSetProfileRole();
  const [q, setQ] = React.useState('');

  if (error) return <EmptyState icon={ShieldCheck} title="Roles aren’t enabled yet" description="Apply migration 0009_roles_permissions.sql in the Supabase SQL editor, then reload." className="py-10" />;
  if (isLoading) return <div className="my-6 h-40 animate-pulse rounded-xl bg-muted" />;

  const has = (role: UserRole, p: Permission) => role === 'ADMIN' || !!perms?.some((x) => x.role === role && x.permission === p);
  const toggle = async (role: UserRole, p: Permission, granted: boolean) => {
    try {
      await setPerm.mutateAsync({ role, permission: p, granted });
    } catch (e) {
      toast({ title: 'Couldn’t update permission', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };
  const changeRole = async (id: string, role: UserRole) => {
    try {
      await setRole.mutateAsync({ id, role });
      toast({ title: 'Role updated', description: `Now ${ROLE_INFO[role].label}. They’ll see the change on their next page load.` });
    } catch (e) {
      toast({ title: 'Couldn’t change role', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    }
  };
  const shownProfiles = profiles.filter((p) => !q || `${p.fullName} ${p.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-8 py-5">
      <section className="space-y-3">
        <div>
          <h3 className="text-[15px] font-semibold">Permissions by role</h3>
          <p className="text-[13px] text-muted-foreground">Enforced in the database (row-level security), not just hidden in the app. Admin always has everything.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b bg-subtle">
                <th className="px-4 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-muted-foreground">Permission</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2 py-2.5 text-center">
                    <span className="block text-[13px] font-medium">{ROLE_INFO[r].label}</span>
                    <span className="block text-2xs font-normal text-faint">{profiles.length ? (() => { const n = profiles.filter((p) => p.role === r).length; return `${n} user${n === 1 ? '' : 's'}`; })() : ''}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GROUPS.map((g) => (
                <React.Fragment key={g.title}>
                  <tr className="border-b bg-subtle/60">
                    <td colSpan={ROLES.length + 1} className="px-4 py-1.5 text-2xs font-semibold uppercase tracking-wider text-faint">{g.title}</td>
                  </tr>
                  {g.items.map((it) => (
                    <tr key={it.p} className="border-b last:border-0">
                      <td className="px-4 py-2.5 text-[13px]">{it.label}</td>
                      {ROLES.map((r) => (
                        <td key={r} className="px-2 py-2.5 text-center">
                          {r === 'ADMIN' ? (
                            <Lock className="mx-auto h-3.5 w-3.5 text-faint" aria-label="Always allowed" />
                          ) : (
                            <Checkbox checked={has(r, it.p)} disabled={!isAdmin || setPerm.isPending} onCheckedChange={(c) => toggle(r, it.p, c === true)} aria-label={`${ROLE_INFO[r].label}: ${it.label}`} />
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold">Users</h3>
              <p className="text-[13px] text-muted-foreground">Everyone who has signed in with Google. New sign-ins start as Viewer.</p>
            </div>
            <SearchField value={q} onChange={setQ} placeholder="Search users" className="h-9 w-full sm:w-[240px]" />
          </div>
          <ul className="divide-y rounded-xl border">
            {shownProfiles.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <PersonAvatar name={p.fullName || p.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.fullName || p.email.split('@')[0]}{p.id === access?.userId && <span className="ml-1.5 text-xs font-normal text-faint">(you)</span>}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                </div>
                <Select value={p.role} onValueChange={(v) => changeRole(p.id, v as UserRole)} disabled={p.id === access?.userId}>
                  <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_INFO[r].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
