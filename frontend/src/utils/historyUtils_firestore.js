import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  limit 
} from 'firebase/firestore';
import { db } from '../firebase_config';

const COLLECTION_NAME = 'userHistory';

export const saveToHistory = async (userId, type, prompt, imageData, userEmail = null) => {
  const historyItem = {
    id: Date.now().toString(),
    type,
    prompt,
    image: imageData,
    createdAt: new Date().toISOString(),
    userId: userId,
    userEmail: userEmail
  };

  try {
    await addDoc(collection(db, COLLECTION_NAME), historyItem);
    
    const localKey = userEmail ? `history_${userEmail}` : `history_${userId}`;
    const existingHistory = JSON.parse(localStorage.getItem(localKey) || '[]');
    existingHistory.push(historyItem);
    
    if (existingHistory.length > 50) {
      existingHistory.splice(0, existingHistory.length - 50);
    }
    
    localStorage.setItem(localKey, JSON.stringify(existingHistory));
    window.dispatchEvent(new CustomEvent('historyUpdate'));
    
    return historyItem;
  } catch (error) {
    console.error('Error saving to Firestore, saving locally only:', error);
    const localKey = userEmail ? `history_${userEmail}` : `history_${userId}`;
    const existingHistory = JSON.parse(localStorage.getItem(localKey) || '[]');
    existingHistory.push(historyItem);
    localStorage.setItem(localKey, JSON.stringify(existingHistory));
    return historyItem;
  }
};

export const getHistory = async (userId, userEmail = null) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where(userEmail ? 'userEmail' : 'userId', '==', userEmail || userId),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    
    const querySnapshot = await getDocs(q);
    const firestoreHistory = [];
    querySnapshot.forEach((doc) => {
      firestoreHistory.push({ ...doc.data(), firestoreId: doc.id });
    });
    
    if (firestoreHistory.length > 0) {
      return firestoreHistory;
    }
  } catch (error) {
    console.error('Error fetching from Firestore, using localStorage:', error);
  }
  
  const localKey = userEmail ? `history_${userEmail}` : `history_${userId}`;
  return JSON.parse(localStorage.getItem(localKey) || '[]');
};

export const clearHistory = async (userId, userEmail = null) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where(userEmail ? 'userEmail' : 'userId', '==', userEmail || userId)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = [];
    querySnapshot.forEach((docSnapshot) => {
      deletePromises.push(deleteDoc(doc(db, COLLECTION_NAME, docSnapshot.id)));
    });
    
    await Promise.all(deletePromises);
  } catch (error) {
    console.error('Error clearing Firestore history:', error);
  }
  
  const localKey = userEmail ? `history_${userEmail}` : `history_${userId}`;
  localStorage.removeItem(localKey);
  window.dispatchEvent(new CustomEvent('historyUpdate'));
  
  return true;
};

export const deleteHistoryItem = async (userId, itemId, userEmail = null) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('id', '==', itemId),
      where(userEmail ? 'userEmail' : 'userId', '==', userEmail || userId)
    );
    
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (docSnapshot) => {
      await deleteDoc(doc(db, COLLECTION_NAME, docSnapshot.id));
    });
  } catch (error) {
    console.error('Error deleting from Firestore:', error);
  }
  
  const localKey = userEmail ? `history_${userEmail}` : `history_${userId}`;
  const existingHistory = JSON.parse(localStorage.getItem(localKey) || '[]');
  const updatedHistory = existingHistory.filter(item => item.id !== itemId);
  localStorage.setItem(localKey, JSON.stringify(updatedHistory));
  window.dispatchEvent(new CustomEvent('historyUpdate'));
  
  return true;
};