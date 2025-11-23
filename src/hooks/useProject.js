import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getProjectById, 
  updateProject, 
  deleteProject,
  getSessionsByProject, 
  getAllNuggets,
  getProblemSpaces
} from '@/lib/firestoreUtils';

export const useProject = (id, currentUser) => {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [nuggets, setNuggets] = useState([]);
  const [problemSpaces, setProblemSpaces] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjectData = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const projectData = await getProjectById(id);
      if (!projectData) {
        navigate('/projects');
        return;
      }

      setProject(projectData);

      // Load related data
      const [sessionsData, nuggetsData, allProblemSpaces] = await Promise.all([
        getSessionsByProject(id, currentUser.uid),
        getAllNuggets(currentUser.uid, null, id),
        getProblemSpaces(currentUser.uid)
      ]);

      setSessions(sessionsData);
      setNuggets(nuggetsData);

      // Filter problem spaces that use insights from this project
      const relevantProblemSpaces = allProblemSpaces.filter(ps => {
        // Check if any insight IDs match nuggets from this project
        const projectInsightIds = nuggetsData.map(n => `${n.session_id}:${n.id}`);
        return ps.insightIds?.some(insightId => projectInsightIds.includes(insightId));
      });

      setProblemSpaces(relevantProblemSpaces);
    } catch (error) {
      console.error('Error loading project data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id && currentUser) {
      loadProjectData();
    }
  }, [id, currentUser]);

  const handleArchive = async () => {
    if (!currentUser || !project) return;

    const newStatus = project.status === 'archived' ? 'active' : 'archived';
    const result = await updateProject(project.id, { status: newStatus }, currentUser.uid);
    if (result.success) {
      loadProjectData();
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !project) return;

    const confirmed = window.confirm('Are you sure you want to delete this project? Sessions and insights will not be deleted, but they will be unassigned from the project.');
    if (!confirmed) return;

    const result = await deleteProject(project.id, currentUser.uid);
    if (result.success) {
      navigate('/projects');
    }
  };

  return {
    project,
    sessions,
    nuggets,
    problemSpaces,
    isLoading,
    loadProjectData,
    handleArchive,
    handleDelete
  };
};

