import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { CheckCircle2, Circle, Lock, Plus, QrCode, ScanLine, Upload } from 'lucide-react';
import { useAssets, useCreateAsset, useLocations, useSettings } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import type { AssetCategory, AssetCondition } from '@/types/asset';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, PageHeader } from '@/components/app/primitives';
import { useAccess } from '@/hooks/useCollab';
import { Segmented } from '@/components/app/controls';
import { useShell } from '@/components/layout/AppShell';
import { displayLocation, titleCase } from '@/lib/assetMeta';
import { cn } from '@/lib/utils';

const schema = z
  .object({
    category: z.string().min(1, 'Choose a category'),
    name: z.string().min(2, 'Give the asset a name'),
    brand: z.string().min(1, 'Brand is required'),
    model: z.string().min(1, 'Model is required'),
    serialNumber: z.string().min(1, 'Serial number is required'),
    condition: z.enum(['new', 'good', 'fair', 'poor']),
    purchaseDate: z.string().min(1, 'Purchase date is required'),
    purchaseCost: z.coerce.number().min(0, 'Cost can’t be negative'),
    vendor: z.string().min(1, 'Vendor is required'),
    warrantyEnd: z.string().optional(),
    hasAmc: z.boolean(),
    amcStartDate: z.string().optional(),
    amcEndDate: z.string().optional(),
    locationId: z.string().min(1, 'Choose where it is'),
    notes: z.string().optional(),
  })
  .refine((v) => !v.hasAmc || (v.amcStartDate && v.amcEndDate), { message: 'Add the AMC start and end dates', path: ['amcEndDate'] });

