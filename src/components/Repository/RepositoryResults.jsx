import React, { useState } from 'react';
import { Plus, Target, CheckSquare, Square } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import RepositoryNuggetCard from '../RepositoryNuggetCard';
import RepositoryAnalytics from '../RepositoryAnalytics';
import { canBulkOperations } from '@/lib/permissions';

export const RepositoryResults = ({
  filteredNuggets,
  allNuggets,
  savedSessions,
  projects,
  selectedNuggets,
  toggleNuggetSelection,
  handleNuggetClick,
  handleWatchClick,
  handleBulkAddToProblemSpace,
  toggleSelectAll,
  userOrganization,
  userProfile,
  onNavigate
}) => {
  const [showAnalytics, setShowAnalytics] = useState(false);

  return (
    <div className="space-y-4 bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-foreground">
            {filteredNuggets.length} insights found
          </h2>
          {selectedNuggets.size > 0 && (
            <Badge variant="secondary">
              {selectedNuggets.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </Button>
          {canBulkOperations(userOrganization?.tier, userProfile?.role, userProfile?.is_admin) && (
            <>
              {filteredNuggets.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSelectAll}
                >
                  {selectedNuggets.size === filteredNuggets.length ? (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Deselect All
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4 mr-2" />
                      Select All
                    </>
                  )}
                </Button>
              )}
              {selectedNuggets.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleBulkAddToProblemSpace}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Add to Problem Space ({selectedNuggets.size})
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {showAnalytics && (
        <RepositoryAnalytics nuggets={filteredNuggets} sessions={savedSessions} projects={projects} />
      )}

      {filteredNuggets.map(nugget => {
        const insightId = `${nugget.session_id}:${nugget.id}`;
        const isSelected = selectedNuggets.has(insightId);
        const session = savedSessions.find(s => s.id === nugget.session_id);
        const project = session?.projectId ? projects.find(p => p.id === session.projectId) : null;
        
        return (
          <div 
            key={nugget.id} 
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              toggleNuggetSelection(nugget);
            }}
          >
            <RepositoryNuggetCard
              nugget={nugget}
              session={session}
              project={project}
              isSelected={isSelected}
              onNuggetClick={handleNuggetClick}
              onWatchClick={handleWatchClick}
              onAddToProblemSpace={() => {
                // This will be handled by the parent component
                handleBulkAddToProblemSpace();
              }}
            />
          </div>
        );
      })}

      {filteredNuggets.length === 0 && (
        <div className="text-center py-8 text-muted-foreground bg-background">
          <p className="text-sm">
            {allNuggets.length === 0 ? 'No insights yet' : 'No insights match your search'}
          </p>
          {allNuggets.length === 0 && (
            <Button
              onClick={() => onNavigate('upload')}
              className="mt-3 flex items-center gap-2"
              size="sm"
            >
              <Plus className="w-4 h-4" />
              Create First Session
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

