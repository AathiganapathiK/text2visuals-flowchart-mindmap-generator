import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase_config";
import { onAuthStateChanged } from "firebase/auth";
import { saveToHistory } from "../utils/historyUtils";
import html2canvas from "html2canvas";

function FlowchartPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [problemStatement, setProblemStatement] = useState(location.state?.prompt || "");
  const [skillLevel, setSkillLevel] = useState("intermediate");
  const [flowData, setFlowData] = useState(null);
  const [user, setUser] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const containerRef = useRef(null);
  const stagesRef = useRef(null);

  const colors = ["#ff8a65", "#4db6ac", "#efb84b", "#ab47bc"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) navigate("/");
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleGenerateFlowchart = async () => {
    if (!problemStatement.trim() || !user) {
      alert("Please enter a problem statement!");
      return;
    }

    setIsGenerating(true);

    try {
      const res = await fetch("http://localhost:5000/flowchart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          problem: problemStatement,
          skillLevel: skillLevel
        }),
      });

      const data = await res.json();
      if (!data || !data.nodes || data.nodes.length === 0) {
        alert("No flowchart generated!");
        setIsGenerating(false);
        return;
      }

      const root = buildTreeFromNodesEdges(data.nodes, data.edges);
      setFlowData({ raw: data, root });
      
      setTimeout(() => {
        const captureAndSave = async () => {
          try {
            const canvas = await html2canvas(containerRef.current, { scale: 2 });
            const imageData = canvas.toDataURL("image/png");
            saveToHistory(user.uid, 'flowchart', problemStatement, imageData, user.email);
          } catch (error) {
            console.error('Error capturing flowchart for history:', error);
          }
        };
        captureAndSave();
      }, 1000);
      
    } catch (err) {
      console.error("Error:", err);
      alert("Error generating flowchart.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async () => {
    const el = containerRef.current;
    if (!el) return;

    const originalWidth = el.style.width;
    const originalOverflow = el.style.overflowX;
    const originalBg = el.style.background;

    const stages = el.querySelectorAll(".stage-wrapper");
    let totalWidth = 0;
    stages.forEach((s) => {
      totalWidth += s.offsetWidth + 30;
    });
    totalWidth += 40;

    el.style.width = `${totalWidth}px`;
    el.style.overflowX = "visible";
    el.style.background = "#ffffffff";

    const canvas = await html2canvas(el, { scale: 2 });

    el.style.width = originalWidth;
    el.style.overflowX = originalOverflow;
    el.style.background = originalBg;

    const link = document.createElement("a");
    link.download = "flowchart.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const buildTreeFromNodesEdges = (nodes, edges) => {
    const map = {};
    nodes.forEach((n) => {
      map[n.id] = { id: n.id, label: n.label, depth: n.depth || 0, children: [], timeEstimate: n.timeEstimate || null };
    });

    const incoming = {};
    nodes.forEach((n) => (incoming[n.id] = 0));

    (edges || []).forEach((e) => {
      if (map[e.from] && map[e.to]) {
        map[e.from].children.push(map[e.to]);
        incoming[e.to] = (incoming[e.to] || 0) + 1;
      }
    });

    let rootId = null;
    for (const n of nodes) {
      if (!incoming[n.id] || incoming[n.id] === 0) {
        rootId = n.id;
        break;
      }
    }
    if (rootId === null && nodes.length > 0) rootId = nodes[0].id;
    return map[rootId] || null;
  };

  // ✅ Remove timeEstimate display from nested (child) nodes
  const renderNested = (node, level = 0) => {
    if (!node || !node.children || node.children.length === 0) return null;

    const levelColors = ["#ffffffff", "#ffffffff", "#ffffffff", "#ffffffff"];

    return (
      <ul style={{ listStyle: "none", paddingLeft: level === 0 ? 0 : 14, marginTop: 8 }}>
        {node.children.map((child) => (
          <li key={child.id} style={{ marginBottom: 8, position: "relative" }}>
            <div
              style={{
                fontSize: level === 0 ? 14 : 13,
                fontWeight: level === 0 ? 600 : 500,
                padding: "6px 8px",
                background: levelColors[level % levelColors.length],
                borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.08)",
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                color: "#333",
                textAlign: "left",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/^label\d*$/i.test(child.label) ? `Substep ${child.id}` : child.label}
              {/* ✅ Removed time display here */}
            </div>
            {child.children && child.children.length > 0 && (
              <div style={{ marginLeft: 10, marginTop: 8 }}>{renderNested(child, level + 1)}</div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="generator-page">
      <div className="generator-header">
        <button onClick={() => navigate('/main')} className="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M19 12H5m7-7-7 7 7 7"/>
          </svg>
          Back to Dashboard
        </button>
        <h1> Flowchart Generator</h1>
      </div>
      
      <div className="input-section">
        <div className="input-container">
          <label htmlFor="flowchart-input">Enter your problem statement to generate a flowchart:</label>
          <textarea
            id="flowchart-input"
            rows={6}
            value={problemStatement}
            onChange={(e) => setProblemStatement(e.target.value)}
            placeholder="Enter problem statement... For example: 'How to implement user authentication system'"
            disabled={isGenerating}
          />
          
          <div className="skill-level-selector" style={{ marginTop: "15px" }}>
            <label htmlFor="skill-level">Select your skill level:</label>
            <select
              id="skill-level"
              value={skillLevel}
              onChange={(e) => setSkillLevel(e.target.value)}
              disabled={isGenerating}
              style={{
                marginLeft: "10px",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "14px",
                backgroundColor: "#fff"
              }}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </div>
          
          <div className="action-buttons">
            <button
              onClick={handleGenerateFlowchart}
              disabled={!problemStatement.trim() || isGenerating}
              className="generate-btn"
            >
              {isGenerating ? (
                <>
                  <div className="mini-spinner"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
                  </svg>
                  Generate Flowchart
                </>
              )}
            </button>
            
            <button
              onClick={handleExport}
              disabled={!flowData}
              className="export-btn"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7,10 12,15 17,10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download PNG
            </button>
          </div>
        </div>
      </div>
      
      <div className="visualization-section">
        <div className="viz-header">
          <h3>Generated Flowchart</h3>
          <div className="viz-controls">
            <span className="instruction">💡 Scroll horizontally to view the complete flowchart</span>
          </div>
        </div>
        {flowData && flowData.root ? (
          <div
            id="flowchart-container"
            ref={containerRef}
            className="flowchart-container"
            style={{ position: "relative", paddingTop: 20 }}
          >
            <div
              style={{
                textAlign: "center",
                marginBottom: 0,
                position: "relative",
                zIndex: 3,
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  background: "#111",
                  color: "#fff",
                  padding: "10px 18px",
                  borderRadius: 22,
                  fontWeight: 700,
                  boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
                }}
              >
                {/label\d*/i.test(flowData.root.label)
                  ? problemStatement
                  : flowData.root.label}
                {/* ✅ Removed root node time display */}
              </div>
            </div>

            <div
              className="stages-container"
              ref={stagesRef}
              style={{
                display: "flex",
                justifyContent: "space-around",
                alignItems: "flex-start",
                gap: 20,
                position: "relative",
                zIndex: 2,
                flexWrap: "wrap",
                marginTop: 40,
              }}
            >
              {flowData.root.children && flowData.root.children.length > 0 ? (
                flowData.root.children.map((stage, idx) => (
                  <div
                    key={stage.id || idx}
                    className="stage-wrapper"
                    style={{
                      position: "relative",
                      textAlign: "center",
                      minWidth: 160,
                      maxWidth: 220,
                    }}
                  >
                    <div
                      className="stage-header"
                      style={{
                        position: "relative",
                        zIndex: 2,
                        background: colors[idx % colors.length],
                        color: "#fff",
                        padding: "8px 14px",
                        borderRadius: 18,
                        fontWeight: 600,
                        boxShadow: "0 3px 8px rgba(0,0,0,0.12)",
                        marginBottom: 6,
                        fontSize: 15,
                      }}
                    >
                      {/label\d*/i.test(stage.label)
                        ? `Stage ${idx + 1}`
                        : stage.label}
                      {/* ✅ Keep time display only here */}
                      {stage.timeEstimate && (
                        <span style={{ 
                          display: "block", 
                          fontSize: "11px", 
                          marginTop: "3px", 
                          background: "rgba(255,255,255,0.2)", 
                          padding: "2px 6px", 
                          borderRadius: "12px"
                        }}>
                          ~{stage.timeEstimate} min
                        </span>
                      )}
                    </div>

                    <div
                      className="stage-content"
                      style={{
                        background: "#f9f9f9",
                        border: "1px solid #eee",
                        borderRadius: 12,
                        padding: 8,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                      }}
                    >
                      {stage.children && stage.children.length > 0 ? (
                        renderNested(stage)
                      ) : (
                        <div className="stage-item" style={{ padding: 4 }}>
                          {/label\d*/i.test(stage.label)
                            ? `Stage ${idx + 1}`
                            : stage.label}
                          {/* ✅ Keep time display only here */}
                          {stage.timeEstimate && (
                            <span style={{ 
                              display: "block", 
                              marginTop: "5px", 
                              fontSize: "11px", 
                              background: "#e3f2fd", 
                              padding: "2px 6px", 
                              borderRadius: "12px", 
                              color: "#1976d2"
                            }}>
                              ~{stage.timeEstimate} min
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-stages">No stages found</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flowchart-placeholder">
            <div className="placeholder-icon">📊</div>
            <p>Generate a flowchart to see it here</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default FlowchartPage;
