import os
import requests
import json

# Load env variables manually from .env if present
if os.path.exists('.env'):
    with open('.env') as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, val = line.strip().split('=', 1)
                os.environ[key.strip()] = val.strip().strip('"').strip("'")

api_key = os.getenv("GROQ_API_KEY")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

system_prompt = "Hello, respond with a JSON object saying 'hello'."
payload = {
    "model": "llama-3.1-8b-instant",
    "messages": [
        {"role": "user", "content": system_prompt}
    ],
    "temperature": 0.2,
    "response_format": {"type": "json_object"}
}

try:
    response = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload, timeout=15)
    response.raise_for_status()
    print("Success:", response.json())
except Exception as e:
    print("Error:", e)
    if hasattr(response, 'text'):
        print("Response text:", response.text)
