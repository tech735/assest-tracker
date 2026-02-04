import { supabase } from '@/lib/supabase';
import { getLocations } from '@/services/supabaseService';

/**
 * Utility function to fix assets that have incorrect locationId values
 * This should be run once to fix existing data
 */
export async function fixAssetLocationIds() {
  try {
    console.log('Starting location ID fix...');
    
    // Get all locations
    const locations = await getLocations();
    console.log('Found locations:', locations);
    
    // Create a mapping from location name to location ID
    const locationMap = new Map();
    locations.forEach(location => {
      // Handle both "Warehouse" and "Central Warehouse" mappings
      locationMap.set(location.name, location.id);
      if (location.name === 'Warehouse') {
        locationMap.set('Central Warehouse', location.id);
      }
    });
    
    console.log('Location mapping:', Object.fromEntries(locationMap));
    
    // Get all assets that need fixing (locationId is null, empty, or invalid)
    const { data: assets, error: fetchError } = await supabase
      .from('assets')
      .select('*');
    
    if (fetchError) throw fetchError;
    
    console.log(`Found ${assets.length} total assets`);
    
    // Find assets that need fixing
    const assetsToFix = assets.filter(asset => {
      return !asset.location_id || 
             asset.location_id === '' || 
             !locations.find(loc => loc.id === asset.location_id);
    });
    
    console.log(`Found ${assetsToFix.length} assets that need fixing`);
    
    // Fix each asset
    for (const asset of assetsToFix) {
      const correctLocationId = locationMap.get(asset.location);
      
      if (correctLocationId) {
        console.log(`Fixing asset ${asset.name} (${asset.asset_tag}):`);
        console.log(`  Current location: ${asset.location}`);
        console.log(`  Current location_id: ${asset.location_id}`);
        console.log(`  New location_id: ${correctLocationId}`);
        
        const { error: updateError } = await supabase
          .from('assets')
          .update({ location_id: correctLocationId })
          .eq('id', asset.id);
        
        if (updateError) {
          console.error(`Failed to update asset ${asset.asset_tag}:`, updateError);
        } else {
          console.log(`✅ Fixed asset ${asset.asset_tag}`);
        }
      } else {
        console.warn(`⚠️ No location found for asset ${asset.name} with location "${asset.location}"`);
      }
    }
    
    console.log('Location ID fix completed!');
    return { fixed: assetsToFix.length, total: assets.length };
    
  } catch (error) {
    console.error('Error fixing location IDs:', error);
    throw error;
  }
}

/**
 * Run this function in the browser console to fix existing assets:
 * 
 * 1. Import the function:
 *    import('/src/utils/fixLocationIds.js').then(module => module.fixAssetLocationIds())
 * 
 * 2. Or call it directly if already imported:
 *    fixAssetLocationIds()
 */
