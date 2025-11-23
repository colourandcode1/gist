import { useState, useMemo } from 'react';

export const useRepositoryFilters = (allNuggets, savedSessions) => {
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const addFilter = (type, id, name, color) => {
    const filterExists = activeFilters.some(filter => filter.type === type && filter.id === id);
    if (!filterExists) {
      setActiveFilters(prev => [...prev, { type, id, name, color }]);
    }
  };

  const removeFilter = (type, id) => {
    setActiveFilters(prev => prev.filter(filter => !(filter.type === type && filter.id === id)));
  };

  const clearAllFilters = () => {
    setActiveFilters([]);
  };

  // Helper functions for filter counts and clearing
  const getCategoryFilterCount = () => {
    return activeFilters.filter(f => f.type === 'category').length;
  };

  const getTagFilterCount = () => {
    return activeFilters.filter(f => f.type === 'tag').length;
  };

  const clearCategoryFilters = () => {
    setActiveFilters(prev => prev.filter(f => f.type !== 'category'));
  };

  const clearTagFilters = () => {
    setActiveFilters(prev => prev.filter(f => f.type !== 'tag'));
  };

  const getAdvancedFilterCount = () => {
    return activeFilters.filter(f => 
      ['project', 'session', 'companySize', 'userType', 'industry', 'productTenure', 'dateRange', 'researcher'].includes(f.type)
    ).length;
  };

  const clearAdvancedFilters = () => {
    setActiveFilters(prev => prev.filter(f => 
      !['project', 'session', 'companySize', 'userType', 'industry', 'productTenure', 'dateRange', 'researcher'].includes(f.type)
    ));
  };

  // Filter nuggets based on search query and active filters
  const filteredNuggets = useMemo(() => {
    return allNuggets.filter(nugget => {
      try {
        // Text search filter with proper data validation
        const matchesSearch = searchQuery === '' || 
          (nugget.observation && typeof nugget.observation === 'string' && nugget.observation.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (nugget.evidence_text && typeof nugget.evidence_text === 'string' && nugget.evidence_text.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (nugget.session_title && typeof nugget.session_title === 'string' && nugget.session_title.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (nugget.tags && Array.isArray(nugget.tags) && nugget.tags.some(tag => 
            tag && typeof tag === 'string' && tag.toLowerCase().includes(searchQuery.toLowerCase())
          ));

        // Category and tag filters
        const activeCategoryFilters = activeFilters.filter(f => f.type === 'category');
        const activeTagFilters = activeFilters.filter(f => f.type === 'tag');
        
        const matchesCategories = activeCategoryFilters.length === 0 || 
          activeCategoryFilters.some(filter => nugget.category === filter.id);
        
        const matchesTags = activeTagFilters.length === 0 || 
          (nugget.tags && Array.isArray(nugget.tags) && activeTagFilters.some(filter => {
            // Handle both tag IDs (numbers) and tag strings
            return nugget.tags.some(tag => 
              typeof tag === 'number' ? tag === filter.id : 
              typeof tag === 'string' ? tag.toString() === filter.id.toString() || tag.toLowerCase().includes(filter.name?.toLowerCase() || '') :
              false
            );
          }));

        // Advanced filters
        const projectFilters = activeFilters.filter(f => f.type === 'project');
        const sessionFilters = activeFilters.filter(f => f.type === 'session');
        const companySizeFilters = activeFilters.filter(f => f.type === 'companySize');
        const userTypeFilters = activeFilters.filter(f => f.type === 'userType');
        const industryFilters = activeFilters.filter(f => f.type === 'industry');
        const productTenureFilters = activeFilters.filter(f => f.type === 'productTenure');
        const dateRangeFilters = activeFilters.filter(f => f.type === 'dateRange');

        // Find session for this nugget to check participant context and project
        const session = savedSessions.find(s => s.id === nugget.session_id);

        const matchesProject = projectFilters.length === 0 || 
          (session && projectFilters.some(filter => session.projectId === filter.id));

        const matchesSession = sessionFilters.length === 0 || 
          sessionFilters.some(filter => nugget.session_id === filter.id);

        const matchesCompanySize = companySizeFilters.length === 0 ||
          (session?.participantContext?.companySize && 
           companySizeFilters.some(filter => session.participantContext.companySize === filter.id));

        const matchesUserType = userTypeFilters.length === 0 ||
          (session?.participantContext?.userType && 
           userTypeFilters.some(filter => session.participantContext.userType === filter.id));

        const matchesIndustry = industryFilters.length === 0 ||
          (session?.participantContext?.industry && 
           industryFilters.some(filter => 
             session.participantContext.industry?.toLowerCase().includes(filter.id.toLowerCase())
           ));

        const matchesProductTenure = productTenureFilters.length === 0 ||
          (session?.participantContext?.productTenure && 
           productTenureFilters.some(filter => session.participantContext.productTenure === filter.id));

        const matchesDateRange = dateRangeFilters.length === 0 || (() => {
          if (!nugget.session_date || !session) return true;
          const sessionDate = new Date(nugget.session_date);
          const now = new Date();
          
          return dateRangeFilters.some(filter => {
            const daysAgo = {
              'last_7_days': 7,
              'last_30_days': 30,
              'last_90_days': 90,
              'last_year': 365
            }[filter.id] || 0;
            
            const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            return sessionDate >= cutoffDate;
          });
        })();

        return matchesSearch && matchesCategories && matchesTags && 
               matchesProject && matchesSession && matchesCompanySize && 
               matchesUserType && matchesIndustry && matchesProductTenure && matchesDateRange;
      } catch (error) {
        console.error('Error filtering nugget:', error, nugget);
        return false; // Exclude problematic nuggets
      }
    });
  }, [allNuggets, savedSessions, searchQuery, activeFilters]);

  return {
    activeFilters,
    searchQuery,
    setSearchQuery,
    addFilter,
    removeFilter,
    clearAllFilters,
    getCategoryFilterCount,
    getTagFilterCount,
    clearCategoryFilters,
    clearTagFilters,
    getAdvancedFilterCount,
    clearAdvancedFilters,
    filteredNuggets
  };
};

