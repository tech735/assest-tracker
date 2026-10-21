import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Layers, Plus, Settings as SettingsIcon, ShieldCheck, Tag, X, type LucideIcon } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useSettings, useUpdateSettings } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, PageHeader, PageLoader } from '@/components/app/primitives';
import { titleCase } from '@/lib/assetMeta';
import { AccessSettings } from '@/components/settings/AccessSettings';
import { useAccess } from '@/hooks/useCollab';
import { cn } from '@/lib/utils';

type Section = 'general' | 'categories' | 'tags' | 'notifications' | 'access';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Config = any;

const SECTIONS: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'categories', label: 'Categories', icon: Layers },
  { id: 'tags', label: 'Asset tags & labels', icon: Tag },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'access', label: 'Roles & permissions', icon: ShieldCheck },
];

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 border-b py-4 last:border-0 sm:grid-cols-[240px_minmax(0,1fr)] sm:gap-6">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="max-w-md">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const section = (params.get('section') || 'general') as Section;
  const { data: settings, isLoading, isError } = useSettings();
  const update = useUpdateSettings();
  const { can } = useAccess();
  const readOnly = !can('settings.manage');
  const [config, setConfig] = useState<Config>(null);
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (settings) setConfig(settings);
  }, [settings]);
  const dirty = useMemo(() => !!config && !!settings && JSON.stringify(config) !== JSON.stringify(settings), [config, settings]);

  if (isLoading && !config) return <PageLoader label="Loading settings" />;
  if (isError) return <EmptyState icon={SettingsIcon} title="Couldn’t load settings" action={<Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>} />;
  if (!config) return null;

  const set = (patch: Partial<Config>) => setConfig({ ...config, ...patch });
  const setNotif = (key: string, value: boolean) => setConfig({ ...config, notifications: { ...config.notifications, [key]: value } });
  const save = async () => {
    try {
      await update.mutateAsync(config);
      toast({ title: 'Settings saved' });
    } catch {
      toast({ title: 'Couldn’t save settings', description: 'Please try again.', variant: 'destructive' });
    }
  };
  const addCategory = () => {
    const c = newCategory.trim();
    if (!c) return;
    if ((config.categories || []).some((x: string) => x.toLowerCase() === c.toLowerCase())) {
      toast({ title: 'That category already exists', variant: 'destructive' });
      return;
    }
    set({ categories: [...(config.categories || []), c] });
    setNewCategory('');
  };

  return (
    <div className="space-y-5 pb-16">
      <PageHeader title="Settings" />
      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-1 overflow-x-auto scrollbar-hide lg:flex-col" aria-label="Settings sections">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setParams(s.id === 'general' ? {} : { section: s.id }, { replace: true })}
              className={cn('flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors', section === s.id ? 'bg-primary-soft font-medium text-link' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
            >
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 rounded-xl border bg-card px-5 py-2 md:px-6">
          {section === 'general' && (
            <>
              <Row label="Organisation name" hint="Shown on handover forms and emails.">
                <Input value={config.orgName || ''} onChange={(e) => set({ orgName: e.target.value })} />
              </Row>
              <Row label="Currency" hint="Used for purchase cost, book value and reports.">
                <Select value={config.currency || 'INR'} onValueChange={(v) => set({ currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
              <Row label="Timezone">
                <Select value={config.timezone || 'Asia/Kolkata'} onValueChange={(v) => set({ timezone: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Asia/Kolkata', 'UTC', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York'].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Row>
            </>
          )}

          {section === 'categories' && (
            <Row label="Asset categories" hint="Available when adding assets and in filters. Removing one doesn’t change existing assets.">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {(config.categories || []).map((c: string) => (
                    <span key={c} className="inline-flex items-center gap-1.5 rounded-full border bg-subtle py-1 pl-3 pr-1.5 text-[13px]">
                      {titleCase(c)}
                      <button onClick={() => set({ categories: config.categories.filter((x: string) => x !== c) })} className="rounded-full p-0.5 text-faint hover:bg-muted hover:text-foreground" aria-label={`Remove ${c}`}>
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); addCategory(); }} className="flex gap-2">
                  <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Printers" />
                  <Button type="submit" variant="secondary"><Plus /> Add</Button>
                </form>
              </div>
            </Row>
          )}

          {section === 'tags' && (
            <>
              <Row label="Asset tag prefix" hint="New assets are numbered automatically, e.g. AST-1249.">
                <Input value={config.tagPrefix || ''} onChange={(e) => set({ tagPrefix: e.target.value })} className="font-mono" />
              </Row>
              <Row label="Label preview" hint="Printed from any asset page. The QR code opens the asset so anyone can check it in or out.">
                <div className="flex items-center gap-4 rounded-lg border-2 border-foreground p-4">
                  <QRCodeSVG value={`${window.location.origin}/assets/example`} size={72} marginSize={0} />
                  <div>
                    <p className="font-mono text-lg font-semibold">{config.tagPrefix || 'AST-'}1249</p>
                    <p className="text-sm font-medium">MacBook Air 13" M3</p>
                    <p className="text-[10px]">Property of {config.orgName || 'KOTU'}</p>
                  </div>
                </div>
              </Row>
            </>
          )}

          {section === 'notifications' && (
            <>
              {[
                ['warrantyAlerts', 'Warranty & AMC reminders', 'Emails at 30, 15 and 7 days before coverage ends.'],
                ['assignmentNotifications', 'Assignment emails', 'Notify employees when an asset is checked out to or in from them.'],
                ['emailDigest', 'Daily digest', 'One morning email to IT with everything that needs attention.'],
                ['lowStockAlerts', 'Low stock alerts', 'Warn when a category has fewer than 3 assets in stock.'],
              ].map(([key, label, hint]) => (
                <Row key={key} label={label} hint={hint}>
                  <Switch checked={!!config.notifications?.[key]} onCheckedChange={(v) => setNotif(key, v)} />
                </Row>
              ))}
            </>
          )}

          {section === 'access' && <AccessSettings />}
        </div>
      </div>

      {readOnly && section !== 'access' && (
        <p className="rounded-xl bg-subtle px-4 py-3 text-[13px] text-muted-foreground">You can view settings; only admins can change them.</p>
      )}
      {dirty && !readOnly && (
        <div className="fixed bottom-[84px] left-1/2 z-40 flex w-[calc(100vw-24px)] max-w-md -translate-x-1/2 animate-bar-in items-center gap-3 rounded-xl bg-foreground py-2 pl-4 pr-2 text-background shadow-elevated md:bottom-6">
          <span className="flex-1 text-sm">You have unsaved changes</span>
          <Button size="sm" variant="ghost" className="text-background hover:bg-background/10" onClick={() => setConfig(settings)}>Discard</Button>
          <Button size="sm" className="bg-background text-foreground hover:bg-background/90" loading={update.isPending} onClick={save}>Save</Button>
        </div>
      )}
    </div>
  );
}
