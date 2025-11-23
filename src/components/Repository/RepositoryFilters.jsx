import React from 'react';
import UnifiedFilterBar from '../UnifiedFilterBar';
import HorizontalFilterDrawer from '../HorizontalFilterDrawer';

export const RepositoryFilters = ({
  activeFilters,
  addFilter,
  removeFilter,
  clearAllFilters,
  clearCategoryFilters,
  clearTagFilters,
  clearAdvancedFilters,
  getCategoryFilterCount,
  getTagFilterCount,
  getAdvancedFilterCount,
  isFiltersOpen,
  onToggleFilters
}) => {
  return (
    <>
      {/* Unified Filter Bar - Always visible, Filters button always first */}
      <UnifiedFilterBar
        activeFilters={activeFilters}
        removeFilter={removeFilter}
        clearAllFilters={clearAllFilters}
        totalFilterCount={getCategoryFilterCount() + getTagFilterCount() + getAdvancedFilterCount()}
        isFiltersOpen={isFiltersOpen}
        onToggleFilters={onToggleFilters}
      />
      
      {/* Horizontal Filter Drawer - Content only, no toggle */}
      <HorizontalFilterDrawer
        activeFilters={activeFilters}
        addFilter={addFilter}
        removeFilter={removeFilter}
        clearCategoryFilters={clearCategoryFilters}
        clearTagFilters={clearTagFilters}
        clearAdvancedFilters={clearAdvancedFilters}
        getCategoryFilterCount={getCategoryFilterCount}
        getTagFilterCount={getTagFilterCount}
        getAdvancedFilterCount={getAdvancedFilterCount}
        isOpen={isFiltersOpen}
      />
    </>
  );
};

