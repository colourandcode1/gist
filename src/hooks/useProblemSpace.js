import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getProblemSpaceById, 
  updateProblemSpace, 
  updateProblemSpacePrivacy,
  deleteProblemSpace,
  createActivity,
  createProblemSpace
} from '@/lib/firestoreUtils';
import { getProjects } from '@/lib/firestoreUtils';

export const useProblemSpace = (id, currentUser) => {
  const navigate = useNavigate();
  const [problemSpace, setProblemSpace] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [projects, setProjects] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadProblemSpace = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const space = await getProblemSpaceById(id);
      if (!space) {
        navigate('/problem-spaces');
        return;
      }

      setProblemSpace(space);
      setEditData({
        name: space.name || '',
        description: space.description || '',
        problemStatement: space.problemStatement || '',
        keyQuestions: space.keyQuestions || []
      });
    } catch (error) {
      console.error('Error loading problem space:', error);
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
      loadProblemSpace();
      loadProjects();
    }
  }, [id, currentUser]);

  const handleSave = async () => {
    if (!currentUser || !problemSpace) return;

    setIsSaving(true);
    try {
      const result = await updateProblemSpace(problemSpace.id, editData, currentUser.uid);
      if (result.success) {
        // Track activity
        await createActivity(
          {
            type: 'problem_space_updated',
            problemSpaceId: problemSpace.id,
            description: `${currentUser.email?.split('@')[0] || 'User'} updated the problem space`,
            metadata: {
              updatedFields: Object.keys(editData)
            }
          },
          currentUser.uid
        );

        await loadProblemSpace();
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
    if (!currentUser || !problemSpace) return;

    try {
      const result = await updateProblemSpacePrivacy(
        problemSpace.id, 
        privacy, 
        problemSpace.teamId, 
        currentUser.uid
      );
      if (result.success) {
        await loadProblemSpace();
      } else {
        alert(`Failed to update privacy: ${result.error}`);
      }
    } catch (error) {
      console.error('Error updating privacy:', error);
      alert('Failed to update privacy settings');
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !problemSpace) return;

    if (!window.confirm('Are you sure you want to delete this problem space? This action cannot be undone.')) {
      return;
    }

    try {
      const result = await deleteProblemSpace(problemSpace.id, currentUser.uid);
      if (result.success) {
        navigate('/problem-spaces');
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Failed to delete problem space');
    }
  };

  const handleDuplicate = async () => {
    if (!currentUser || !problemSpace) return;

    const duplicatedSpace = {
      name: `${problemSpace.name} (Copy)`,
      description: problemSpace.description,
      privacy: problemSpace.privacy,
      teamId: problemSpace.teamId,
      contributors: [currentUser.uid],
      outputType: problemSpace.outputType,
      problemStatement: problemSpace.problemStatement,
      keyQuestions: problemSpace.keyQuestions || [],
      linkedProjects: [],
      insightIds: []
    };

    const result = await createProblemSpace(duplicatedSpace, currentUser.uid);
    if (result.success) {
      navigate(`/problem-spaces/${result.id}`);
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
  };
};

