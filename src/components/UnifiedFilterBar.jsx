import React from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const UnifiedFilterBar = ({ 
  activeFilters, 
  removeFilter, 
  clearAllFilters,
  totalFilterCount = 0,
  isFiltersOpen = false,
  onToggleFilters
}) => {
  return (
    <div className="py-3 border-t border-border">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Filters Toggle Button - Always first */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleFilters}
          className="flex items-center gap-2 text-sm"
        >
          <span>Filters</span>
          {totalFilterCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {totalFilterCount}
            </span>
          )}
          {isFiltersOpen ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        {/* Active Filter Badges - To the right of toggle */}
        {activeFilters.map((filter, idx) => (
          <Badge 
            key={idx} 
            variant="secondary" 
            className="flex items-center gap-1 px-2 py-1"
          >
            <span className="text-xs">{filter.name}</span>
            <button
              onClick={() => removeFilter(filter.type, filter.id)}
              className="ml-1 hover:text-destructive transition-colors"
              aria-label={`Remove ${filter.name} filter`}
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        
        {/* Clear All Button - On the far right */}
        {activeFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-xs text-muted-foreground hover:text-foreground ml-auto"
          >
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
};

export default UnifiedFilterBar;

