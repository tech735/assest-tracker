import { Mail, MessageSquare } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

export function MessagesPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-white shadow-sm text-muted-foreground hover:text-foreground">
                    <Mail className="h-5 w-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="border-b px-4 py-3">
                    <h4 className="font-semibold">Messages</h4>
                </div>
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <MessageSquare className="mb-2 h-10 w-10 opacity-20" />
                    <p className="text-sm font-medium">No messages yet</p>
                    <p className="text-xs mt-1 max-w-[180px]">
                        Direct messages from other users will appear here.
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
}
