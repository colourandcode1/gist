import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES } from '@/lib/constants';

/**
 * Component for displaying category filters
 */
const CategoryFilters = ({ 
  activeFilters, 
  addFilter, 
  removeFilter, 
  clearCategoryFilters, 
  getCategoryFilterCount,
  noCard = false,
  horizontal = false
}) => {
  const content = (
    <div className={noCard ? "" : "p-4"}>
      <div className={`flex items-center justify-between mb-3 ${horizontal ? 'mb-2' : ''}`}>
        <h3 className="text-sm font-medium text-foreground">
          Categories {getCategoryFilterCount() > 0 && `(${getCategoryFilterCount()})`}
        </h3>
      </div>
      <div className={horizontal ? "flex flex-wrap gap-2" : "space-y-2"}>
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
            className={`${horizontal ? 'px-3 py-1.5' : 'w-full text-left px-3 py-2'} text-sm rounded-lg border transition-colors ${
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
    </div>
  );

  if (noCard) {
    return <div className="mb-4">{content}</div>;
  }

  return (
    <Card className="sticky top-6">
      <CardContent>{content}</CardContent>
    </Card>
  );
};

export default CategoryFilters;

