import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { landingContent } from '@/lib/landingContent';

const LandingNavigation = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/landing" className="flex items-center">
            {!logoError ? (
              <img 
                src="/gist-logo.svg" 
                alt="Gist" 
                className="h-8 w-auto object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-xl font-bold text-foreground">
                {landingContent.nav.logo}
              </span>
            )}
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-6">
            {landingContent.nav.menuItems.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground flex items-center gap-1"
              >
                {item.label}
                {index === 0 && <ChevronDown className="h-4 w-4" />}
              </a>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-2">
            <Link to="/signup">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Sign up
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm">
                Login
              </Button>
            </Link>
            <ThemeToggle />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <Link to="/signup">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                Sign up
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm">
                Login
              </Button>
            </Link>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t py-4 space-y-4">
            {landingContent.nav.menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <div className="pt-4 space-y-2 border-t">
              <Link to="/signup" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  Sign up
                </Button>
              </Link>
              <Link to="/login" className="block">
                <Button className="w-full">
                  Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default LandingNavigation;

