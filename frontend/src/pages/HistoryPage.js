import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase_config";
import { onAuthStateChanged } from "firebase/auth";
import { getHistory, clearHistory, deleteHistoryItem } from "../utils/historyUtils";

function HistoryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [selectedItem, setSelectedItem] = useState(location.state?.historyItem || null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) navigate("/");
    });
    return () => unsubscribe();
  }, [navigate]);

  const loadHistory = useCallback(() => {
    try {
      const historyData = getHistory(user?.uid, user?.email);
      setHistory(historyData.reverse());
    } catch (err) {
      console.error('Error loading history:', err);
    }
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user, loadHistory]);

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      clearHistory(user?.uid, user?.email);
      setHistory([]);
      setSelectedItem(null);
    }
  };

  const deleteItem = (item) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteHistoryItem(user?.uid, item.id, user?.email);
      const newHistory = history.filter(h => h.id !== item.id);
      setHistory(newHistory);
      if (selectedItem && selectedItem.id === item.id) {
        setSelectedItem(null);
      }
    }
  };

  const downloadImage = (item) => {
    if (item.image) {
      const link = document.createElement('a');
      link.download = `${item.type}_${new Date(item.createdAt).toISOString().split('T')[0]}.png`;
      link.href = item.image;
      link.click();
    }
  };

  const filteredHistory = history.filter(item => 
    filter === 'all' || item.type === filter
  );

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="history-page">
      <div className="history-header">
        <button onClick={() => navigate('/main')} className="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5m7-7-7 7 7 7"/>
          </svg>
          Back to Dashboard
        </button>
        <h1>Creation History</h1>
        {history.length > 0 && (
          <button onClick={handleClearHistory} className="clear-btn">
            Clear All
          </button>
        )}
      </div>

      <div className="history-content">
        <div className="history-sidebar">
          <div className="filter-section">
            <h3>Filter by Type</h3>
            <div className="filter-buttons">
              <button 
                className={filter === 'all' ? 'active' : ''} 
                onClick={() => setFilter('all')}
              >
                All ({history.length})
              </button>
              <button 
                className={filter === 'mindmap' ? 'active' : ''} 
                onClick={() => setFilter('mindmap')}
              >
                Mindmaps ({history.filter(h => h.type === 'mindmap').length})
              </button>
              <button 
                className={filter === 'flowchart' ? 'active' : ''} 
                onClick={() => setFilter('flowchart')}
              >
                Flowcharts ({history.filter(h => h.type === 'flowchart').length})
              </button>
            </div>
          </div>

          <div className="history-list">
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <p>No {filter === 'all' ? '' : filter} items found</p>
              </div>
            ) : (
              filteredHistory.map((item, index) => (
                <div 
                  key={item.id} 
                  className={`history-list-item ${selectedItem?.id === item.id ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="item-preview">
                    {item.image ? (
                      <img src={item.image} alt="Preview" />
                    ) : (
                      <div className="preview-placeholder">
                        {item.type === 'mindmap' ? '🧠' : '📊'}
                      </div>
                    )}
                  </div>
                  <div className="item-info">
                    <div className="item-type">
                      {item.type === 'mindmap' ? 'Mindmap' : 'Flowchart'}
                    </div>
                    <div className="item-prompt">
                      {item.prompt.length > 40 ? item.prompt.substring(0, 40) + '...' : item.prompt}
                    </div>
                    <div className="item-date">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item);
                    }}
                    className="delete-btn"
                    title="Delete item"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <line x1="10" y1="11" x2="10" y2="17"/>
                      <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="history-detail">
          {selectedItem ? (
            <div className="detail-content">
              <div className="detail-header">
                <h2>{selectedItem.type === 'mindmap' ? 'Mindmap' : 'Flowchart'}</h2>
                <div className="detail-actions">
                  <button 
                    onClick={() => downloadImage(selectedItem)}
                    className="download-btn"
                    disabled={!selectedItem.image}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7,10 12,15 17,10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download
                  </button>
                  <button 
                    onClick={() => navigate(`/${selectedItem.type}`, { state: { prompt: selectedItem.prompt } })}
                    className="recreate-btn"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="1,4 1,10 7,10"/>
                      <polyline points="23,20 23,14 17,14"/>
                      <path d="M20.49,9A9,9,0,0,0,5.64,5.64L1,10m22,4-4.64,4.36A9,9,0,0,1,3.51,15"/>
                    </svg>
                    Recreate
                  </button>
                </div>
              </div>

              <div className="detail-info">
                <div className="info-item">
                  <label>Type:</label>
                  <span className="type-badge">
                    {selectedItem.type === 'mindmap' ? 'Mindmap' : 'Flowchart'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Created:</label>
                  <span>{new Date(selectedItem.createdAt).toLocaleString()}</span>
                </div>
              </div>

              <div className="detail-prompt">
                <h3>Original Prompt</h3>
                <div className="prompt-text">{selectedItem.prompt}</div>
              </div>

              <div className="detail-image">
                <h3>Generated Visual</h3>
                <div className="image-container">
                  {selectedItem.image ? (
                    <img src={selectedItem.image} alt="Generated visual" />
                  ) : (
                    <div className="no-image">
                      <p>No image available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="detail-placeholder">
              <div className="placeholder-icon">📋</div>
              <h3>Select an item to view details</h3>
              <p>Choose any mindmap or flowchart from the list to see its details and options.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HistoryPage;