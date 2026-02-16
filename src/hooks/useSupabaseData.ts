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

export function useAsset(id: string) {
    return useQuery({
        queryKey: ['assets', id],
        queryFn: () => supabaseService.getAssetById(id),
        enabled: !!id,
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

export function useEmployee(id: string) {
    return useQuery({
        queryKey: ['employees', id],
        queryFn: () => supabaseService.getEmployeeById(id),
        enabled: !!id,
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

export function useDeleteEmployee() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.deleteEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });
            queryClient.invalidateQueries({ queryKey: ['locations'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] }); // Unassigning might have happened
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

export function useLocation(id: string) {
    return useQuery({
        queryKey: ['locations', id],
        queryFn: () => supabaseService.getLocationById(id),
        enabled: !!id,
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

export function useCreateAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.createAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
        },
    });
}

export function useDeleteAssignment() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.deleteAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            queryClient.invalidateQueries({ queryKey: ['employees'] });
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

export function useCreateAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.createAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}

export function useUpdateAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, updates }: { id: string; updates: Partial<Alert> }) =>
            supabaseService.updateAlert(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
    });
}

export function useDeleteAlert() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: supabaseService.deleteAlert,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['alerts'] });
        },
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
// DASHBOARD STATS HOOK
// =====================================================

export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboardStats'],
        queryFn: supabaseService.getDashboardStats,
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