type Values = z.infer<typeof schema>;

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 md:p-6">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {description && <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function AssetNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { openScanner } = useShell();
  const createAsset = useCreateAsset();
  const { data: assets = [] } = useAssets();
  const { data: locations = [] } = useLocations();
  const { data: settings } = useSettings();
  const [submitting, setSubmitting] = useState<null | 'create' | 'another' | 'checkout'>(null);
  const { can } = useAccess();
  const canEditAssets = can('assets.edit');

  const categories = useMemo(() => {
    const all = [...(settings?.categories || []), ...assets.map((a) => a.category)].filter(Boolean).map((c: string) => c.toLowerCase());
    return [...new Set(all)].sort();
  }, [settings, assets]);
  const tagPrefix: string = settings?.tagPrefix || 'AST-';

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: '',
      name: '',
      brand: '',
      model: '',
      serialNumber: params.get('serial') || '',
      condition: 'new',
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseCost: 0,
      vendor: '',
      warrantyEnd: '',
      hasAmc: false,
      amcStartDate: '',
      amcEndDate: '',
      locationId: '',
      notes: '',
    },
  });
  const v = form.watch();
  // "Add as new asset" from the scanner while already on this page only changes ?serial=.
  const serialParam = params.get('serial');
  useEffect(() => {
    if (serialParam) form.setValue('serialNumber', serialParam, { shouldValidate: true, shouldDirty: true });
  }, [serialParam, form]);

  const duplicate = v.serialNumber && assets.find((a) => a.serialNumber?.toLowerCase() === v.serialNumber.trim().toLowerCase());

  const submit = (mode: 'create' | 'another' | 'checkout') =>
    form.handleSubmit(async (values) => {
      if (duplicate) {
        form.setError('serialNumber', { message: `This serial already exists (${duplicate.assetTag})` });
        return;
      }
      const location = locations.find((l) => l.id === values.locationId)!;
      setSubmitting(mode);
      try {
        const created = await createAsset.mutateAsync({
          name: values.name,
          brand: values.brand,
          model: values.model,
          serialNumber: values.serialNumber.trim(),
          assetTag: '',
          category: values.category as AssetCategory,
          condition: values.condition as AssetCondition,
          status: 'available',
          location: location.name,
          locationId: location.id,
          purchaseDate: values.purchaseDate,
          purchaseCost: values.purchaseCost,
          vendor: values.vendor,
          warrantyStart: values.warrantyEnd ? values.purchaseDate : undefined,
          warrantyEnd: values.warrantyEnd || undefined,
          amcStartDate: values.hasAmc ? values.amcStartDate : undefined,
          amcEndDate: values.hasAmc ? values.amcEndDate : undefined,
          notes: values.notes || undefined,
        });
        toast({ title: 'Asset created', description: `${created.assetTag} · ${created.name}` });
        if (mode === 'another') {
          form.reset({ ...values, name: '', serialNumber: '', notes: '' });
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else navigate(`/assets/${created.id}${mode === 'checkout' ? '?action=checkout' : ''}`);
      } catch (e) {
        toast({ title: 'Couldn’t create asset', description: e instanceof Error ? e.message : 'Please try again.', variant: 'destructive' });
      } finally {
        setSubmitting(null);
      }
    })();

  const checklist = [
    { label: 'Category, name & serial', ok: !!(v.category && v.name && v.serialNumber && !duplicate) },
    { label: 'Brand & model', ok: !!(v.brand && v.model) },
    { label: 'Purchase details', ok: !!(v.purchaseDate && v.vendor) },
    { label: 'Location', ok: !!v.locationId },
    { label: 'AMC dates (optional)', ok: !v.hasAmc || !!(v.amcStartDate && v.amcEndDate), optional: true },
  ];

  const text = (name: keyof Values, label: string, placeholder?: string, description?: string, type = 'text') => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} placeholder={placeholder} {...field} value={field.value as string | number} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
  const date = (name: keyof Values, label: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <DatePicker value={field.value as string} onChange={field.onChange} onBlur={field.onBlur} className="h-[38px] w-full" />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  if (!canEditAssets)
    return (
      <EmptyState icon={Lock} title="You can’t add assets" description="Your role is read-only for assets. Ask an admin (Settings → Roles & permissions) if you need access." />
    );

  return (
    <Form {...form}>
      <form onSubmit={(e) => { e.preventDefault(); submit('create'); }} onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit('create'); }} className="space-y-5 pb-20 md:pb-0">
        <PageHeader
          breadcrumb={[{ label: 'Assets', to: '/assets' }, { label: 'New asset' }]}
          title="Add asset"
          actions={
            <Button variant="ghost" asChild>
              <Link to="/assets/import">
                <Upload /> Bulk import instead
              </Link>
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-4">
            <Section title="Basics" description="What is it and how do we identify it?">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>
                            {titleCase(c)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {text('name', 'Asset name', 'e.g. MacBook Air 13" M3')}
              {text('brand', 'Brand', 'Apple')}
              {text('model', 'Model', 'MBA 13 M3 · 16GB / 512GB')}
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial number</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="Scan or type" {...field} aria-invalid={!!duplicate || undefined} />
                      </FormControl>
                      <Button type="button" variant="secondary" size="icon" className="h-[38px] w-[38px] shrink-0" onClick={() => openScanner({ title: 'Scan serial number', onCode: (code) => form.setValue('serialNumber', code, { shouldValidate: true, shouldDirty: true }) })} aria-label="Scan barcode">
                        <ScanLine />
                      </Button>
                    </div>
                    {duplicate ? (
                      <p className="text-[13px] font-medium text-destructive-strong">
                        Already registered as <Link className="underline" to={`/assets/${duplicate.id}`}>{duplicate.assetTag}</Link>
                      </p>
                    ) : (
                      <FormDescription>Use a USB scanner or your phone camera.</FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Asset tag</FormLabel>
                <Input disabled value={`${tagPrefix}#### (auto)`} />
                <FormDescription>Generated from your tag prefix in Settings.</FormDescription>
              </FormItem>
              <FormField
                control={form.control}
                name="condition"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Condition</FormLabel>
                    <Segmented className="flex w-full max-w-sm" value={field.value} onChange={field.onChange} options={(['new', 'good', 'fair', 'poor'] as const).map((c) => ({ value: c, label: titleCase(c) }))} />
                  </FormItem>
                )}
              />
            </Section>

            <Section title="Purchase & warranty" description="Used for depreciation, reports and warranty alerts.">
              {date('purchaseDate', 'Purchase date')}
              {text('purchaseCost', `Purchase cost (${settings?.currency || 'INR'})`, '0', undefined, 'number')}
              {text('vendor', 'Vendor', 'Imagine Store')}
              {date('warrantyEnd', 'Warranty ends (optional)')}
            </Section>

            <Section title="AMC" description="Annual maintenance contract — reminders go out at 30, 15 and 7 days.">
              <FormField
                control={form.control}
                name="hasAmc"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-3 space-y-0 sm:col-span-2">
                    <FormLabel className="font-medium">This asset is covered by an AMC</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {v.hasAmc && (
                <>
                  {date('amcStartDate', 'AMC start')}
                  {date('amcEndDate', 'AMC end')}
                </>
              )}
            </Section>

            <Section title="Location & notes">
              <FormField
                control={form.control}
                name="locationId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Where is it?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {locations.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {displayLocation(l.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="hidden sm:block" />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Accessories, specs, anything worth knowing" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </Section>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-xl border bg-card p-5">
              <p className="mb-3 text-2xs font-semibold uppercase tracking-wider text-faint">Label preview</p>
              <div className="flex items-center gap-3.5 rounded-lg border-2 border-foreground/80 p-3.5">
                <QrCode className="h-14 w-14 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold">{tagPrefix}####</p>
                  <p className="truncate text-[13px] font-medium">{v.name || 'Asset name'}</p>
                  <p className="text-xs text-muted-foreground">Property of KOTU</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-5">
              <p className="mb-3 text-[15px] font-semibold">Ready to create</p>
              <ul className="space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className={cn('flex items-center gap-2 text-[13px]', c.ok ? 'text-foreground' : 'text-muted-foreground')}>
                    {c.ok ? <CheckCircle2 className="h-4 w-4 text-success-strong" /> : <Circle className="h-4 w-4 text-faint" />}
                    {c.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="fixed inset-x-0 bottom-[68px] z-30 flex gap-2 border-t bg-card/95 p-3 backdrop-blur md:static md:flex-col md:border-0 md:bg-transparent md:p-0">
              <Button type="submit" className="flex-1 md:w-full md:flex-none" loading={submitting === 'create'}>
                Create asset
              </Button>
              <Button type="button" variant="secondary" className="flex-1 md:w-full md:flex-none" loading={submitting === 'checkout'} onClick={() => submit('checkout')}>
                Create &amp; check out
              </Button>
              <Button type="button" variant="ghost" className="hidden md:inline-flex md:w-full" loading={submitting === 'another'} onClick={() => submit('another')}>
                <Plus /> Create &amp; add another
              </Button>
              <p className="hidden text-center text-xs text-faint md:block">Tip: Ctrl + Enter creates the asset</p>
            </div>
          </aside>
        </div>
      </form>
    </Form>
  );
}
