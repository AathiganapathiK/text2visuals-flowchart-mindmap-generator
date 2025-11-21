import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase_config";
import { onAuthStateChanged } from "firebase/auth";
import { saveToHistory } from "../utils/historyUtils";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
cytoscape.use(coseBilkent);

function MindmapPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [textInput, setTextInput] = useState(location.state?.prompt || "");
  const [user, setUser] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const cyRef = useRef(null);

  const mainColor = "#ff8a65";
  const subColor = "#4db6ac";
  const textColor = "#000000ff";
  const contentColor = "#aed581";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) navigate("/");
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!cyRef.current) {
      cyRef.current = cytoscape({
        container: document.getElementById("cy"),
        elements: [],
        style: [
          {
            selector: "node",
            style: {
              label: "data(label)",
              "text-valign": "center",
              "text-halign": "center",
              "font-family": "Calibri, sans-serif",
              "font-weight": "600",
              color: textColor,
              "text-outline-color": "transparent",
              "padding": "20px",
              "background-color": (ele) => {
                if (ele.data("type") === "main") return mainColor;
                if (ele.data("type") === "sub") return subColor;
                return contentColor;
              },
              "shape": (ele) => {
                if (ele.data("type") === "main") return "ellipse";
                return "round-rectangle";
              },
              "width": "label",
              "height": "label",
              "min-width": (ele) => ele.data("type") === "sub" ? 180 : 140,
              "min-height": (ele) => ele.data("type") === "sub" ? 90 : 70,
              "font-size": (ele) => ele.data("type") === "main" ? "20px" : ele.data("type") === "sub" ? "18px" : "16px",
              "box-shadow": "0px 4px 15px rgba(0,0,0,0.2)",
              "transition-property": "box-shadow, transform",
              "transition-duration": "0.2s",
            },
          },
          {
            selector: "edge",
            style: {
              width: 1.5,
              "line-color": "#40464aff",
              "target-arrow-color": "#40464aff",
              "target-arrow-shape": "triangle",
              "curve-style": "bezier",
              "arrow-scale": 1,
            },
          },
        ],
        layout: {
          name: "cose-bilkent",
          animate: true,
          animationDuration: 1500,
          fit: true,
          padding: 50,
          gravity: 1.5,
          nodeRepulsion: 4000,
          idealEdgeLength: 100,
          randomize: true,
        },
        userZoomingEnabled: true,
        userPanningEnabled: true,
      });
    }
  }, []);

  const handleGenerateMindmap = async () => {
    if (!textInput || !user) return;
    
    setIsGenerating(true);

    try {
      const res = await fetch("http://localhost:5000/mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textInput }),
      });

      const data = await res.json();
      if (!data.nodes?.length) {
        alert("No mindmap generated!");
        setIsGenerating(false);
        return;
      }

      const elements = data.nodes.map((n) => ({
        data: {
          id: n.id,
          label: n.label,
          type: n.depth === 0 ? "main" : n.depth === 1 ? "sub" : "content",
        },
      }));

      data.edges.forEach((e, idx) => {
        elements.push({ data: { id: `edge-${idx}`, source: e.from, target: e.to } });
      });

      const cy = cyRef.current;
      cy.elements().remove();
      cy.add(elements);

      cy.layout({
        name: "cose-bilkent",
        animate: true,
        animationDuration: 1500,
        fit: true,
        padding: 50,
        gravity: 1.5,
        nodeRepulsion: 4000,
        idealEdgeLength: 100,
        randomize: true,
      }).run();

      cy.on("mouseover", "node", (e) => {
        e.target.style({
          "box-shadow": "0px 0px 25px rgba(0,0,0,0.4)",
          "transform": "scale(1.08)",
        });
      });

      cy.on("mouseout", "node", (e) => {
        e.target.style({
          "box-shadow": "0px 4px 15px rgba(0,0,0,0.2)",
          "transform": "scale(1)",
        });
      });

      setTimeout(() => {
        const png64 = cy.png({ full: true, scale: 2 });
        saveToHistory(user.uid, 'mindmap', textInput, png64, user.email);
      }, 2000);

    } catch (err) {
      console.error(err);
      alert("Error generating mindmap.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, scale: 2 });
    const link = document.createElement("a");
    link.download = "mindmap.png";
    link.href = png64;
    link.click();
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
        <h1>Mindmap Generator</h1>
      </div>
      
      <div className="input-section">
        <div className="input-container">
          <label htmlFor="mindmap-input">Enter your text to generate a mindmap:</label>
          <textarea
            id="mindmap-input"
            rows={6}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Enter your text here... For example: 'Machine Learning concepts and applications'"
            disabled={isGenerating}
          />
          
          <div className="action-buttons">
            <button
              onClick={handleGenerateMindmap}
              disabled={!textInput.trim() || isGenerating}
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
                  Generate Mindmap
                </>
              )}
            </button>
            
            <button
              onClick={handleExport}
              disabled={!cyRef.current || cyRef.current.elements().length === 0}
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
          <h3>Generated Mindmap</h3>
          <div className="viz-controls">
            <span className="instruction">💡 Hover over nodes to highlight, use mouse wheel to zoom</span>
          </div>
        </div>
        
        <div
          id="cy"
          className="mindmap-container"
        />
      </div>
    </div>
  );
}

export default MindmapPage;