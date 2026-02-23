import { useState, useMemo } from 'react';
import { Loader2, RotateCcw, Mail } from 'lucide-react';
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
      toast({
        title: 'Asset Returned',
        description: `${asset.name} has been returned to inventory.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to return asset. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    console.log('Sending email for employee:', { id: employee.id, email: employee.email });
    try {
      const { error } = await supabase.functions.invoke('send-asset-email', {
        body: { employeeId: employee.id },
      });

      if (error) throw error;

      toast({
        title: 'Asset summary sent',
        description: `Email has been sent to ${employee.email}`,
      });
      setShowEmailConfirm(false);
    } catch (error) {
      console.error('Error sending email (Detailed):', error);
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
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[95vw] sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Employee Profile</DialogTitle>
          <DialogDescription>View employee details and assigned assets.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row items-start gap-4 rounded-lg border bg-muted/20 p-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={employee.avatarUrl} />
              <AvatarFallback className="bg-muted text-primary text-sm">
                {employee.name.split(' ').map((n) => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-lg font-semibold leading-none">{employee.name}</div>
                <Badge variant={employee.status === 'active' ? 'success' : 'secondary'}>
                  {employee.status === 'active' ? 'Active' : employee.status}
                </Badge>
              </div>
              <div className="mt-1 text-sm text-muted-foreground break-words">{employee.email}</div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-muted-foreground">Department</div>
                  <div className="font-medium">{employee.department}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Position</div>
                  <div className="font-medium">{employee.position}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Location</div>
                  <div className="font-medium">
                    {employee.location === 'Warehouse' ? 'Central Warehouse' : employee.location}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
              <div className="font-medium">Assigned assets</div>
              <div className="text-sm text-muted-foreground">{assignedAssets.length} assigned</div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading assets...
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead className="w-[140px]">Status</TableHead>
                      <TableHead className="w-[140px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedAssets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                          No assets currently assigned to this employee
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedAssets.map((asset) => (
                        <TableRow key={asset.id}>
                          <TableCell>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {asset.brand} · {asset.category}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{asset.assetTag}</TableCell>
                          <TableCell>
                            <Badge variant="assigned">Assigned</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              onClick={() => handleReturn(asset)}
                              disabled={returnAsset.isPending}
                            >
                              <RotateCcw className="h-4 w-4" />
                              Return
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <AlertDialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" className="gap-2">
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
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    handleSendEmail();
                  }}
                  disabled={isSendingEmail}
                >
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

