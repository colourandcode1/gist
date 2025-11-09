import React, { useState, useEffect } from 'react';
import { Filter, X, Calendar, User, Building2, Briefcase, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getProjects, getSessions } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const AdvancedFilters = ({
  activeFilters,
  addFilter,
  removeFilter,
  clearAdvancedFilters,
  getAdvancedFilterCount,
  noCard = false,
  horizontal = false
}) => {
  const { currentUser } = useAuth();
  const [projects, setProjects] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [showFilters, setShowFilters] = useState(horizontal); // Auto-show when horizontal

  useEffect(() => {
    if (currentUser && (showFilters || horizontal)) {
      loadFilterData();
    }
  }, [currentUser, showFilters, horizontal]);

  const loadFilterData = async () => {
    try {
      const [projectsData, sessionsData] = await Promise.all([
        getProjects(currentUser.uid),
        getSessions(currentUser.uid)
      ]);
      setProjects(projectsData);
      setSessions(sessionsData);
    } catch (error) {
      console.error('Error loading filter data:', error);
    }
  };

  const companySizes = [
    { id: 'smb', label: 'SMB' },
    { id: 'mid_market', label: 'Mid-Market' },
    { id: 'enterprise', label: 'Enterprise' }
  ];

  const userTypes = [
    { id: 'admin', label: 'Admin' },
    { id: 'end_user', label: 'End User' },
    { id: 'decision_maker', label: 'Decision Maker' }
  ];

  const productTenures = [
    { id: 'new', label: 'New' },
    { id: 'regular', label: 'Regular' },
    { id: 'power_user', label: 'Power User' }
  ];

  const dateRanges = [
    { id: 'last_7_days', label: 'Last 7 days' },
    { id: 'last_30_days', label: 'Last 30 days' },
    { id: 'last_90_days', label: 'Last 90 days' },
    { id: 'last_year', label: 'Last year' }
  ];

  const handleFilterToggle = (type, id, label) => {
    const filterExists = activeFilters.some(f => f.type === type && f.id === id);
    if (filterExists) {
      removeFilter(type, id);
    } else {
      addFilter(type, id, label, null);
    }
  };

  const getActiveFiltersForType = (type) => {
    return activeFilters.filter(f => f.type === type);
  };

  const content = (
    <div className={noCard ? "" : "p-4"}>
        <div className={`flex items-center justify-between ${horizontal ? 'mb-2' : 'mb-4'}`}>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-foreground">
              Advanced Filters {getAdvancedFilterCount() > 0 && `(${getAdvancedFilterCount()})`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {getAdvancedFilterCount() > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAdvancedFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear All
              </Button>
            )}
            {!horizontal && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {getAdvancedFilterCount() > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeFilters
              .filter(f => ['project', 'session', 'companySize', 'userType', 'industry', 'productTenure', 'dateRange', 'researcher'].includes(f.type))
              .map((filter, idx) => (
                <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                  {filter.name}
                  <button
                    onClick={() => removeFilter(filter.type, filter.id)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
          </div>
        )}

        {(showFilters || horizontal) && (
          <div className={`${horizontal ? 'space-y-3' : 'space-y-4 pt-4 border-t'}`}>
            {/* Project Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <label className="text-xs font-medium text-foreground">Project</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {projects.map(project => (
                  <Button
                    key={project.id}
                    variant={getActiveFiltersForType('project').some(f => f.id === project.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterToggle('project', project.id, project.name)}
                  >
                    {project.name}
                  </Button>
                ))}
                {projects.length === 0 && (
                  <span className="text-xs text-muted-foreground">No projects available</span>
                )}
              </div>
            </div>

            {/* Session Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <label className="text-xs font-medium text-foreground">Session</label>
              </div>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {sessions.slice(0, 20).map(session => (
                  <Button
                    key={session.id}
                    variant={getActiveFiltersForType('session').some(f => f.id === session.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterToggle('session', session.id, session.title)}
                  >
                    {session.title}
                  </Button>
                ))}
                {sessions.length === 0 && (
                  <span className="text-xs text-muted-foreground">No sessions available</span>
                )}
              </div>
            </div>

            {/* Participant Context Filters */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <label className="text-xs font-medium text-foreground">Participant Context</label>
              </div>
              <div className={horizontal ? "flex flex-wrap gap-3" : "space-y-3"}>
                {/* Company Size */}
                <div className={horizontal ? "flex items-center gap-2" : ""}>
                  {horizontal && <label className="text-xs text-muted-foreground whitespace-nowrap">Company Size:</label>}
                  {!horizontal && <label className="text-xs text-muted-foreground mb-1 block">Company Size</label>}
                  <div className="flex flex-wrap gap-2">
                    {companySizes.map(size => (
                      <Button
                        key={size.id}
                        variant={getActiveFiltersForType('companySize').some(f => f.id === size.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterToggle('companySize', size.id, size.label)}
                      >
                        {size.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* User Type */}
                <div className={horizontal ? "flex items-center gap-2" : ""}>
                  {horizontal && <label className="text-xs text-muted-foreground whitespace-nowrap">User Type:</label>}
                  {!horizontal && <label className="text-xs text-muted-foreground mb-1 block">User Type</label>}
                  <div className="flex flex-wrap gap-2">
                    {userTypes.map(type => (
                      <Button
                        key={type.id}
                        variant={getActiveFiltersForType('userType').some(f => f.id === type.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterToggle('userType', type.id, type.label)}
                      >
                        {type.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Product Tenure */}
                <div className={horizontal ? "flex items-center gap-2" : ""}>
                  {horizontal && <label className="text-xs text-muted-foreground whitespace-nowrap">Tenure:</label>}
                  {!horizontal && <label className="text-xs text-muted-foreground mb-1 block">Product Tenure</label>}
                  <div className="flex flex-wrap gap-2">
                    {productTenures.map(tenure => (
                      <Button
                        key={tenure.id}
                        variant={getActiveFiltersForType('productTenure').some(f => f.id === tenure.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleFilterToggle('productTenure', tenure.id, tenure.label)}
                      >
                        {tenure.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Industry (text input) */}
                <div className={horizontal ? "flex items-center gap-2" : ""}>
                  {horizontal && <label className="text-xs text-muted-foreground whitespace-nowrap">Industry:</label>}
                  {!horizontal && <label className="text-xs text-muted-foreground mb-1 block">Industry</label>}
                  <input
                    type="text"
                    placeholder="Filter by industry..."
                    className={`${horizontal ? 'w-48' : 'w-full'} h-9 px-3 py-1 text-sm bg-background border border-input rounded-md`}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        handleFilterToggle('industry', e.target.value.trim().toLowerCase(), e.target.value.trim());
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Date Range Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <label className="text-xs font-medium text-foreground">Date Range</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {dateRanges.map(range => (
                  <Button
                    key={range.id}
                    variant={getActiveFiltersForType('dateRange').some(f => f.id === range.id) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterToggle('dateRange', range.id, range.label)}
                  >
                    {range.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
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

export default AdvancedFilters;

