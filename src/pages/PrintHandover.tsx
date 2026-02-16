import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AssetHandoverForm } from '@/components/printing/AssetHandoverForm';
import { useAssets, useEmployees, useLocations } from '@/hooks/useSupabaseData';
import { Asset, Employee, Location } from '@/types/asset';

const PrintHandover = () => {
    const { type, id } = useParams<{ type: string; id: string }>();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<{ details: Employee | Location | null; assets: Asset[] }>({
        details: null,
        assets: [],
    });

    const { data: employees = [] } = useEmployees();
    const { data: locations = [] } = useLocations();
    const { data: allAssets = [] } = useAssets();

    useEffect(() => {
        if (employees.length && locations.length && allAssets.length && id && type) {
            let details: Employee | Location | null = null;
            let assets: Asset[] = [];

            if (type === 'employee') {
                details = employees.find(e => e.id === id) || null;
                if (details) {
                    assets = allAssets.filter(a => a.assignedToId === id);
                }
            } else if (type === 'location') {
                details = locations.find(l => l.id === id) || null;
                if (details) {
                    assets = allAssets.filter(a => {
                        const assetLocationId = a.locationId; // Fixed: using locationId instead of location_id
                        if (assetLocationId === id) return true;

                        // Fallback to name matching
                        const assetLocationName = a.location?.toLowerCase().trim();
                        const locationName = (details as Location).name.toLowerCase().trim();

                        return assetLocationName === locationName ||
                            (locationName === 'warehouse' && assetLocationName === 'central warehouse') ||
                            (locationName === 'central warehouse' && assetLocationName === 'warehouse');
                    });
                }
            }

            setData({ details, assets });
            setLoading(false);
        }
    }, [id, type, employees, locations, allAssets]);

    useEffect(() => {
        if (!loading && data.details) {
            // Small delay to ensure rendering is complete
            const timer = setTimeout(() => {
                window.print();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [loading, data.details]);

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading print data...</div>;
    }

    if (!data.details) {
        return <div className="flex justify-center items-center h-screen text-red-500">Entity not found</div>;
    }

    return (
        <AssetHandoverForm
            type={type as 'employee' | 'location'}
            details={data.details}
            assets={data.assets}
        />
    );
};

export default PrintHandover;
