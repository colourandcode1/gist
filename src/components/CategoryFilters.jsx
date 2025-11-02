import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES } from '@/lib/constants';

/**
 * Component for displaying category filters in sidebar
 */
const CategoryFilters = ({ 
  activeFilters, 
  addFilter, 
  removeFilter, 
  clearCategoryFilters, 
  getCategoryFilterCount
}) => {
  return (
    <Card className="sticky top-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-foreground">
            Categories {getCategoryFilterCount() > 0 && `(${getCategoryFilterCount()})`}
          </h3>
          {getCategoryFilterCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCategoryFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear All
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {CATEGORIES.map(category => (
            <button
              key={category.id}
              onClick={() => {
                const filterExists = activeFilters.some(f => f.type === 'category' && f.id === category.id);
                if (filterExists) {
                  removeFilter('category', category.id);
                } else {
                  addFilter('category', category.id, category.name, category.color);
                }
              }}
              className={`w-full text-left px-3 py-2 text-sm rounded-lg border transition-colors ${
                activeFilters.some(f => f.type === 'category' && f.id === category.id)
                  ? 'font-medium'
                  : 'hover:bg-muted'
              }`}
              style={activeFilters.some(f => f.type === 'category' && f.id === category.id) ? {
                backgroundColor: `${category.color}15`,
                color: category.color,
                border: `1px solid ${category.color}30`
              } : {
                backgroundColor: 'transparent',
                color: 'var(--muted-foreground)',
                border: '1px solid var(--border)'
              }}
            >
              {category.name}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryFilters;

