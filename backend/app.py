import os
import re
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import spacy
from rake_nltk import Rake
from nltk.corpus import stopwords
import nltk
from dotenv import load_dotenv
import cohere

load_dotenv()
cohere_api_key = os.getenv("COHERE_API_KEY")
co = cohere.Client(cohere_api_key)

nltk.data.path.append("D:/nltk_data")
nltk.download("stopwords", download_dir="D:/nltk_data")
stop_words = set(stopwords.words("english"))
nlp = spacy.load("en_core_web_sm")

app = Flask(__name__)
CORS(app)


def clean_phrase(phrase: str) -> str:
    phrase = re.sub(r"\s+", " ", phrase)
    return phrase.strip()

def build_nodes_edges(flow_json, root_time_estimate=None):
    nodes = []
    edges = []
    node_id = 0

    def add_node(node, parent_id=None, depth=0):
        nonlocal node_id
        current_id = str(node_id)

        if isinstance(node, str):
            label = node
            time_estimate = None
        elif isinstance(node, dict):
            label = node.get("label", node.get("root", "Step"))
            time_estimate = node.get("timeEstimate", None)
        else:
            label = str(node)
            time_estimate = None

        node_obj = {
            "id": current_id,
            "label": clean_phrase(label),
            "depth": depth
        }
        
        if time_estimate is not None:
            node_obj["timeEstimate"] = time_estimate
        elif depth == 0 and root_time_estimate is not None:
            node_obj["timeEstimate"] = root_time_estimate
            
        nodes.append(node_obj)

        if parent_id is not None:
            edges.append({"from": parent_id, "to": current_id})

        node_id += 1

        children = []
        if isinstance(node, dict):
            if "children" in node:
                children = node["children"]
            elif "subchildren" in node:
                children = node["subchildren"]

        for child in children:
            add_node(child, parent_id=current_id, depth=depth+1)

    add_node(flow_json)
    return nodes, edges

def fallback_mindmap(text: str):
    rake = Rake(stopwords=stop_words)
    rake.extract_keywords_from_text(text)
    main_topics = rake.get_ranked_phrases()[:3]

    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]

    root = main_topics[0] if main_topics else "Main Topic"
    children = []
    for idx, topic in enumerate(main_topics[1:], 1):
        children.append({
            "label": topic,
            "subchildren": sentences[idx:idx+2]
        })

    return {
        "root": root,
        "children": children
    }

def fallback_flowchart(problem: str):
    doc = nlp(problem)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
    root = sentences[0] if sentences else "Start"
    children = [{"label": f"Step {i+1}", "subchildren": [sent]} for i, sent in enumerate(sentences[1:3])]
    return {"root": root, "children": children}

def estimate_step_duration_with_cohere(step_text, skill_level, parent_topic=None):
    multipliers = {
        "beginner": 1.5,
        "intermediate": 1.0,
        "advanced": 0.7,
        "expert": 0.5
    }
    
    if parent_topic:
        prompt = f"""Estimate the time in minutes required to complete the following task/subtask for the main topic '{parent_topic}'. 
Task: {step_text}

Consider that this is for a {skill_level} level user.

Respond with ONLY a number representing the estimated time in minutes."""
    else:
        prompt = f"""Estimate the time in minutes required to complete the following task.
Task: {step_text}

Consider that this is for a {skill_level} level user.

Respond with ONLY a number representing the estimated time in minutes."""
    
    try:
        response = co.chat(
            model="command-xlarge-nightly",
            message=prompt,
            max_tokens=10
        )
        
        ai_output = response.text.strip()
        
        import re
        time_match = re.search(r'\d+', ai_output)
        if time_match:
            base_time = int(time_match.group())
        else:
            base_time = 30
            
    except Exception as e:
        print("Cohere API error for time estimation:", e)
        base_time = 30
        
        if any(word in step_text.lower() for word in ["research", "learn", "study", "understand"]):
            base_time = 45
        elif any(word in step_text.lower() for word in ["implement", "code", "develop", "build"]):
            base_time = 60
        elif any(word in step_text.lower() for word in ["test", "debug", "validate"]):
            base_time = 40
        elif any(word in step_text.lower() for word in ["deploy", "release", "publish"]):
            base_time = 35
        elif any(word in step_text.lower() for word in ["design", "plan", "architect"]):
            base_time = 50
    
    multiplier = multipliers.get(skill_level.lower(), 1.0)
    return int(base_time * multiplier)

@app.route("/")
def index():
    return "Text2Visuals backend running"

