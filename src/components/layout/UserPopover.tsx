import { LogOut, User, Settings, UserCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { EditProfileDialog, UserProfile } from './EditProfileDialog';
import { cn } from '@/lib/utils';

interface UserPopoverProps {
    user: UserProfile;
    onUpdateProfile: (updatedUser: UserProfile) => void;
}

export function UserPopover({ user, onUpdateProfile }: UserPopoverProps) {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false); // Popover state
    const [showEditProfile, setShowEditProfile] = useState(false); // Dialog state

    const handleSignOut = () => {
        navigate('/login');
    };

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <button className="flex items-center gap-3 pl-3 border-l border-border hover:bg-muted/50 p-2 rounded-lg transition-colors outline-none">
                        <div className="w-10 h-10 rounded-full bg-sidebar-accent flex items-center justify-center">
                            {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : <User className="h-4 w-4 text-sidebar-foreground" />}
                        </div>
                        <div className="text-sm text-left hidden md:block">
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.role}</p>
                        </div>
                    </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                    <div className="flex items-center gap-3 px-2 py-3 border-b border-border mb-2">
                        <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
                            {user.avatarUrl ? <img src={user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" /> : <User className="h-4 w-4 text-sidebar-foreground" />}
                        </div>
                        <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user.email}</p>
                        </div>
                    </div>

                    <div className="grid gap-1">
                        <Button
                            variant="ghost"
                            className="w-full justify-start h-9 px-2 text-sm font-normal"
                            onClick={() => {
                                setOpen(false);
                                setShowEditProfile(true);
                            }}
                        >
                            <UserCircle className="mr-2 h-4 w-4" />
                            Profile
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full justify-start h-9 px-2 text-sm font-normal"
                            onClick={() => navigate('/settings')}
                        >
                            <Settings className="mr-2 h-4 w-4" />
                            Settings
                        </Button>
                    </div>

                    <div className="border-t border-border mt-2 pt-2">
                        <Button
                            variant="ghost"
                            className="w-full justify-start h-9 px-2 text-sm font-normal text-red-600 hover:text-red-600 hover:bg-red-50"
                            onClick={handleSignOut}
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            Sign out
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>

            <EditProfileDialog
                user={user}
                open={showEditProfile}
                onOpenChange={setShowEditProfile}
                onSave={onUpdateProfile}
            />
        </>
    );
}
