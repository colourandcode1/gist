// Utility functions for localStorage operations

export const saveSession = (sessionData) => {
  try {
    const existingSessions = JSON.parse(localStorage.getItem('researchSessions') || '[]');
    existingSessions.push(sessionData);
    localStorage.setItem('researchSessions', JSON.stringify(existingSessions));
    return true;
  } catch (error) {
    console.error('Error saving session:', error);
    return false;
  }
};

export const getSessions = () => {
  try {
    return JSON.parse(localStorage.getItem('researchSessions') || '[]');
  } catch (error) {
    console.error('Error loading sessions:', error);
    return [];
  }
};

export const getAllNuggets = () => {
  try {
    const sessions = getSessions();
    return sessions.flatMap(session => 
      session.nuggets.map(nugget => ({
        ...nugget,
        session_title: session.title,
        session_date: session.session_date,
        session_id: session.id
      }))
    );
  } catch (error) {
    console.error('Error loading nuggets:', error);
    return [];
  }
};

export const clearAllData = () => {
  try {
    localStorage.removeItem('researchSessions');
    return true;
  } catch (error) {
    console.error('Error clearing data:', error);
    return false;
  }
};
