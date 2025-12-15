import sys
import os
import json
from openai import OpenAI
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from duckduckgo_search import DDGS

# Robustly load .env files from project root
# We assume server.py is in src/python/
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.abspath(os.path.join(current_dir, "../../"))

def safe_log(message):
    """Safely log messages to stdout, ignoring IOErrors (common in background processes)."""
    try:
        print(message, flush=True)
    except OSError:
        pass

safe_log(f"DEBUG: Server current dir: {current_dir}")
safe_log(f"DEBUG: Project root: {project_root}")

env_local_path = os.path.join(project_root, ".env.local")
env_path = os.path.join(project_root, ".env")

if os.path.exists(env_local_path):
    safe_log(f"DEBUG: Loading .env.local from {env_local_path}")
    load_dotenv(env_local_path)
elif os.path.exists(env_path):
    safe_log(f"DEBUG: Loading .env from {env_path}")
    load_dotenv(env_path)
else:
    safe_log("DEBUG: No .env file found at root.")

app = Flask(__name__)
CORS(app)

# Initialize OpenAI Client (Expects OPENAI_API_KEY in env)
# For this hackathon, if no key, we might need a fallback or simulation, 
# but let's assume the user has one or we use a simulated response if it fails.
try:
    client = OpenAI()
except:
    client = None

SYSTEM_PROMPT = """You are a Critical Industry News Analyst.
Your goal is to provide the latest, most critical news for a specific industry.
You have access to a web search tool.
ALWAYS use the web search tool to find the latest information.
After searching, summarize the top 1-2 most critical news stories in a concise, professional manner.
Focus on risks, regulations, and major shifts.
"""

def search_web(query):
    """Search the web using DuckDuckGo."""
    try:
        results = DDGS().text(query, max_results=3)
        return json.dumps(results)
    except Exception as e:
        return f"Error searching web: {str(e)}"

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_web",
            "description": "Search the internet for real-time news and information.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query, e.g. 'latest cybersecurity threats in manufacturing'"
                    }
                },
                "required": ["query"]
            }
        }
    }
]

def run_agent(user_message):
    if not client:
        return "Error: OPENAI_API_KEY not found or OpenAI client failed to initialize."

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message}
    ]

    # First Turn: Model thinks and may call tools
    try:
        response = client.chat.completions.create(
            model="gpt-4o", # Using standard model as 120b might be custom/unavailable
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )
    except Exception as e:
         return f"AI Error: {str(e)}"

    response_message = response.choices[0].message
    tool_calls = response_message.tool_calls

    if tool_calls:
        messages.append(response_message)
        
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)
            
            if function_name == "search_web":
                tool_output = search_web(function_args.get("query"))
                messages.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": "search_web",
                    "content": tool_output
                })

        # Second Turn: Model generates final answer based on tool outputs
        try:
            second_response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages
            )
            return second_response.choices[0].message.content
        except Exception as e:
            return f"AI Error during final generation: {str(e)}"
    
    return response_message.content


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('message', '')
    
    if not user_input:
        return jsonify({'error': 'No message provided'}), 400
    
    # Check for API Key - if missing, use direct web search
    if not os.environ.get("OPENAI_API_KEY"):
        safe_log("No OPENAI_API_KEY found. Using direct DuckDuckGo search.")
        try:
            # Extract industry from message for better search
            search_query = user_input.replace("Search for the latest major risk or insurance news affecting the", "").replace("industry in India (or global if significant). Return 2-3 short bullet points.", "").strip()
            search_query = f"latest {search_query} industry risks insurance news India 2024"
            
            results = DDGS().text(search_query, max_results=3)
            
            # Format results as bullet points
            if results:
                news_summary = "**Latest Industry News:**\n\n"
                for i, result in enumerate(results[:3], 1):
                    title = result.get('title', 'No title')
                    snippet = result.get('body', '')[:150]
                    news_summary += f"• {title}: {snippet}...\n\n"
                return jsonify({'response': news_summary})
            else:
                return jsonify({'response': "No recent news found for this industry."})
        except Exception as e:
            safe_log(f"DuckDuckGo search error: {e}")
            return jsonify({'response': f"Unable to fetch news at this time. Error: {str(e)}"})

    try:
        response = run_agent(user_input)
        return jsonify({'response': str(response)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    safe_log("Starting Flask Python Server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
