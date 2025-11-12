import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, LogOut, Settings } from 'lucide-react';

const UserMenu = () => {
  const { currentUser, userProfile, signout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signout();
    navigate('/login');
  };

  const getInitials = (email) => {
    if (!email) return 'U';
    
    // Extract email prefix (everything before @)
    const emailPrefix = email.split('@')[0];
    if (!emailPrefix) return 'U';
    
    const hasDot = emailPrefix.includes('.');
    const hasHyphen = emailPrefix.includes('-');
    
    // If both dot and hyphen exist, or neither exists, return first letter only
    if ((hasDot && hasHyphen) || (!hasDot && !hasHyphen)) {
      return emailPrefix.charAt(0).toUpperCase() || 'U';
    }
    
    // If only dot exists, split by dot
    if (hasDot && !hasHyphen) {
      const parts = emailPrefix.split('.');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const first = parts[0].charAt(0);
        const second = parts[1].charAt(0);
        if (first && second) {
          return (first + second).toUpperCase();
        }
      }
    }
    
    // If only hyphen exists, split by hyphen
    if (hasHyphen && !hasDot) {
      const parts = emailPrefix.split('-');
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const first = parts[0].charAt(0);
        const second = parts[1].charAt(0);
        if (first && second) {
          return (first + second).toUpperCase();
        }
      }
    }
    
    // Fallback: return first letter
    return emailPrefix.charAt(0).toUpperCase() || 'U';
  };

  if (!currentUser) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-9 w-9 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(currentUser.email)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuItem 
          onClick={() => navigate('/settings?tab=profile')}
          className="cursor-pointer focus:bg-accent"
        >
          <div className="flex flex-col space-y-1 w-full">
            <p className="text-sm font-medium leading-none">{currentUser.email}</p>
            <p className="text-xs leading-none text-muted-foreground capitalize">
              {userProfile?.role || 'researcher'}
            </p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;