@app.route("/mindmap", methods=["POST"])
def generate_mindmap():
    if request.json is None:
        data = {}
    else:
        data = request.json
    text = data.get("text", "").strip()
    if not text:
        return jsonify({"error": "Empty text"}), 400

    rake = Rake(stopwords=stop_words)
    rake.extract_keywords_from_text(text)
    main_topics = rake.get_ranked_phrases()[:5]

    if not main_topics:
        doc = nlp(text)
        main_topics = [sent.text.strip() for sent in doc.sents][:3]

    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]

    nlp_json = {"main_topics": main_topics, "sentences": sentences}
    print("=== NLP PREPROCESSED JSON ===")
    print(nlp_json)
    print("=============================")

    prompt = f"""
You are an AI assistant that converts text into a hierarchical mindmap structure.
Input text: {text}

Requirements:
1. Identify the main central topic.
2. Identify 3-5 subtopics.
3. For each subtopic, summarize 2-5 concise points.
4. Output ONLY valid JSON in this format:

{{
  "root": "Central Topic",
  "children": [
    {{"label": "Subtopic 1", "subchildren": ["Point 1", "Point 2"]}},
    {{"label": "Subtopic 2", "subchildren": ["Point 1", "Point 2"]}}
  ]
}}
"""

    try:
        response = co.chat(
            model="command-xlarge-nightly",
            message=prompt
        )
        ai_output = response.text

        print("=== AI GENERATED RAW OUTPUT ===")
        print(ai_output)
        print("===============================")

        if "```" in ai_output:
            ai_output = ai_output.split("```json")[-1]
            ai_output = ai_output.split("```")[0].strip()

        start = ai_output.find("{")
        end = ai_output.rfind("}")
        if start != -1 and end != -1:
            ai_output = ai_output[start:end+1]

        ai_json = json.loads(ai_output)

        print("=== AI CLEANED JSON ===")
        print(ai_json)
        print("=======================")

    except Exception as e:
        print("Cohere API error:", e)
        print(">>> Using fallback mindmap <<<")
        ai_json = fallback_mindmap(text)

    nodes = []
    edges = []
    node_id = 0

    root_id = str(node_id)
    nodes.append({"id": root_id, "label": clean_phrase(ai_json["root"]), "depth": 0})
    node_id += 1

    for child in ai_json.get("children", []):
        sub_id = str(node_id)
        nodes.append({"id": sub_id, "label": clean_phrase(child["label"]), "depth": 1})
        edges.append({"from": root_id, "to": sub_id})
        node_id += 1

        for point in child.get("subchildren", []):
            point_id = str(node_id)
            nodes.append({"id": point_id, "label": clean_phrase(point), "depth": 2})
            edges.append({"from": sub_id, "to": point_id})
            node_id += 1

    return jsonify({"nodes": nodes, "edges": edges})

@app.route("/flowchart", methods=["POST"])
def generate_flowchart():
    if request.json is None:
        data = {}
    else:
        data = request.json
    problem = data.get("problem", "").strip()
    skill_level = data.get("skillLevel", "intermediate").lower()
    if not problem:
        return jsonify({"error": "Empty problem statement"}), 400

    doc = nlp(problem)
    sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
    nlp_json = {"sentences": sentences}
    print("=== FLOWCHART NLP PREPROCESSED JSON ===")
    print(nlp_json)
    print("===============================")

    prompt = f"""
You are an AI assistant that converts a problem statement into a detailed implementation flowchart.
Problem statement: {problem}

Requirements:
1. Identify the central task.
2. Break down the implementation into steps, substeps if needed.
3. Include decision points if any.
4. All numbering should be consistent with steps and substeps (e.g., 1, 1.1, 1.2…) to maintain clarity and hierarchy. Have everything as numbered points and dont want decision points.
5. Always use the key "label" for every node. Do not use variations like "label3", "label.", or anything else.
6. Output in hierarchical JSON format like this:

{{
  "root": "Central Task",
  "children": [
    {{"label": "Step 1", "subchildren": ["Substep 1", "Substep 2"]}},
    {{"label": "Step 2", "subchildren": ["Substep 1", "Substep 2"]}}
  ]
}}
Ensure all nodes are concise, clear, and professional.
"""

    try:
        response = co.chat(
            model="command-xlarge-nightly",
            message=prompt
        )
        ai_output = response.text
        print("=== AI GENERATED RAW FLOWCHART ===")
        print(ai_output)
        print("===============================")

        if "```" in ai_output:
            ai_output = ai_output.split("```json")[-1]
            ai_output = ai_output.split("```")[0].strip()

        start = ai_output.find("{")
        end = ai_output.rfind("}")
        if start != -1 and end != -1:
            ai_output = ai_output[start:end+1]

        ai_json = json.loads(ai_output)

        def clean_ai_json_labels(node):
            if isinstance(node, dict):
                for key in list(node.keys()):
                    if re.match(r'label\d*\.?', key, re.IGNORECASE):
                        node['label'] = node[key]
                        if key != 'label':
                            del node[key]
                if 'children' in node:
                    node['children'] = [clean_ai_json_labels(c) for c in node['children']]
                if 'subchildren' in node:
                    new_sub = []
                    for c in node['subchildren']:
                        if isinstance(c, dict):
                            new_sub.append(clean_ai_json_labels(c))
                        else:
                            new_sub.append(c)
                    node['subchildren'] = new_sub
            return node

        ai_json = clean_ai_json_labels(ai_json)
        print("=== AI CLEANED FLOWCHART JSON ===")
        print(ai_json)
        print("===============================")

    except Exception as e:
        print("Cohere API error:", e)
        print(">>> Using fallback flowchart <<<")
        ai_json = fallback_flowchart(problem)

    def add_time_estimates(node, parent_label=None):
        if isinstance(node, dict):
            if 'label' in node:
                node['timeEstimate'] = estimate_step_duration_with_cohere(node['label'], skill_level, parent_label)
            
            current_label = node.get('label', None)
            
            if 'children' in node:
                for child in node['children']:
                    add_time_estimates(child, current_label)
            if 'subchildren' in node:
                for child in node['subchildren']:
                    if isinstance(child, dict):
                        add_time_estimates(child, current_label)
        return node

    ai_json = add_time_estimates(ai_json)

    # We don't need to estimate time for the root node anymore since we're not displaying it
    # root_time_estimate = None
    # if 'root' in ai_json:
    #     root_time_estimate = estimate_step_duration_with_cohere(ai_json['root'], skill_level)

    nodes, edges = build_nodes_edges(ai_json, None)

    return jsonify({"nodes": nodes, "edges": edges})

if __name__ == "__main__":
    app.run(debug=True, port=5000)