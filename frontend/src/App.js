import React, { Suspense, lazy, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { auth, googleProvider } from "./firebase_config";
import "./App.css";
import "./index.css";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

const HistoryPage = lazy(() => import("./pages/HistoryPage"));

const MindmapPage = lazy(() => import("./pages/MindmapPage"));
const FlowchartPage = lazy(() => import("./pages/FlowchartPage"));

function App() {
  return (
    <Router>
      <Suspense fallback={<div className="loading"><div className="spinner"></div></div>}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/main" element={<MainPage />} />
          <Route path="/mindmap" element={<MindmapPage />} />
          <Route path="/flowchart" element={<FlowchartPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

function DebugOverlay({ authState, loading, error }) {
  return (
    <div style={{position: 'fixed', right: 10, bottom: 10, zIndex: 9999, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: 8, borderRadius: 8, fontSize: 12}}>
      <div><strong>Debug</strong></div>
      <div>loading: {String(loading)}</div>
      <div>user: {authState ? (authState.displayName || authState.uid || 'signed-in') : 'null'}</div>
      {error && <div style={{color: '#ffcccb'}}>error: {String(error)}</div>}
    </div>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState(null);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(null);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.log('Auth state changed:', currentUser ? 'logged in' : 'logged out');
        setAuthState(currentUser);
        setLoading(false);
        if (currentUser) navigate("/main");
      }, (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Firebase setup error:', err);
      setError('Firebase authentication failed to initialize');
      setLoading(false);
    }
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      await setPersistence(auth, browserLocalPersistence);
      const result = await signInWithPopup(auth, googleProvider);

      setAuthState(result.user);

      navigate("/main");
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
      alert(error.message);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="landing-page">
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-text">Text2Visuals</span>
          </div>
          <div className="nav-links">
            <a href="#home" onClick={() => scrollToSection('home')}>Home</a>
            <a href="#features" onClick={() => scrollToSection('features')}>Features</a>
            <a href="#how-it-works" onClick={() => scrollToSection('how-it-works')}>How It Works</a>
          </div>
          <button onClick={handleGoogleLogin} disabled={loading} className="nav-signin-btn">
            <svg className="google-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </nav>

      <section id="home" className="hero-section">
        <div className="hero-container">
          <div className="hero-content">
            <h1 className="hero-title">Transform Text into Stunning Visuals</h1>
            <p className="hero-subtitle">
              Text2Visuals leverages advanced NLP and visualization techniques to convert your raw text into 
              insightful mindmaps and clear flowcharts effortlessly. Streamline your ideas and presentations.
            </p>
            
            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            )}
            
            <button onClick={handleGoogleLogin} disabled={loading} className="hero-cta-btn">
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </div>
          <div className="hero-visual">
            <div className="mindmap-illustration">
              <div className="central-node">Ideas</div>
              <div className="node node-1">Research</div>
              <div className="node node-2">Planning</div>
              <div className="node node-3">Design</div>
              <div className="node node-4">Execute</div>
              <div className="connection con-1"></div>
              <div className="connection con-2"></div>
              <div className="connection con-3"></div>
              <div className="connection con-4"></div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="features-section">
        <div className="container">
          <div className="feature-item">
            <div className="feature-content">
              <h3>Generate Dynamic Mindmaps</h3>
              <p>
                Our Mindmap Generator intelligently analyzes your text, identifying key concepts and relationships 
                to build intuitive visual maps.
              </p>
            </div>
            <div className="feature-image">
                <div className="mindmap-preview">
                  <div className="preview-node main">Main Topic</div>
                  <div className="preview-node sub sub1">Subtopic A</div>
                  <div className="preview-node sub sub2">Subtopic B</div>
                  <div className="preview-node sub sub3">Subtopic C</div>
                  <div className="preview-node sub sub4">Subtopic D</div>

                  <svg className="mindmap-lines" width="300" height="200">
                    <line x1="150" y1="100" x2="150" y2="35" stroke="#007BFF" strokeWidth="2" />
                    <line x1="150" y1="100" x2="265" y2="100" stroke="#007BFF" strokeWidth="2" />
                    <line x1="150" y1="100" x2="150" y2="165" stroke="#007BFF" strokeWidth="2" />
                    <line x1="150" y1="100" x2="35" y2="100" stroke="#007BFF" strokeWidth="2" />
                  </svg>
                </div>
            </div>
          </div>  
          <div className="feature-item reverse">
            <div className="feature-image">
              <div className="flowchart-preview">
                <div className="flow-box start">Start</div>
                <div className="flow-box process">Process</div>
                <div className="flow-box decision">Decision?</div>
                <div className="flow-box end">End</div>
                <div className="flow-arrow arrow1"></div>
                <div className="flow-arrow arrow2"></div>
                <div className="flow-arrow arrow3"></div>
              </div>
            </div>
            <div className="feature-content">
              <h3>Create Clear Flowcharts</h3>
              <p>
                Transform procedural descriptions into clear, actionable flowcharts. Our tool helps visualize 
                processes, decision paths, and workflows easily.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="how-it-works-section">
        <div className="container">
          <h2>How Text2Visuals Works</h2>
          <div className="steps-container">
            <div className="step-card" onClick={() => setActiveStep(activeStep === 1 ? null : 1)}>
              <div className="step-header">
                <div className="step-number">1</div>
                <h3>Input Your Text</h3>
                <div className={`step-toggle ${activeStep === 1 ? 'active' : ''}`}>+</div>
              </div>
              {activeStep === 1 && (
                <div className="step-content">
                  <p>Simply paste or type your text into our intelligent input field. Whether it's notes, ideas, or processes, we'll handle it.</p>
                </div>
              )}
            </div>

            <div className="step-card" onClick={() => setActiveStep(activeStep === 2 ? null : 2)}>
              <div className="step-header">
                <div className="step-number">2</div>
                <h3>NLP Analysis</h3>
                <div className={`step-toggle ${activeStep === 2 ? 'active' : ''}`}>+</div>
              </div>
              {activeStep === 2 && (
                <div className="step-content">
                  <p>Our advanced Natural Language Processing engine analyzes your text to identify key concepts, relationships, and hierarchies.</p>
                </div>
              )}
            </div>

            <div className="step-card" onClick={() => setActiveStep(activeStep === 3 ? null : 3)}>
              <div className="step-header">
                <div className="step-number">3</div>
                <h3>Visual Generation</h3>
                <div className={`step-toggle ${activeStep === 3 ? 'active' : ''}`}>+</div>
              </div>
              {activeStep === 3 && (
                <div className="step-content">
                  <p>Watch as your text transforms into beautiful, interactive mindmaps or flowcharts with optimized layouts and styling.</p>
                </div>
              )}
            </div>

            <div className="step-card" onClick={() => setActiveStep(activeStep === 4 ? null : 4)}>
              <div className="step-header">
                <div className="step-number">4</div>
                <h3>Download Images</h3>
                <div className={`step-toggle ${activeStep === 4 ? 'active' : ''}`}>+</div>
              </div>
              {activeStep === 4 && (
                <div className="step-content">
                  <p>Export your visuals in high-quality formats and use them in your presentations.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>


      <footer className="footer">
        <div className="container">
          <div className="footer-bottom">
            <p>&copy; 2025 Text2Visuals. Powered by AI.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function MainPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.log('Main page auth check:', currentUser ? 'user found' : 'no user');
        setUser(currentUser);
        setLoading(false);
        if (!currentUser) navigate("/");
      }, (error) => {
        console.error('Main page auth error:', error);
        setError(error.message);
        setLoading(false);
        navigate("/");
      });
      return () => unsubscribe();
    } catch (err) {
      console.error('Main page setup error:', err);
      setError('Authentication check failed');
      setLoading(false);
      navigate("/");
    }
  }, [navigate]);

  useEffect(() => {
    const loadHistory = () => {
      try {
        const { getHistory } = require('./utils/historyUtils');
        const saved = getHistory(user?.uid, user?.email);
        setHistory(saved.slice(-6));
      } catch (err) {
        console.error('Error loading history:', err);
      }
    };

    if (user) {
      loadHistory();
      const handleStorageChange = () => loadHistory();
      window.addEventListener('storage', handleStorageChange);
      window.addEventListener('historyUpdate', handleStorageChange);
      
      return () => {
        window.removeEventListener('storage', handleStorageChange);
        window.removeEventListener('historyUpdate', handleStorageChange);
      };
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowLogoutModal(false);
      navigate("/");
    } catch (error) {
      console.error('Logout error:', error);
      setError(error.message);
    }
  };

  const handleHistoryClick = (item) => {
    navigate('/history', { state: { historyItem: item } });
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  if (!user) {
    return (
      <div className="App">
        <h1>Redirecting to login...</h1>
      </div>
    );
  }

  return (
    <div className="main-page">
      <DebugOverlay authState={user} loading={loading} error={error} />
      
      <div className="main-header">
        <div className="user-welcome">
          <div className="user-avatar">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder">{user?.displayName?.charAt(0) || 'U'}</div>
            )}
          </div>
          <div className="welcome-text">
            <h1>Welcome back, {user?.displayName?.split(' ')[0] || 'User'}!</h1>
            <p>What would you like to create today?</p>
          </div>
        </div>
        
        <button onClick={() => setShowLogoutModal(true)} className="logout-btn">
          <span>Logout</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16,17 21,12 16,7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
      
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      
      <div className="generators-section">
        <h2>Choose Your Generator</h2>
        <div className="generator-cards">
          <div className="generator-card" onClick={() => navigate("/mindmap")}>
            <div className="card-icon">🧠</div>
            <h3>Mindmap Generator</h3>
            <p>Transform your ideas into interconnected visual mindmaps</p>
            <div className="card-features">
              <span>• Hierarchical structure</span>
              <span>• Color-coded nodes</span>
              <span>• Interactive layout</span>
            </div>
            <button className="card-button">
              Create Mindmap
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14m-7-7 7 7-7 7"/>
              </svg>
            </button>
          </div>
          
          <div className="generator-card" onClick={() => navigate("/flowchart")}>
            <div className="card-icon">📊</div>
            <h3>Flowchart Generator</h3>
            <p>Create process flows and decision trees from your text</p>
            <div className="card-features">
              <span>• Step-by-step process</span>
              <span>• Decision points</span>
              <span>• Clear workflow</span>
            </div>
            <button className="card-button">
              Create Flowchart
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M5 12h14m-7-7 7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div className="history-section">
        <div className="history-header">
          <h2>Recent Creations</h2>
          {history.length > 0 && (
            <button onClick={() => navigate('/history')} className="view-all-btn">
              View All
            </button>
          )}
        </div>
        
        {history.length === 0 ? (
          <div className="empty-history">
            <div className="empty-icon">📝</div>
            <p>No creations yet. Start by generating your first mindmap or flowchart!</p>
          </div>
        ) : (
          <div className="history-grid">
            {history.map((item, index) => (
              <div key={index} className="history-item" onClick={() => handleHistoryClick(item)}>
                <div className="history-preview">
                  {item.image ? (
                    <img src={item.image} alt="Generated visual" className="preview-image" />
                  ) : (
                    <div className="preview-placeholder">
                      <span>{item.type === 'mindmap' ? '🧠' : '📊'}</span>
                    </div>
                  )}
                </div>
                <div className="history-info">
                  <h4>{item.type === 'mindmap' ? 'Mindmap' : 'Flowchart'}</h4>
                  <p className="history-prompt">{item.prompt.length > 50 ? item.prompt.substring(0, 50) + '...' : item.prompt}</p>
                  <span className="history-date">{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showLogoutModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Sign Out</h3>
            <p>Are you sure you want to sign out of your account?</p>
            <div className="modal-buttons">
              <button onClick={handleLogout} className="confirm-btn">Sign Out</button>
              <button onClick={() => setShowLogoutModal(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;