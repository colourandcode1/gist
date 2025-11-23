import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import NavigationHeader from '@/components/NavigationHeader';
import Breadcrumbs from '@/components/Breadcrumbs';
import ProblemSpaceInsightManager from '@/components/ProblemSpaceInsightManager';
import CommentsThread from '@/components/Comments/CommentsThread';
import ShareDialog from '@/components/Sharing/ShareDialog';
import ExportDialog from '@/components/Export/ExportDialog';
import { ProblemSpaceHeader } from '@/components/ProblemSpace/ProblemSpaceHeader';
import { ProblemSpaceOverviewTab } from '@/components/ProblemSpace/ProblemSpaceOverviewTab';
import { ProblemSpaceSettingsTab } from '@/components/ProblemSpace/ProblemSpaceSettingsTab';
import { useProblemSpace } from '@/hooks/useProblemSpace';
import { useAuth } from '@/contexts/AuthContext';
import { canEditProblemSpaces } from '@/lib/permissions';

const ProblemSpaceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const {
    problemSpace,
    isLoading,
    isEditing,
    setIsEditing,
    editData,
    setEditData,
    projects,
    newQuestion,
    setNewQuestion,
    isSaving,
    loadProblemSpace,
    handleSave,
    handlePrivacyChange,
    handleDelete,
    handleDuplicate,
    handleAddQuestion,
    handleRemoveQuestion
  } = useProblemSpace(id, currentUser);

  React.useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="bg-background min-h-screen">
        <NavigationHeader />
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading problem space...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!problemSpace) {
    return (
      <div className="bg-background min-h-screen">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto p-6">
          <p className="text-muted-foreground">Problem space not found</p>
        </div>
      </div>
    );
  }

  const canEdit = problemSpace && canEditProblemSpaces(
    userProfile?.role,
    problemSpace.userId,
    currentUser?.uid,
    problemSpace.contributors || []
  ) && (
    problemSpace.userId === currentUser?.uid || 
    problemSpace.contributors?.includes(currentUser?.uid)
  );

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({
      name: problemSpace.name || '',
      description: problemSpace.description || '',
      problemStatement: problemSpace.problemStatement || '',
      keyQuestions: problemSpace.keyQuestions || []
    });
  };

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Problem Spaces', path: '/problem-spaces' },
            { label: problemSpace.name }
          ]}
        />
        
        {/* Header */}
        <ProblemSpaceHeader
          problemSpace={problemSpace}
          isEditing={isEditing}
          editData={editData}
          setEditData={setEditData}
          isSaving={isSaving}
          canEdit={canEdit}
          currentUser={currentUser}
          onEdit={() => setIsEditing(true)}
          onCancelEdit={handleCancelEdit}
          onSave={handleSave}
          onDuplicate={handleDuplicate}
          onShare={() => setShowShareDialog(true)}
          onExport={() => setShowExportDialog(true)}
          onDelete={handleDelete}
        />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <ProblemSpaceOverviewTab
              problemSpace={problemSpace}
              isEditing={isEditing}
              editData={editData}
              setEditData={setEditData}
              newQuestion={newQuestion}
              setNewQuestion={setNewQuestion}
              projects={projects}
              onAddQuestion={handleAddQuestion}
              onRemoveQuestion={handleRemoveQuestion}
            />
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-6">
            <ProblemSpaceInsightManager 
              problemSpace={problemSpace} 
              onUpdate={loadProblemSpace}
            />
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-6">
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Comments</h3>
              <CommentsThread problemSpaceId={problemSpace.id} />
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <ProblemSpaceSettingsTab
              problemSpace={problemSpace}
              canEdit={canEdit}
              currentUser={currentUser}
              onPrivacyChange={handlePrivacyChange}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      {showShareDialog && (
        <ShareDialog
          problemSpaceId={problemSpace.id}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          problemSpaceId={problemSpace.id}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
};

export default ProblemSpaceDetailPage;
