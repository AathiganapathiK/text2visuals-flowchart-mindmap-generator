const getUserKey = (userId, userEmail) => {
  return userEmail ? `history_${userEmail}` : `history_${userId}`;
};

export const saveToHistory = (userId, type, prompt, imageData, userEmail = null) => {
  try {
    const historyKey = getUserKey(userId, userEmail);
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    const newItem = {
      id: Date.now().toString(),
      type,
      prompt,
      image: imageData,
      createdAt: new Date().toISOString(),
      userId: userId,
      userEmail: userEmail
    };
    
    existingHistory.push(newItem);
    
    if (existingHistory.length > 50) {
      existingHistory.splice(0, existingHistory.length - 50);
    }
    
    localStorage.setItem(historyKey, JSON.stringify(existingHistory));
    
    if (userEmail && userId) {
      const oldKey = `history_${userId}`;
      const oldHistory = JSON.parse(localStorage.getItem(oldKey) || '[]');
      if (oldHistory.length > 0) {
        const combinedHistory = [...oldHistory, ...existingHistory];
        const uniqueHistory = combinedHistory.filter((item, index, self) => 
          index === self.findIndex(h => h.id === item.id)
        );
        localStorage.setItem(historyKey, JSON.stringify(uniqueHistory.slice(-50)));
        localStorage.removeItem(oldKey);
      }
    }
    
    window.dispatchEvent(new CustomEvent('historyUpdate'));
    
    return newItem;
  } catch (error) {
    console.error('Error saving to history:', error);
    return null;
  }
};

export const getHistory = (userId, userEmail = null) => {
  try {
    const historyKey = getUserKey(userId, userEmail);
    let history = JSON.parse(localStorage.getItem(historyKey) || '[]');
    
    if (history.length === 0 && userEmail && userId) {
      const oldKey = `history_${userId}`;
      const oldHistory = JSON.parse(localStorage.getItem(oldKey) || '[]');
      if (oldHistory.length > 0) {
        localStorage.setItem(historyKey, JSON.stringify(oldHistory));
        localStorage.removeItem(oldKey);
        history = oldHistory;
      }
    }
    
    return history;
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};

export const clearHistory = (userId, userEmail = null) => {
  try {
    const historyKey = getUserKey(userId, userEmail);
    localStorage.removeItem(historyKey);
    
    if (userId) {
      localStorage.removeItem(`history_${userId}`);
    }
    
    window.dispatchEvent(new CustomEvent('historyUpdate'));
    return true;
  } catch (error) {
    console.error('Error clearing history:', error);
    return false;
  }
};

export const deleteHistoryItem = (userId, itemId, userEmail = null) => {
  try {
    const historyKey = getUserKey(userId, userEmail);
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const updatedHistory = existingHistory.filter(item => item.id !== itemId);
    
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    window.dispatchEvent(new CustomEvent('historyUpdate'));
    
    return true;
  } catch (error) {
    console.error('Error deleting history item:', error);
    return false;
  }
};