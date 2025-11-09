import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_TAGS } from '@/lib/constants';

/**
 * Component for displaying tag filters
 */
const TagFilters = ({ 
  activeFilters, 
  addFilter, 
  removeFilter, 
  clearTagFilters, 
  getTagFilterCount,
  noCard = false,
  horizontal = false
}) => {
  const content = (
    <div className={noCard ? "" : "p-4"}>
      <div className={`flex items-center justify-between ${horizontal ? 'mb-2' : 'mb-3'}`}>
        <h3 className="text-sm font-medium text-foreground">
          Tags {getTagFilterCount() > 0 && `(${getTagFilterCount()})`}
        </h3>
        {getTagFilterCount() > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTagFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            Clear All
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {DEFAULT_TAGS.map(tag => (
          <button
            key={tag.id}
            onClick={() => {
              const filterExists = activeFilters.some(f => f.type === 'tag' && f.id === tag.id);
              if (filterExists) {
                removeFilter('tag', tag.id);
              } else {
                addFilter('tag', tag.id, tag.name, tag.color);
              }
            }}
            className={`px-3 py-1 text-sm rounded-full border transition-colors ${
              activeFilters.some(f => f.type === 'tag' && f.id === tag.id)
                ? 'font-medium'
                : 'hover:bg-muted'
            }`}
            style={activeFilters.some(f => f.type === 'tag' && f.id === tag.id) ? {
              backgroundColor: `${tag.color}15`,
              color: tag.color,
              border: `1px solid ${tag.color}30`
            } : {
              backgroundColor: 'transparent',
              color: 'var(--muted-foreground)',
              border: '1px solid var(--border)'
            }}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </div>
  );

  if (noCard) {
    return <div className="mb-4">{content}</div>;
  }

  return (
    <Card className="mb-6">
      <CardContent>{content}</CardContent>
    </Card>
  );
};

export default TagFilters;

