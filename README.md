# Text2Visuals – AI-Powered Mindmap & Flowchart Generator

Text2Visuals is a web-based application that converts any text or problem statement into clear, structured **mindmaps** and **flowcharts**. It uses AI to produce hierarchical JSON representations and visualizes them through an interactive frontend. Each generated visual can be downloaded and is saved to the user’s history through Firebase authentication.

# Features:

## Mindmap Generator:
- Accepts long paragraphs or topic descriptions as input.
- Sends the text to an AI model (Cohere) which returns a hierarchical mindmap JSON structure.
- Fallback logic (RAKE + spaCy) builds a basic mindmap if AI fails.
- Converts AI JSON into nodes and edges and renders using **Cytoscape** (cose-bilkent layout).
- Interactive visualization: zoom, hover effects, smooth animations.
- Export the generated mindmap as a **PNG** image.
- Automatically saves the visual and prompt to user history.

## Flowchart Generator:
- Accepts a problem statement describing a task or workflow.
- AI (Cohere) converts the text into hierarchical flowchart JSON using numbered steps.
- Cleans and normalizes labels to ensure consistent node structure.
- Converts the hierarchy into nodes and edges for rendering.
- Flowchart rendered using custom HTML + CSS layout.
- Export the full flowchart as a **PNG** using **html2canvas**.
- Saves the resulting image and prompt to history.

## Firebase Authentication & History:
- Google Sign-In using Firebase Authentication.
- Each user has isolated history stored locally per user.
- History stores:
  - type: `mindmap` or `flowchart`
  - input prompt
  - generated PNG image
  - timestamp
- History page lets users revisit or re-open previous generations.

# Technologies Used:

## Backend:
- **Python (Flask)** – Main backend framework.
- **Cohere Command-Xlarge-Nightly** – AI model used for structured JSON generation.
- **spaCy** – For sentence segmentation and fallback parsing.
- **rake_nltk + NLTK** – For keyword extraction in fallback mindmap mode.

## Frontend:
- **React.js** – Frontend framework for interactive user interface.
- **Cytoscape.js** – Mindmap layout engine.
- **html2canvas** – For flowchart PNG export.
- **Firebase Auth** – Google Login.

# Project Structure:
```
Text2Visuals/
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env
│   └── venv/
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   ├── index.css
│   │   ├── firebase_config.js
│   │   ├── pages/
│   │   │   ├── MindmapPage.js
│   │   │   ├── FlowchartPage.js
│   │   │   └── HistoryPage.js
│   │   └── utils/
│   │       ├── historyUtils.js
│   │       └── historyUtils_firestore.js
│   ├── package.json
│   └── package-lock.json
│
├── .gitignore
└── README.md
```

# How It Works:

1. User signs in via Google (Firebase Authentication).
2. User enters text for mindmap or a problem statement for flowchart.
3. Text is sent to Flask backend:
   - Backend sends prompt to Cohere to produce hierarchical JSON.
   - AI JSON is cleaned and validated.
   - If AI fails, fallback logic builds a basic hierarchy.
4. Backend converts hierarchy to **nodes + edges** and returns it.
5. Frontend renders the visual:
   - **Mindmap:** Cytoscape layout engine.
   - **Flowchart:** Custom HTML layout.
6. Generated visual is converted to PNG (Cytoscape export or html2canvas).
7. PNG + prompt are stored in user history.
8. User can download visuals or revisit from history.

## Sample Results:
1. Mindmap:
<img width="4090" height="1512" alt="Sample Mindmap" src="https://github.com/user-attachments/assets/d55d31e9-1619-458b-bea5-9c58cc5ca730" />

2. Flowchart:
<img width="2564" height="1220" alt="Sample Flowchart" src="https://github.com/user-attachments/assets/4fbf777b-cdf3-4502-9afc-9f683e93bc4c" />

# Future Enhancements:
- Allow editing of generated nodes.
- Multi-language input support.
- Export to PDF and SVG.

# Credits:
- **Cohere AI** – JSON generation for mindmaps and flowcharts.
- **spaCy / NLTK / RAKE** – NLP preprocessing.
- **Cytoscape.js** – Mindmap visualization engine.
- **html2canvas** – Flowchart export.
