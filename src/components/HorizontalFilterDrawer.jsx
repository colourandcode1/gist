import React from 'react';
import CategoryFilters from './CategoryFilters';
import TagFilters from './TagFilters';
import AdvancedFilters from './AdvancedFilters';

const HorizontalFilterDrawer = ({
  activeFilters,
  addFilter,
  removeFilter,
  clearCategoryFilters,
  clearTagFilters,
  clearAdvancedFilters,
  getCategoryFilterCount,
  getTagFilterCount,
  getAdvancedFilterCount,
  isOpen
}) => {
  // Filter Content - No toggle button, that's handled by UnifiedFilterBar
  if (!isOpen) {
    return null;
  }

  return (
    <div className="border-t border-border pb-4">
      <div className="pt-4 space-y-4">
          <CategoryFilters
            activeFilters={activeFilters}
            addFilter={addFilter}
            removeFilter={removeFilter}
            clearCategoryFilters={clearCategoryFilters}
            getCategoryFilterCount={getCategoryFilterCount}
            noCard={true}
            horizontal={true}
          />
          <TagFilters
            activeFilters={activeFilters}
            addFilter={addFilter}
            removeFilter={removeFilter}
            clearTagFilters={clearTagFilters}
            getTagFilterCount={getTagFilterCount}
            noCard={true}
            horizontal={true}
          />
          <AdvancedFilters
            activeFilters={activeFilters}
            addFilter={addFilter}
            removeFilter={removeFilter}
            clearAdvancedFilters={clearAdvancedFilters}
            getAdvancedFilterCount={getAdvancedFilterCount}
            noCard={true}
            horizontal={true}
          />
      </div>
    </div>
  );
};

export default HorizontalFilterDrawer;

