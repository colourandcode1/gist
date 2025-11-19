import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Database, Plus, Menu, FolderOpen, FileText, Settings, LayoutDashboard, Target } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import UserMenu from "@/components/UserMenu";
import WorkspaceSelector from "@/components/WorkspaceSelector";
import { useAuth } from '@/contexts/AuthContext';
import { canViewDashboard } from '@/lib/permissions';

const NavigationHeader = ({ currentView, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userOrganization } = useAuth();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Support both old callback-based navigation and new router-based navigation
  const handleNavigation = (viewOrPath) => {
    // Always use React Router navigation for paths starting with /
    if (typeof viewOrPath === 'string' && viewOrPath.startsWith('/')) {
      navigate(viewOrPath);
    } else if (viewOrPath === 'repository') {
      navigate('/repository');
    } else if (viewOrPath === 'upload') {
      navigate('/');
    } else if (onNavigate) {
      // Fallback to callback for legacy components that need special handling
      onNavigate(viewOrPath);
    }
    setShowMobileMenu(false);
  };

  // Determine active route
  const getActiveView = () => {
    if (currentView) return currentView; // Legacy support
    const path = location.pathname;
    if (path === '/repository' || path.startsWith('/repository')) return 'repository';
    if (path === '/' || (path.startsWith('/sessions/') && path !== '/sessions')) return 'upload';
    if (path.startsWith('/projects')) return 'projects';
    if (path === '/sessions') return 'sessions';
    if (path.startsWith('/problem-spaces')) return 'problem-spaces';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/dashboard')) return 'dashboard';
    return '';
  };

  const activeView = getActiveView();

  // Filter nav items based on permissions
  const navItems = [
    // Only show dashboard if user has access (Team+ tier)
    ...(userOrganization && canViewDashboard(userOrganization.tier) 
      ? [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' }]
      : []),
    { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/projects' },
    { id: 'repository', label: 'Repository', icon: Database, path: '/repository' },
    { id: 'problem-spaces', label: 'Problem Spaces', icon: Target, path: '/problem-spaces' }
  ];

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <button
            onClick={() => handleNavigation('/dashboard')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md px-1 -ml-1"
            aria-label="Go to home"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Research Hub</h1>
            </div>
          </button>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id || 
                (item.id === 'upload' && activeView === 'analysis');
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleNavigation(item.path || item.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              );
            })}
            <WorkspaceSelector />
            <ThemeToggle />
            <UserMenu />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <WorkspaceSelector />
            <ThemeToggle />
            <UserMenu />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {showMobileMenu && (
          <div className="md:hidden border-t border-border py-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleNavigation(item.path || item.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

export default NavigationHeader;
