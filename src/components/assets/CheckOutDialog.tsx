import * as React from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Asset, AssetCondition, Employee } from '@/types/asset';
import { useEmployees } from '@/hooks/useSupabaseData';
import { useAccess, useCreateHandover } from '@/hooks/useCollab';
import { assignAssetsBundle } from '@/services/supabaseService';
import { emailHandoverLink, signingLink } from '@/services/collabService';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Segmented } from '@/components/app/controls';
import { PersonAvatar } from '@/components/app/primitives';
import { displayLocation, titleCase } from '@/lib/assetMeta';
import { cn } from '@/lib/utils';

const ACCESSORIES = ['Charger', 'Bag / sleeve', 'Mouse', 'Keyboard', 'Dongle'];
const today = () => new Date().toISOString().slice(0, 10);

/** Creates a pending handover document for the given assets and emails (or offers to copy) the signing link. */
export async function requestHandoverSignature({
  employee,
  assets,
  handedOverBy,
  createdByName,
  accessories,
  condition,
  notes,
  createDoc,
  toast,
}: {
  employee: Employee;
  assets: Asset[];
  handedOverBy?: string;
  createdByName?: string;
  accessories?: string;
  condition?: string;
  notes?: string;
  createDoc: ReturnType<typeof useCreateHandover>['mutateAsync'];
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const doc = await createDoc({
    employeeId: employee.id,
    employeeName: employee.name,
    employeeEmail: employee.email,
    locationName: employee.location,
    handedOverBy,
    createdByName,
    notes,
    items: assets.map((a) => ({ assetId: a.id, tag: a.assetTag, name: a.name, serial: a.serialNumber, brand: a.brand, condition: condition || a.condition, accessories })),
  });
  const link = signingLink(doc.id);
  const emailed = await emailHandoverLink(doc.id);
  toast({
    title: emailed.ok ? 'Handover form sent for signature' : 'Handover form ready to sign',
    description: emailed.ok ? `Emailed to ${employee.email}` : `Couldn’t email it${emailed.reason ? ` (${emailed.reason})` : ''} — copy the signing link and share it.`,
    action: (
      <ToastAction altText="Copy signing link" onClick={() => navigator.clipboard.writeText(link)}>
        Copy link
      </ToastAction>
    ),
  });
  return doc;
}

export function CheckOutDialog({ asset, open, onOpenChange }: { asset: Asset; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const { access } = useAccess();
  const createDoc = useCreateHandover();
  const [personId, setPersonId] = React.useState('');
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [date, setDate] = React.useState(today());
  const [condition, setCondition] = React.useState<AssetCondition>(asset.condition || 'good');
  const [accessories, setAccessories] = React.useState<string[]>([]);
  const [handedOverBy, setHandedOverBy] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [esign, setEsign] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setPersonId('');
      setDate(today());
      setCondition(asset.condition || 'good');
      setAccessories([]);
      setNotes('');
      setEsign(true);
    }
  }, [open, asset]);
  React.useEffect(() => {
    if (open && !handedOverBy && access?.name) setHandedOverBy(access.name);
  }, [open, access?.name, handedOverBy]);

  const active = employees.filter((e) => e.status !== 'offboarded').sort((a, b) => a.name.localeCompare(b.name));
  const person = employees.find((e) => e.id === personId);
  const accessoryText = accessories.join(', ');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!person) return;
    setSaving(true);
    try {
      await assignAssetsBundle({
        assetIds: [asset.id],
        employeeId: person.id,
        handoverDate: date,
        handedOverBy,
        condition,
        notes: [accessoryText && `Accessories: ${accessoryText}`, notes].filter(Boolean).join(' · ') || undefined,
      });
      ['assets', 'assignments', 'employees', 'dashboardStats'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      if (esign && person.email) {
        await requestHandoverSignature({ employee: person, assets: [{ ...asset, condition }], handedOverBy, createdByName: access?.name || undefined, accessories: accessoryText, condition, notes, createDoc: createDoc.mutateAsync, toast }).catch(() =>
          toast({ title: 'Checked out — but the handover form couldn’t be created', description: 'You can send it later from the person’s profile.', variant: 'destructive' }),
        );
      } else {
        toast({ title: 'Asset checked out', description: `${asset.name} → ${person.name}` });
      }
      onOpenChange(false);
    } catch (err) {
      toast({ title: 'Couldn’t check out', description: err instanceof Error ? err.message : 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={submit} onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter' && submit(e)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Check out asset</DialogTitle>
            <DialogDescription>
              {asset.name} · <span className="font-mono">{asset.assetTag}</span> · {displayLocation(asset.location)}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-1.5">
            <Label>Assign to</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="secondary" role="combobox" aria-expanded={pickerOpen} className="h-[38px] justify-between font-normal">
                  {person ? (
                    <span className="flex min-w-0 items-center gap-2">
                      <PersonAvatar name={person.name} size="xs" />
                      <span className="truncate">{person.name}</span>
                      <span className="truncate text-muted-foreground">— {person.department}</span>
                    </span>
                  ) : (
                    <span className="text-faint">Search people…</span>
                  )}
                  <ChevronsUpDown className="text-faint" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Name, email or team" />
                  <CommandList>
                    <CommandEmpty>No one found.</CommandEmpty>
                    <CommandGroup>
                      {active.map((e) => (
                        <CommandItem
                          key={e.id}
                          value={`${e.name} ${e.email} ${e.department}`}
                          onSelect={() => {
                            setPersonId(e.id);
                            setPickerOpen(false);
                          }}
                          className="gap-2.5"
                        >
                          <PersonAvatar name={e.name} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate">{e.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">{e.department} · {e.assetsCount} assets</span>
                          </span>
                          <Check className={cn('h-4 w-4', personId === e.id ? 'opacity-100' : 'opacity-0')} />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {person && <p className="text-xs text-muted-foreground">Has {person.assetsCount} other asset{person.assetsCount === 1 ? '' : 's'} · {displayLocation(person.location)}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Handover date</Label>
              <DatePicker value={date} onChange={setDate} className="h-[38px] w-full" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hob">Handed over by</Label>
              <Input id="hob" value={handedOverBy} onChange={(e) => setHandedOverBy(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Condition at handover</Label>
            <Segmented<AssetCondition> className="flex w-full" value={condition} onChange={setCondition} options={(['new', 'good', 'fair', 'poor'] as AssetCondition[]).map((c) => ({ value: c, label: titleCase(c) }))} />
          </div>

          <div className="grid gap-2">
            <Label>Accessories included</Label>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {ACCESSORIES.map((a) => (
                <label key={a} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={accessories.includes(a)} onCheckedChange={(c) => setAccessories((x) => (c ? [...x, a] : x.filter((y) => y !== a)))} />
                  {a}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Minor scratch on lid — noted at handover" />
          </div>

          <label className="flex items-center gap-3 rounded-xl border bg-subtle px-3.5 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">Send handover form for e-signature</span>
              <span className="block text-xs text-muted-foreground">{person ? `${person.name} signs at ${person.email}` : 'The employee signs with their KOTU account'} — the signed form is kept with their profile.</span>
            </span>
            <Switch checked={esign} onCheckedChange={setEsign} />
          </label>

          <DialogFooter className="items-center">
            <p className="mr-auto hidden text-xs text-faint sm:block">Ctrl + Enter to confirm</p>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!person} loading={saving}>
              Check out
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
