import { useState, useMemo } from 'react';
import { Loader2, RotateCcw, Mail, Package, User, MapPin, Briefcase } from 'lucide-react';
import type { Asset, Employee } from '@/types/asset';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAssets, useReturnAsset, useLocations } from '@/hooks/useSupabaseData';
import { useToast } from '@/hooks/use-toast';

interface EmployeeProfileDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmployeeProfileDialog({ employee, open, onOpenChange }: EmployeeProfileDialogProps) {
  const { toast } = useToast();
  const { data: assets = [], isLoading } = useAssets();
  const returnAsset = useReturnAsset();
  const { data: locations = [] } = useLocations();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);

  const assignedAssets = useMemo(
    () => assets.filter((a) => a.status === 'assigned' && a.assignedToId === employee.id),
    [assets, employee.id]
  );

  const handleReturn = async (asset: Asset) => {
    try {
      const coreOffice = locations.find(l => l.name === 'Core Office');
      await returnAsset.mutateAsync({
        assetId: asset.id,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[88vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 pr-8">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={employee.avatarUrl} />
              <AvatarFallback className="bg-muted text-primary text-sm">
                {employee.name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-lg leading-tight">{employee.name}</DialogTitle>
                <Badge variant={employee.status === 'active' ? 'success' : 'secondary'} className="text-xs">
                  {employee.status === 'active' ? 'Active' : employee.status}
                </Badge>
              </div>
              <DialogDescription className="text-sm truncate mt-0.5">{employee.email}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto scrollbar-hide divide-y divide-border">
          {/* Employee Info */}
          <section className="px-4 sm:px-6 py-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40">
                <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="text-sm font-medium truncate">{employee.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Position</p>
                  <p className="text-sm font-medium truncate">{employee.position}</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40">
                <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium truncate">
                    {employee.location === 'Warehouse' ? 'Central Warehouse' : employee.location}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Assigned Assets */}
          <section className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Assets</h3>
              <span className="text-xs text-muted-foreground">{assignedAssets.length} assigned</span>
            </div>

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
              <>
                {/* Mobile card list */}
                <div className="block sm:hidden rounded-xl overflow-hidden border border-border">
                  {assignedAssets.map((asset, idx) => (
                    <div
                      key={asset.id}
                      className={`px-4 py-3 flex items-center gap-3 ${idx < assignedAssets.length - 1 ? 'border-b border-border' : ''}`}
                    >
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

                {/* Desktop table */}
                <div className="hidden sm:block rounded-xl overflow-hidden border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Asset</TableHead>
                        <TableHead>Tag</TableHead>
                        <TableHead className="w-[120px]">Status</TableHead>
                        <TableHead className="w-[120px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignedAssets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-xs text-muted-foreground">{asset.brand} · {asset.category}</div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{asset.assetTag}</TableCell>
                          <TableCell><Badge variant="assigned">Assigned</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline" size="sm" className="gap-2"
                              onClick={() => handleReturn(asset)}
                              disabled={returnAsset.isPending}
                            >
                              <RotateCcw className="h-4 w-4" />Return
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Footer */}
        <DialogFooter className="px-4 sm:px-6 py-4 border-t border-border shrink-0 flex-col sm:flex-row gap-2">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <AlertDialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" className="gap-2 w-full sm:w-auto">
                <Mail className="h-4 w-4" />
                Send Asset Summary
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
