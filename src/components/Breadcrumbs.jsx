import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Breadcrumbs = ({ items }) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/dashboard')}
        className="h-auto p-1 hover:text-foreground"
      >
        <Home className="w-4 h-4" />
      </Button>
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            <ChevronRight className="w-4 h-4 mx-1" />
            {isLast ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => item.path && navigate(item.path)}
                className="h-auto p-1 hover:text-foreground"
              >
                {item.label}
              </Button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;

