import React, { useState } from 'react';
import { Database, Plus, Clock, Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NavigationHeader = ({ currentView, onNavigate, hasUnsavedChanges = false }) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleNavigation = (view) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (!confirmed) return;
    }
    onNavigate(view);
    setShowMobileMenu(false);
  };

  const navItems = [
    { id: 'repository', label: 'Repository', icon: Database },
    { id: 'upload', label: 'New Session', icon: Plus }
  ];

  return (
    <nav className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Database className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Research Hub</h1>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id || 
                (item.id === 'upload' && currentView === 'analysis');
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleNavigation(item.id)}
                  className="flex items-center gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              );
            })}
            <ThemeToggle />
          </div>

          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
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
              const isActive = currentView === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => handleNavigation(item.id)}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {hasUnsavedChanges && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-2">
          <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
            <Clock className="w-4 h-4" />
            <span>You have unsaved changes in this session</span>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavigationHeader;
