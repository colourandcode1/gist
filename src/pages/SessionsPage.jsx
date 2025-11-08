import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Calendar, User, FolderOpen, Filter, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import NavigationHeader from '@/components/NavigationHeader';
import { getSessions, getProjects } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const SessionsPage = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedSessionType, setSelectedSessionType] = useState('all');
  const [selectedCompanySize, setSelectedCompanySize] = useState('all');
  const [selectedUserRole, setSelectedUserRole] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const sessionTypes = [
    { value: 'user_interview', label: 'Interview' },
    { value: 'usability_test', label: 'Usability Test' },
    { value: 'feedback_session', label: 'Feedback' },
    { value: 'focus_group', label: 'Focus Group' }
  ];

  const companySizes = [
    { value: 'smb', label: 'SMB' },
    { value: 'mid_market', label: 'Mid-Market' },
    { value: 'enterprise', label: 'Enterprise' }
  ];

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  useEffect(() => {
    applyFilters();
  }, [sessions, searchQuery, selectedProject, selectedSessionType, selectedCompanySize, selectedUserRole, selectedIndustry, dateRange]);

  const loadData = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const [sessionsData, projectsData] = await Promise.all([
        getSessions(currentUser.uid),
        getProjects(currentUser.uid)
      ]);

      setSessions(sessionsData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setSessions([]);
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...sessions];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(session =>
        session.title?.toLowerCase().includes(query) ||
        session.participant_info?.name?.toLowerCase().includes(query) ||
        session.participantContext?.companyName?.toLowerCase().includes(query)
      );
    }

    // Project filter
    if (selectedProject !== 'all') {
      filtered = filtered.filter(session => session.projectId === selectedProject);
    }

    // Session type filter
    if (selectedSessionType !== 'all') {
      filtered = filtered.filter(session => session.session_type === selectedSessionType);
    }

    // Company size filter
    if (selectedCompanySize !== 'all') {
      filtered = filtered.filter(session =>
        session.participantContext?.companySize === selectedCompanySize
      );
    }

    // User role filter
    if (selectedUserRole !== 'all') {
      filtered = filtered.filter(session =>
        session.participantContext?.userRole?.toLowerCase().includes(selectedUserRole.toLowerCase())
      );
    }

    // Industry filter
    if (selectedIndustry !== 'all') {
      filtered = filtered.filter(session =>
        session.participantContext?.industry?.toLowerCase().includes(selectedIndustry.toLowerCase())
      );
    }

    // Date range filter
    if (dateRange.start) {
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.session_date || session.createdAt);
        return sessionDate >= new Date(dateRange.start);
      });
    }
    if (dateRange.end) {
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.session_date || session.createdAt);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999); // Include entire end date
        return sessionDate <= endDate;
      });
    }

    setFilteredSessions(filtered);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedProject('all');
    setSelectedSessionType('all');
    setSelectedCompanySize('all');
    setSelectedUserRole('all');
    setSelectedIndustry('all');
    setDateRange({ start: '', end: '' });
  };

  const hasActiveFilters = searchQuery || selectedProject !== 'all' || selectedSessionType !== 'all' ||
    selectedCompanySize !== 'all' || selectedUserRole !== 'all' || selectedIndustry !== 'all' ||
    dateRange.start || dateRange.end;

  const getProjectName = (projectId) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  const getSessionTypeLabel = (type) => {
    const found = sessionTypes.find(t => t.value === type);
    return found?.label || type;
  };

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Sessions</h1>
            <p className="text-muted-foreground">View and manage all your research sessions</p>
          </div>
          <Button onClick={() => navigate('/')} className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            New Session
          </Button>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search sessions by title, participant, or company..."
                  className="w-full pl-10"
                />
              </div>

              {/* Filter Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Project Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Project</label>
                  <select
                    value={selectedProject}
                    onChange={(e) => setSelectedProject(e.target.value)}
                    className="w-full h-9 px-3 py-1 text-sm bg-background border border-input rounded-md"
                  >
                    <option value="all">All Projects</option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                </div>

                {/* Session Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Session Type</label>
                  <select
                    value={selectedSessionType}
                    onChange={(e) => setSelectedSessionType(e.target.value)}
                    className="w-full h-9 px-3 py-1 text-sm bg-background border border-input rounded-md"
                  >
                    <option value="all">All Types</option>
                    {sessionTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Company Size Filter */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Company Size</label>
                  <select
                    value={selectedCompanySize}
                    onChange={(e) => setSelectedCompanySize(e.target.value)}
                    className="w-full h-9 px-3 py-1 text-sm bg-background border border-input rounded-md"
                  >
                    <option value="all">All Sizes</option>
                    {companySizes.map(size => (
                      <option key={size.value} value={size.value}>{size.label}</option>
                    ))}
                  </select>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Date Range</label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      placeholder="Start"
                      className="flex-1 h-9 text-sm"
                    />
                    <Input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      placeholder="End"
                      className="flex-1 h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Clear Filters */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    {filteredSessions.length} of {sessions.length} sessions
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="flex items-center gap-1">
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-muted-foreground">Loading sessions...</p>
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">
                {sessions.length === 0 ? 'No sessions yet' : 'No sessions match your filters'}
              </p>
              {sessions.length === 0 && (
                <Button onClick={() => navigate('/')} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Create First Session
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/sessions/${session.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">{session.title}</h3>
                        <Badge variant="outline">{getSessionTypeLabel(session.session_type)}</Badge>
                        {session.projectId && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <FolderOpen className="w-3 h-3" />
                            {getProjectName(session.projectId)}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {session.session_date || new Date(session.createdAt).toLocaleDateString()}
                        </div>
                        {session.participant_info?.name && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {session.participant_info.name}
                          </div>
                        )}
                        {session.participantContext?.companyName && (
                          <span>{session.participantContext.companyName}</span>
                        )}
                        {session.participantContext?.companySize && (
                          <Badge variant="outline" className="text-xs">
                            {session.participantContext.companySize}
                          </Badge>
                        )}
                        {session.nuggets && session.nuggets.length > 0 && (
                          <span>{session.nuggets.length} insights</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionsPage;
