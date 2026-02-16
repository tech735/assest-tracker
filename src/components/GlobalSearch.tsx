import * as React from 'react';
import { Search, History, ArrowRight, Package, User, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../hooks/use-debounce';
import { supabase } from '@/lib/supabase';
import { Command as CommandPrimitive } from 'cmdk';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AssetResult {
    id: string;
    asset_tag: string;
    name: string;
    serial_number: string;
    brand: string;
    type: 'asset';
}

interface PersonResult {
    id: string;
    name: string;
    email: string;
    type: 'person';
}

interface LocationResult {
    id: string;
    name: string;
    type: 'location';
}

type SearchResult = AssetResult | PersonResult | LocationResult;

export function GlobalSearch() {
    const navigate = useNavigate();
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const [results, setResults] = React.useState<SearchResult[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [recentSearches, setRecentSearches] = React.useState<string[]>([]);
    const debouncedQuery = useDebounce(query, 300);
    const wrapperRef = React.useRef<HTMLDivElement>(null);

    // Handle click outside to close
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load recent searches
    React.useEffect(() => {
        const saved = localStorage.getItem('recent_searches_ac');
        if (saved) {
            try {
                setRecentSearches(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse recent searches', e);
            }
        }
    }, []);

    const addRecentSearch = (term: string) => {
        if (!term.trim()) return;
        const newRecent = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
        setRecentSearches(newRecent);
        localStorage.setItem('recent_searches_ac', JSON.stringify(newRecent));
    };

    const removeRecentSearch = (term: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newRecent = recentSearches.filter(s => s !== term);
        setRecentSearches(newRecent);
        localStorage.setItem('recent_searches_ac', JSON.stringify(newRecent));
    };

    React.useEffect(() => {
        async function fetchResults() {
            if (!debouncedQuery.trim()) {
                setResults([]);
                return;
            }

            setLoading(true);
            try {
                // Parallel fetch for assets, people, and locations
                const [assetsRes, peopleRes, locationsRes] = await Promise.all([
                    supabase
                        .from('assets')
                        .select('id, asset_tag, name, serial_number, brand')
                        .or(`asset_tag.ilike.%${debouncedQuery}%,name.ilike.%${debouncedQuery}%,serial_number.ilike.%${debouncedQuery}%,brand.ilike.%${debouncedQuery}%`)
                        .limit(50),
                    supabase
                        .from('employees')
                        .select('id, name, email')
                        .or(`name.ilike.%${debouncedQuery}%,email.ilike.%${debouncedQuery}%`)
                        .limit(3),
                    supabase
                        .from('locations')
                        .select('id, name')
                        .ilike('name', `%${debouncedQuery}%`)
                        .limit(3)
                ]);

                const combinedResults: SearchResult[] = [
                    ...(assetsRes.data?.map(a => ({ ...a, type: 'asset' } as AssetResult)) || []),
                    ...(peopleRes.data?.map(p => ({ ...p, type: 'person' } as PersonResult)) || []),
                    ...(locationsRes.data?.map(l => ({ ...l, type: 'location' } as LocationResult)) || [])
                ];

                setResults(combinedResults);
            } catch (error) {
                console.error('Search error:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchResults();
    }, [debouncedQuery]);

    const handleSelect = (result: SearchResult) => {
        setOpen(false);
        addRecentSearch(query);
        setQuery('');

        if (result.type === 'asset') {
            navigate(`/assets?view=${result.id}`);
        } else if (result.type === 'person') {
            navigate(`/people?view=${result.id}`);
        } else if (result.type === 'location') {
            navigate(`/locations?view=${result.id}`);
        }
    };

    return (
        <div ref={wrapperRef} className="relative max-w-md flex-1 z-50">
            <Command shouldFilter={false} className="overflow-visible bg-transparent">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <CommandPrimitive.Input
                        id="global-search-input"
                        className="flex h-11 w-full rounded-full bg-white px-10 text-sm outline-none placeholder:text-muted-foreground shadow-sm border border-transparent focus:ring-2 focus:ring-primary/20 transition-all font-normal"
                        placeholder="Search assets, people, locations..."
                        value={query}
                        onValueChange={setQuery}
                        onFocus={() => setOpen(true)}
                    />
                </div>

                {open && (
                    <div className="absolute top-[calc(100%+8px)] left-0 w-full rounded-xl border bg-popover text-popover-foreground shadow-xl outline-none animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 bg-white">
                        <CommandList className="max-h-[300px] overflow-y-auto p-2">
                            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                                {query ? 'No results found.' : 'Search for assets, people, or locations.'}
                            </CommandEmpty>

                            {results.length > 0 && (
                                <CommandGroup heading="Results">
                                    {results.map((result) => (
                                        <CommandItem
                                            key={`${result.type}-${result.id}`}
                                            onSelect={() => handleSelect(result)}
                                            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground rounded-md transition-colors"
                                        >
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                                                {result.type === 'asset' && <Package className="h-4 w-4 text-primary" />}
                                                {result.type === 'person' && <User className="h-4 w-4 text-primary" />}
                                                {result.type === 'location' && <MapPin className="h-4 w-4 text-primary" />}
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="font-medium truncate text-sm">
                                                    {result.type === 'asset' ? (result as AssetResult).name :
                                                        result.type === 'person' ? (result as PersonResult).name :
                                                            (result as LocationResult).name}
                                                </span>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <span className="truncate">
                                                        {result.type === 'asset' ?
                                                            `${(result as AssetResult).asset_tag} • ${(result as AssetResult).brand}` :
                                                            result.type === 'person' ? (result as PersonResult).email :
                                                                'Location'}
                                                    </span>
                                                </div>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {!query && recentSearches.length > 0 && (
                                <CommandGroup heading="Recent Searches">
                                    {recentSearches.map((term) => (
                                        <CommandItem
                                            key={term}
                                            onSelect={() => {
                                                setQuery(term);
                                            }}
                                            className="flex items-center justify-between px-3 py-2 cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground rounded-md group"
                                        >
                                            <div className="flex items-center gap-2">
                                                <History className="h-4 w-4 text-muted-foreground" />
                                                <span>{term}</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={(e) => removeRecentSearch(term, e)}
                                            >
                                                <ArrowRight className="h-3 w-3" />
                                            </Button>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </CommandList>
                    </div>
                )}
            </Command>
        </div>
    );
}
