import { useState, useEffect } from 'react';
import { getSessions, getAllNuggets, getProjects } from '@/lib/firestoreUtils';

export const useRepositoryData = (currentUser) => {
  const [savedSessions, setSavedSessions] = useState([]);
  const [allNuggets, setAllNuggets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshData = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    try {
      const [sessions, nuggets, projectsData] = await Promise.all([
        getSessions(currentUser.uid),
        getAllNuggets(currentUser.uid),
        getProjects(currentUser.uid)
      ]);
      setSavedSessions(sessions || []);
      setAllNuggets(nuggets || []);
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error refreshing data:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      // Set empty arrays on error so the UI doesn't hang
      setSavedSessions([]);
      setAllNuggets([]);
      
      // Show user-friendly error if it's a permission issue
      if (error.code === 'permission-denied' || error.code === 7 || error.message?.includes('Permission denied')) {
        alert('❌ Firestore Permission Denied\n\nYour security rules are blocking read access.\n\nGo to Firebase Console → Firestore Database → Rules\n\nMake sure you have these rules:\n\nmatch /sessions/{sessionId} {\n  allow read: if request.auth != null && resource.data.userId == request.auth.uid;\n}\n\nSee FIRESTORE_RULES.md for complete rules.');
      } else if (error.code === 'failed-precondition') {
        console.warn('Firestore index may be missing. Check Firebase Console.');
      } else if (error.message?.includes('timeout')) {
        alert('⏱️ Request Timeout\n\nFirestore is taking too long to respond. This usually means:\n1. Security rules are blocking access\n2. Network connection issue\n\nCheck your Firestore security rules in Firebase Console.');
      } else {
        alert(`❌ Error loading data: ${error.message}\n\nCheck browser console for details.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load saved sessions from Firestore on component mount and when refreshKey changes
  useEffect(() => {
    refreshData();
  }, [currentUser, refreshKey]);

  // Refresh when component becomes visible (useful when navigating back from other views)
  useEffect(() => {
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Refresh data when component becomes visible (when navigating back from analysis)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentUser]);

  return {
    savedSessions,
    allNuggets,
    projects,
    isLoading,
    refreshData,
    setRefreshKey
  };
};

