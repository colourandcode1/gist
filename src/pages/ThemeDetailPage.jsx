import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import NavigationHeader from '@/components/NavigationHeader';
import Breadcrumbs from '@/components/Breadcrumbs';
import ThemeInsightManager from '@/components/ThemeInsightManager';
import CommentsThread from '@/components/Comments/CommentsThread';
import ShareDialog from '@/components/Sharing/ShareDialog';
import ExportDialog from '@/components/Export/ExportDialog';
import { ThemeHeader } from '@/components/Theme/ThemeHeader';
import { ThemeOverviewTab } from '@/components/Theme/ThemeOverviewTab';
import { ThemeSettingsTab } from '@/components/Theme/ThemeSettingsTab';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/contexts/AuthContext';
import { canEditThemes } from '@/lib/permissions';

const ThemeDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  const {
    theme,
    isLoading,
    isEditing,
    setIsEditing,
    editData,
    setEditData,
    projects,
    newQuestion,
    setNewQuestion,
    isSaving,
    loadTheme,
    handleSave,
    handlePrivacyChange,
    handleDelete,
    handleDuplicate,
    handleAddQuestion,
    handleRemoveQuestion
  } = useTheme(id, currentUser);

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
            <p className="text-muted-foreground">Loading theme...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!theme) {
    return (
      <div className="bg-background min-h-screen">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto p-6">
          <p className="text-muted-foreground">Theme not found</p>
        </div>
      </div>
    );
  }

  const canEdit = theme && canEditThemes(
    userProfile?.role,
    theme.userId,
    currentUser?.uid,
    theme.contributors || []
  ) && (
    theme.userId === currentUser?.uid || 
    theme.contributors?.includes(currentUser?.uid)
  );

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditData({
      name: theme.name || '',
      description: theme.description || '',
      problemStatement: theme.problemStatement || '',
      keyQuestions: theme.keyQuestions || []
    });
  };

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto p-6">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: 'Themes', path: '/themes' },
            { label: theme.name }
          ]}
        />
        
        {/* Header */}
        <ThemeHeader
          theme={theme}
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
            <ThemeOverviewTab
              theme={theme}
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
            <ThemeInsightManager 
              theme={theme} 
              onUpdate={loadTheme}
            />
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-6">
            <div className="bg-card rounded-lg border p-6">
              <h3 className="text-lg font-semibold mb-4">Comments</h3>
              <CommentsThread themeId={theme.id} />
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <ThemeSettingsTab
              theme={theme}
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
          themeId={theme.id}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {/* Export Dialog */}
      {showExportDialog && (
        <ExportDialog
          themeId={theme.id}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
};

export default ThemeDetailPage;

