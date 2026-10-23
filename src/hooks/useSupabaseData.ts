import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as supabaseService from '@/services/supabaseService';
import { Alert } from '@/types/alert';
import { Asset, Employee, Location } from '@/types/asset';

// =====================================================
// ASSET HOOKS
// =====================================================

export function useAssets() {
    return useQuery({
        queryKey: ['assets'],
        queryFn: supabaseService.getAssets,
    });
}

export function useCreateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.createAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useUpdateAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Asset> }) =>
            supabaseService.updateAsset(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useDeleteAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.deleteAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useBulkUpdateAssets() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Asset> }) =>
            supabaseService.bulkUpdateAssets(ids, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useBulkDeleteAssets() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.deleteAssets,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useBulkMarkAssetsLost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ ids, reference, notes }: { ids: string[]; reference?: string; notes?: string }) =>
            supabaseService.bulkMarkAssetsLost(ids, { reference, notes }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useReturnAsset() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.returnAsset,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}


// =====================================================
// EMPLOYEE HOOKS
// =====================================================

export function useEmployees() {
    return useQuery({
        queryKey: ['employees'],
        queryFn: supabaseService.getEmployees,
    });
}

export function useCreateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.createEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Employee> }) =>
            supabaseService.updateEmployee(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] }); // Names might have updated
        },
    });
}

export function useBulkUpdateEmployees() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Employee> }) =>
            supabaseService.bulkUpdateEmployees(ids, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
    });
}

export function useBulkDeleteEmployees() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.deleteEmployees,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
    });
}

export function useBulkOffboardEmployees() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ ids, exitDate }: { ids: string[]; exitDate: string }) =>
            supabaseService.bulkOffboardEmployees(ids, exitDate),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useOffboardEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.offboardEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
    });
}

// =====================================================
// LOCATION HOOKS
// =====================================================

export function useLocations() {
    return useQuery({
        queryKey: ['locations'],
        queryFn: supabaseService.getLocations,
    });
}

export function useCreateLocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.createLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

export function useUpdateLocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Location> }) =>
            supabaseService.updateLocation(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
    });
}

export function useDeleteLocation() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.deleteLocation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['locations'] });
        },
    });
}

// =====================================================
// ASSIGNMENT HOOKS
// =====================================================

export function useAssignments() {
    return useQuery({
        queryKey: ['assignments'],
        queryFn: supabaseService.getAssignments,
    });
}

export function useAssetAssignments(assetId: string) {
    return useQuery({
        queryKey: ['assignments', 'asset', assetId],
        queryFn: () => supabaseService.getAssignmentsByAssetId(assetId),
        enabled: !!assetId,
    });
}

export function useAssignAssetsBundle() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.assignAssetsBundle,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useStartRepair() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.startRepair,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useEndRepair() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.endRepair,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useMarkLost() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.markLost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

export function useMarkFound() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.markFound,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
        },
    });
}

// =====================================================
// ALERT HOOKS
// =====================================================

export function useAlerts() {
    return useQuery({
        queryKey: ['alerts'],
        queryFn: supabaseService.getAlerts,
    });
}

export function useResolveAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.resolveAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}

// =====================================================
// SETTINGS HOOKS
// =====================================================

export function useSettings() {
    return useQuery({
        queryKey: ['settings'],
        queryFn: supabaseService.getSettings,
    });
}

export function useUpdateSettings() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.updateSettings,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
        },
    });
}

