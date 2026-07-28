import { useState, useMemo } from 'react';
import { Loader2, RotateCcw, Mail, Package, Briefcase, PackagePlus } from 'lucide-react';
import { BundleAssignDialog } from '@/components/people/BundleAssignDialog';
import type { Asset, Employee } from '@/types/asset';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAssets, useReturnAsset, useLocations } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';
import { InfoCard, Field, DetailNavHeader } from '@/components/ui/detail-card';

interface EmployeeProfileDialogProps {
  employees: Employee[];
  currentIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (index: number) => void;
}

const getInitials = (name: string) => name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase();

export function EmployeeProfileDialog({ employees, currentIndex, open, onOpenChange, onNavigate }: EmployeeProfileDialogProps) {
  const employee = employees[currentIndex];
  const { toast } = useToast();
  const { data: assets = [], isLoading } = useAssets();
  const returnAsset = useReturnAsset();
  const { data: locations = [] } = useLocations();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [showBundleAssign, setShowBundleAssign] = useState(false);

  const assignedAssets = useMemo(
    () => (employee ? assets.filter((a) => a.status === 'assigned' && a.assignedToId === employee.id) : []),
    [assets, employee]
  );

  if (!employee) return null;

  const handleReturn = async (asset: Asset) => {
    try {
      const coreOffice = locations.find(l => l.name === 'Core Office');
      await returnAsset.mutateAsync({
        assetId: asset.id,
        condition: asset.condition,
        locationId: coreOffice?.id,
        locationName: coreOffice?.name
      });
      toast({ title: 'Asset Returned', description: `${asset.name} has been returned to inventory.` });
    } catch {
      toast({ title: 'Error', description: 'Failed to return asset. Please try again.', variant: 'destructive' });
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('send-asset-email', {
        body: { employeeId: employee.id },
      });

      if (functionError) {
        let errorMessage = functionError.message;
        if (functionError.context) {
          try {
            const errorBody = await functionError.context.json();
            if (errorBody.error) errorMessage = errorBody.error;
          } catch (e) { /* ignore */ }
        }
        throw new Error(errorMessage);
      }

      toast({ title: 'Asset summary sent', description: `Email has been sent to ${employee.email}` });
      setShowEmailConfirm(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send asset summary email.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col gap-0">
        <DetailNavHeader index={currentIndex} total={employees.length} onNavigate={onNavigate} />

        {/* Identity row */}
        <div className="px-4 sm:px-6 py-4 flex items-start gap-3 border-b border-border shrink-0">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarImage src={employee.avatarUrl} />
            <AvatarFallback className="bg-muted text-primary text-sm font-medium">
              {getInitials(employee.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pr-1">
            <div className="flex flex-wrap items-center gap-2">
              <SheetTitle className="text-base font-medium leading-tight truncate">{employee.name}</SheetTitle>
              <Badge variant={employee.status === 'active' ? 'success' : 'secondary'} className="text-xs">
                {employee.status === 'active' ? 'Active' : employee.status}
              </Badge>
            </div>
            <SheetDescription asChild>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{employee.email}</p>
            </SheetDescription>
          </div>
          <div className="shrink-0">
            <AlertDialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Mail className="h-4 w-4" />
                  Send Summary
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send Asset Summary?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send an email to <strong>{employee.email}</strong> containing a list of all assets currently assigned to them.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSendingEmail}>Cancel</AlertDialogCancel>
                  <Button onClick={(e) => { e.preventDefault(); handleSendEmail(); }} disabled={isSendingEmail}>
                    {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSendingEmail ? 'Sending...' : 'Send Email'}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6 space-y-4">
          {/* Profile */}
          <InfoCard title="Profile" icon={Briefcase}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Department" value={employee.department} />
              <Field label="Position" value={employee.position} />
              <Field
                label="Location"
                value={employee.location === 'Warehouse' ? 'Central Warehouse' : employee.location}
              />
              <Field label="Status" value={<Badge variant={employee.status === 'active' ? 'success' : 'secondary'} className="text-xs capitalize">{employee.status}</Badge>} />
            </div>
          </InfoCard>

          {/* Assigned Assets */}
          <InfoCard
            title="Assigned Assets"
            icon={Package}
            action={
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground normal-case tracking-normal font-normal">{assignedAssets.length} assigned</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-7 text-xs px-2.5"
                  onClick={() => setShowBundleAssign(true)}
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Assign Assets
                </Button>
              </div>
            }
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading assets...
              </div>
            ) : assignedAssets.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No assets currently assigned to this employee
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-border divide-y divide-border">
                {assignedAssets.map((asset) => (
                  <div key={asset.id} className="px-3 py-2.5 flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted shrink-0">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {asset.brand} · <span className="font-mono">{asset.assetTag}</span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 shrink-0 h-8 text-xs px-2.5"
                      onClick={() => handleReturn(asset)}
                      disabled={returnAsset.isPending}
                    >
                      <RotateCcw className="h-3 w-3" />
                      Return
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </InfoCard>
        </div>
      </SheetContent>
      {showBundleAssign && (
        <BundleAssignDialog
          employee={employee}
          open={showBundleAssign}
          onOpenChange={setShowBundleAssign}
        />
      )}
    </Sheet>
  );
}
