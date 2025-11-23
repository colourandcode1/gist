import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getThemeById, 
  updateTheme, 
  updateThemePrivacy,
  deleteTheme,
  createActivity,
  createTheme
} from '@/lib/firestoreUtils';
import { getProjects } from '@/lib/firestoreUtils';

export const useTheme = (id, currentUser) => {
  const navigate = useNavigate();
  const [theme, setTheme] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [projects, setProjects] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadTheme = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const space = await getThemeById(id);
      if (!space) {
        navigate('/themes');
        return;
      }

      setTheme(space);
      setEditData({
        name: space.name || '',
        description: space.description || '',
        problemStatement: space.problemStatement || '',
        keyQuestions: space.keyQuestions || []
      });
    } catch (error) {
      console.error('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    if (!currentUser) return;
    try {
      const allProjects = await getProjects(currentUser.uid);
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  useEffect(() => {
    if (id && currentUser) {
      loadTheme();
      loadProjects();
    }
  }, [id, currentUser]);

  const handleSave = async () => {
    if (!currentUser || !theme) return;

    setIsSaving(true);
    try {
      const result = await updateTheme(theme.id, editData, currentUser.uid);
      if (result.success) {
        // Track activity
        await createActivity(
          {
            type: 'theme_updated',
            themeId: theme.id,
            description: `${currentUser.email?.split('@')[0] || 'User'} updated the theme`,
            metadata: {
              updatedFields: Object.keys(editData)
            }
          },
          currentUser.uid
        );

        await loadTheme();
        setIsEditing(false);
      } else {
        alert(`Failed to update: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrivacyChange = async (privacy) => {
    if (!currentUser || !theme) return;

    try {
      const result = await updateThemePrivacy(
        theme.id, 
        privacy, 
        theme.teamId, 
        currentUser.uid
      );
      if (result.success) {
        await loadTheme();
      } else {
        alert(`Failed to update privacy: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
      alert('Failed to update privacy settings');
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !theme) return;

    if (!window.confirm('Are you sure you want to delete this theme? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteTheme(theme.id, currentUser.uid);
      if (result.success) {
        navigate('/themes');
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete theme');
    }
  };

  const handleDuplicate = async () => {
    if (!currentUser || !theme) return;

    const duplicatedTheme = {
      name: `${theme.name} (Copy)`,
      description: theme.description,
      privacy: theme.privacy,
      teamId: theme.teamId,
      contributors: [currentUser.uid],
      outputType: theme.outputType,
      problemStatement: theme.problemStatement,
      keyQuestions: theme.keyQuestions || [],
      linkedProjects: [],
      insightIds: []
    };

    const result = await createTheme(duplicatedTheme, currentUser.uid);
    if (result.success) {
      navigate(`/themes/${result.id}`);
    } else {
      alert(`Failed to duplicate: ${result.error}`);
    }
  };

  const handleAddQuestion = () => {
    if (newQuestion.trim()) {
      setEditData({
        ...editData,
        keyQuestions: [...(editData.keyQuestions || []), newQuestion.trim()]
      });
      setNewQuestion('');
    }
  };

  const handleRemoveQuestion = (index) => {
    setEditData({
      ...editData,
      keyQuestions: editData.keyQuestions.filter((_, i) => i !== index)
    });
  };

  return {
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
  };
};

