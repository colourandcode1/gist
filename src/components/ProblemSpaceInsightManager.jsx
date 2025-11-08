import React, { useState, useEffect } from 'react';
import { Plus, X, Search, Filter } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import RepositoryNuggetCard from '@/components/RepositoryNuggetCard';
import { getAllNuggets, addInsightToProblemSpace, removeInsightFromProblemSpace } from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const ProblemSpaceInsightManager = ({ problemSpace, onUpdate }) => {
  const { currentUser } = useAuth();
  const [allNuggets, setAllNuggets] = useState([]);
  const [currentInsights, setCurrentInsights] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedNuggets, setSelectedNuggets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (problemSpace && currentUser) {
      loadInsights();
    }
  }, [problemSpace, currentUser]);

  const loadInsights = async () => {
    if (!currentUser || !problemSpace) return;

    setIsLoading(true);
    try {
      // Load all nuggets
      const nuggets = await getAllNuggets(currentUser.uid);
      setAllNuggets(nuggets);

      // Load current insights from problem space
      const insightIds = problemSpace.insightIds || [];
      const insights = nuggets.filter(nugget => {
        const insightId = `${nugget.session_id}:${nugget.id}`;
        return insightIds.includes(insightId);
      });
      setCurrentInsights(insights);
    } catch (error) {
      console.error('Error loading insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddInsights = async () => {
    if (!currentUser || !problemSpace || selectedNuggets.length === 0) return;

    try {
      for (const nugget of selectedNuggets) {
        const insightId = `${nugget.session_id}:${nugget.id}`;
        await addInsightToProblemSpace(problemSpace.id, insightId, currentUser.uid);
      }
      
      setSelectedNuggets([]);
      setShowAddDialog(false);
      await loadInsights();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error adding insights:', error);
      alert('Failed to add insights: ' + error.message);
    }
  };

  const handleRemoveInsight = async (nugget) => {
    if (!currentUser || !problemSpace) return;

    if (!window.confirm('Remove this insight from the problem space?')) return;

    try {
      const insightId = `${nugget.session_id}:${nugget.id}`;
      await removeInsightFromProblemSpace(problemSpace.id, insightId, currentUser.uid);
      await loadInsights();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error removing insight:', error);
      alert('Failed to remove insight: ' + error.message);
    }
  };

  const getAvailableNuggets = () => {
    const insightIds = problemSpace?.insightIds || [];
    return allNuggets.filter(nugget => {
      const insightId = `${nugget.session_id}:${nugget.id}`;
      return !insightIds.includes(insightId);
    });
  };

  const filterNuggets = (nuggets) => {
    if (!searchQuery.trim()) return nuggets;
    const query = searchQuery.toLowerCase();
    return nuggets.filter(nugget => 
      nugget.observation?.toLowerCase().includes(query) ||
      nugget.evidence_text?.toLowerCase().includes(query) ||
      nugget.category?.toLowerCase().includes(query) ||
      nugget.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  };

  const availableNuggets = filterNuggets(getAvailableNuggets());
  const filteredCurrentInsights = filterNuggets(currentInsights);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Insights ({currentInsights.length})
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage insights in this problem space
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Insights
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search insights..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Current Insights */}
      {filteredCurrentInsights.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'No insights match your search' : 'No insights in this problem space yet'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowAddDialog(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Insights
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredCurrentInsights.map((nugget) => {
            const insightId = `${nugget.session_id}:${nugget.id}`;
            return (
              <div key={insightId} className="relative">
                <RepositoryNuggetCard
                  nugget={nugget}
                  onNuggetClick={() => {}}
                  onWatchClick={() => {}}
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-4 right-4"
                  onClick={() => handleRemoveInsight(nugget)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Insights Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
            <CardContent className="p-6 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Add Insights to Problem Space</h3>
                <Button variant="ghost" size="icon" onClick={() => {
                  setShowAddDialog(false);
                  setSelectedNuggets([]);
                }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="mb-4">
                <Input
                  placeholder="Search available insights..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mb-4"
                />
                <p className="text-sm text-muted-foreground">
                  {selectedNuggets.length} insight{selectedNuggets.length !== 1 ? 's' : ''} selected
                </p>
              </div>

              {availableNuggets.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {searchQuery ? 'No insights match your search' : 'All available insights are already in this problem space'}
                </p>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  {availableNuggets.map((nugget) => {
                    const insightId = `${nugget.session_id}:${nugget.id}`;
                    const isSelected = selectedNuggets.some(n => 
                      `${n.session_id}:${n.id}` === insightId
                    );
                    return (
                      <div key={insightId} className="relative">
                        <div
                          className={`cursor-pointer ${isSelected ? 'ring-2 ring-primary' : ''}`}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedNuggets(selectedNuggets.filter(n => 
                                `${n.session_id}:${n.id}` !== insightId
                              ));
                            } else {
                              setSelectedNuggets([...selectedNuggets, nugget]);
                            }
                          }}
                        >
                          <RepositoryNuggetCard
                            nugget={nugget}
                            onNuggetClick={() => {}}
                            onWatchClick={() => {}}
                          />
                        </div>
                        {isSelected && (
                          <Badge className="absolute top-4 right-4 bg-primary">
                            Selected
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setShowAddDialog(false);
                  setSelectedNuggets([]);
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddInsights}
                  disabled={selectedNuggets.length === 0}
                >
                  Add {selectedNuggets.length} Insight{selectedNuggets.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProblemSpaceInsightManager;

