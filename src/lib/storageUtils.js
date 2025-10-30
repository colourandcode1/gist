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

export const updateNuggetCategoryTags = (sessionId, nuggetId, newCategory, newTags) => {
  try {
    const sessions = getSessions();
    let updated = false;

    const updatedSessions = sessions.map(session => {
      if (session.id !== sessionId) return session;

      const updatedNuggets = session.nuggets.map(nugget => {
        if (nugget.id !== nuggetId) return nugget;
        updated = true;
        return {
          ...nugget,
          category: newCategory ?? nugget.category,
          tags: Array.isArray(newTags) ? newTags : nugget.tags
        };
      });

      return { ...session, nuggets: updatedNuggets };
    });

    if (!updated) return false;

    localStorage.setItem('researchSessions', JSON.stringify(updatedSessions));
    return true;
  } catch (error) {
    console.error('Error updating nugget:', error);
    return false;
  }
};

export const updateNuggetFields = (sessionId, nuggetId, fields) => {
  try {
    const sessions = getSessions();
    let updated = false;

    const updatedSessions = sessions.map(session => {
      if (session.id !== sessionId) return session;

      const updatedNuggets = session.nuggets.map(nugget => {
        if (nugget.id !== nuggetId) return nugget;
        updated = true;
        return { ...nugget, ...fields };
      });

      return { ...session, nuggets: updatedNuggets };
    });

    if (!updated) return false;

    localStorage.setItem('researchSessions', JSON.stringify(updatedSessions));
    return true;
  } catch (error) {
    console.error('Error updating nugget fields:', error);
    return false;
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
