import React, { useState, useEffect } from 'react';
import { Filter, Calendar, User, Building2, Briefcase, TrendingUp, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

        {(showFilters || horizontal) && (
          <div className={`${horizontal ? 'space-y-3' : 'space-y-4 pt-4 border-t'}`}>
            {/* Project Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <label className="text-xs font-medium text-foreground">Project</label>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-between min-w-[200px]"
                  >
                    <span>
                      {getActiveFiltersForType('project').length > 0
                        ? `${getActiveFiltersForType('project').length} selected`
                        : 'Select projects...'}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 max-h-[300px] overflow-y-auto"
                  onSelect={(e) => e.preventDefault()}
                >
                  {projects.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No projects available
                    </div>
                  ) : (
                    projects.map(project => {
                      const isSelected = getActiveFiltersForType('project').some(f => f.id === project.id);
                      return (
                        <DropdownMenuCheckboxItem
                          key={project.id}
                          checked={isSelected}
                          onCheckedChange={() => handleFilterToggle('project', project.id, project.name)}
                          onSelect={(e) => e.preventDefault()}
                        >
                          {project.name}
                        </DropdownMenuCheckboxItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Session Filter */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <label className="text-xs font-medium text-foreground">Session</label>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-between min-w-[200px]"
                  >
                    <span>
                      {getActiveFiltersForType('session').length > 0
                        ? `${getActiveFiltersForType('session').length} selected`
                        : 'Select sessions...'}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  className="w-56 max-h-[300px] overflow-y-auto"
                  onSelect={(e) => e.preventDefault()}
                >
                  {sessions.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No sessions available
                    </div>
                  ) : (
                    sessions.map(session => {
                      const isSelected = getActiveFiltersForType('session').some(f => f.id === session.id);
                      return (
                        <DropdownMenuCheckboxItem
                          key={session.id}
                          checked={isSelected}
                          onCheckedChange={() => handleFilterToggle('session', session.id, session.title)}
                          onSelect={(e) => e.preventDefault()}
                        >
                          {session.title}
                        </DropdownMenuCheckboxItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-between min-w-[160px]"
                      >
                        <span>
                          {getActiveFiltersForType('companySize').length > 0
                            ? `${getActiveFiltersForType('companySize').length} selected`
                            : 'Company Size'}
                        </span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      className="w-56"
                      onSelect={(e) => e.preventDefault()}
                    >
                      {companySizes.map(size => {
                        const isSelected = getActiveFiltersForType('companySize').some(f => f.id === size.id);
                        return (
                          <DropdownMenuCheckboxItem
                            key={size.id}
                            checked={isSelected}
                            onCheckedChange={() => handleFilterToggle('companySize', size.id, size.label)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {size.label}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* User Type */}
                <div className={horizontal ? "flex items-center gap-2" : ""}>
                  {horizontal && <label className="text-xs text-muted-foreground whitespace-nowrap">User Type:</label>}
                  {!horizontal && <label className="text-xs text-muted-foreground mb-1 block">User Type</label>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-between min-w-[160px]"
                      >
                        <span>
                          {getActiveFiltersForType('userType').length > 0
                            ? `${getActiveFiltersForType('userType').length} selected`
                            : 'User Type'}
                        </span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      className="w-56"
                      onSelect={(e) => e.preventDefault()}
                    >
                      {userTypes.map(type => {
                        const isSelected = getActiveFiltersForType('userType').some(f => f.id === type.id);
                        return (
                          <DropdownMenuCheckboxItem
                            key={type.id}
                            checked={isSelected}
                            onCheckedChange={() => handleFilterToggle('userType', type.id, type.label)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {type.label}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Product Tenure */}
                <div className={horizontal ? "flex items-center gap-2" : ""}>
                  {horizontal && <label className="text-xs text-muted-foreground whitespace-nowrap">Tenure:</label>}
                  {!horizontal && <label className="text-xs text-muted-foreground mb-1 block">Product Tenure</label>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="justify-between min-w-[160px]"
                      >
                        <span>
                          {getActiveFiltersForType('productTenure').length > 0
                            ? `${getActiveFiltersForType('productTenure').length} selected`
                            : 'Product Tenure'}
                        </span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      className="w-56"
                      onSelect={(e) => e.preventDefault()}
                    >
                      {productTenures.map(tenure => {
                        const isSelected = getActiveFiltersForType('productTenure').some(f => f.id === tenure.id);
                        return (
                          <DropdownMenuCheckboxItem
                            key={tenure.id}
                            checked={isSelected}
                            onCheckedChange={() => handleFilterToggle('productTenure', tenure.id, tenure.label)}
                            onSelect={(e) => e.preventDefault()}
                          >
                            {tenure.label}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Industry */}
                <div className={horizontal ? "flex items-center gap-2" : ""}>
                  {horizontal && <label className="text-xs text-muted-foreground whitespace-nowrap">Industry:</label>}
                  {!horizontal && <label className="text-xs text-muted-foreground mb-1 block">Industry</label>}
                  <input
                    type="text"
                    placeholder="Enter industry..."
                    className="h-9 px-3 py-1 text-sm bg-background border border-input rounded-md min-w-[160px]"
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

