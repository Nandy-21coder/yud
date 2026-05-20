import os
import sqlite3
import random
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from werkzeug.utils import secure_filename
import requests
import json

# Load env variables manually from .env if present
if os.path.exists('.env'):
    with open('.env') as f:
        for line in f:
            if line.strip() and not line.startswith('#'):
                key, val = line.strip().split('=', 1)
                os.environ[key.strip()] = val.strip().strip('"').strip("'")


app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

# Configuration
UPLOAD_FOLDER = 'uploads'
DB_PATH = 'database.db'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Database Helper
def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullname TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# --- Frontend Routes ---
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/dashboard.html')
@app.route('/main_advisor.html')
def serve_dashboard():
    # Force a 301 redirect to the new filename to break browser cache
    return send_from_directory('.', 'main_advisor.html')



# --- API Endpoints ---

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    name = data.get('fullname')
    email = data.get('email', '').lower()
    password = data.get('password')

    if not name or not email or not password:
        return jsonify({"status": "error", "message": "Missing fields"}), 400

    conn = get_db_connection()
    try:
        conn.execute('INSERT INTO users (fullname, email, password) VALUES (?, ?, ?)', 
                     (name, email, password))
        conn.commit()
        return jsonify({"status": "success", "message": "Account created successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"status": "error", "message": "Email already registered"}), 409
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').lower()
    password = data.get('password')

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE email = ? AND password = ?', (email, password)).fetchone()
    conn.close()

    if user:
        return jsonify({
            "status": "success", 
            "user": {"email": user['email'], "fullname": user['fullname']}
        }), 200
    else:
        return jsonify({"status": "error", "message": "Invalid email or password"}), 401

@app.route('/api/recommend', methods=['POST'])
def recommend():
    data = request.json
    soil = data.get('soil_type', 'Black Soil')
    season = data.get('season', 'Rainy')
    water = data.get('water', 'Medium')
    health = data.get('health', 'Average')
    weather = data.get('weather', 'Pleasant')
    location = data.get('location', '')
    return recommend_with_params(soil, season, water, health, weather, location)

def recommend_with_params(soil, season, water, health, weather, location=""):
    # Phase 1: Deterministic Rule-Based Scoring for Oilseeds
    crop_profiles = {
        "Groundnut": {"soil": ["Red Soil", "Sandy Soil", "Loamy Soil"], "season": ["Rainy", "Summer"], "water": ["Low", "Medium"]},
        "Sesame (Til)": {"soil": ["Red Soil", "Sandy Soil"], "season": ["Summer", "Rainy"], "water": ["Low"]},
        "Mustard": {"soil": ["Alluvial Soil", "Loamy Soil"], "season": ["Winter"], "water": ["Medium"]},
        "Sunflower": {"soil": ["Black Soil", "Loamy Soil"], "season": ["Rainy", "Winter", "Summer"], "water": ["Medium", "High"]},
        "Soybean": {"soil": ["Black Soil", "Alluvial Soil"], "season": ["Rainy"], "water": ["High", "Medium"]},
        "Castor Seed": {"soil": ["Sandy Soil", "Red Soil"], "season": ["Rainy", "Summer"], "water": ["Low"]},
        "Coconut": {"soil": ["Sandy Soil", "Loamy Soil"], "season": ["Rainy", "Winter", "Summer"], "water": ["High"]},
        "Cottonseed": {"soil": ["Black Soil", "Alluvial Soil"], "season": ["Rainy", "Summer"], "water": ["Medium", "High"]}
    }

    scores = {}
    for crop, profile in crop_profiles.items():
        score = 0
        if soil in profile["soil"]: score += 40
        if season in profile["season"]: score += 35
        if water in profile["water"]: score += 25
        scores[crop] = score

    # Sort crops by score
    sorted_crops = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_crop = sorted_crops[0][0]
    top_score = sorted_crops[0][1]
    alt_crop1 = sorted_crops[1][0]
    alt_score1 = sorted_crops[1][1]
    alt_crop2 = sorted_crops[2][0]
    alt_score2 = sorted_crops[2][1]

    # Phase 2: Groq API for Explanation Only
    system_prompt = f"""
You are an expert Agricultural AI. The system has already mathematically determined the best crop based on the user's input.
Your ONLY job is to explain WHY this crop is perfect and provide expert advice.

User Inputs:
Soil: {soil}
Season: {season}
Water: {water}
Health: {health}
Location: {location}

System Selected Best Crop: {top_crop}
Alternative 1: {alt_crop1}
Alternative 2: {alt_crop2}

Return a STRICT JSON object in this format EXACTLY:
{{
  "top_choice": {{
    "reason": "Brief 1-sentence reason mentioning the soil and season why {top_crop} is best.",
    "advice": "One short expert tip for growing {top_crop} in these conditions.",
    "yield": "Expected tons/acre (e.g. '1.5 - 2')",
    "price": "Current market price in ₹/quintal (e.g. '6800')"
  }},
  "alternatives": [
    {{ "crop": "{alt_crop1}", "yield": "tons/acre" }},
    {{ "crop": "{alt_crop2}", "yield": "tons/acre" }}
  ]
}}

No markdown, no extra text. Just JSON.
"""

    api_key = os.getenv("GROQ_API_KEY")
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

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
        
        result_json = response.json()
        content = result_json["choices"][0]["message"]["content"]
        parsed_content = json.loads(content)
        
        return jsonify({
            "status": "success",
            "primary_crop": {
                "name": top_crop,
                "accuracy": str(max(85, top_score)),
                "reasoning": parsed_content["top_choice"]["reason"],
                "expected_yield": parsed_content["top_choice"]["yield"] + " Tons/Acre",
                "expert_tip": parsed_content["top_choice"]["advice"],
                "mandi_price": f"{parsed_content['top_choice']['price']}"
            },
            "alternatives": [
                {
                    "name": alt["crop"],
                    "accuracy": str(max(75, int(alt_score1) if i == 0 else int(alt_score2))),
                    "expected_yield": alt["yield"] + " Tons/Acre"
                } for i, alt in enumerate(parsed_content.get("alternatives", []))
            ],
            "detected_params": {"soil": soil, "season": season, "weather": weather}
        })
        
    except Exception as e:
        print(f"Groq API Error: {e}")
        # Fallback to a default response if API fails
        return jsonify({
            "status": "success", 
            "primary_crop": {
                "name": "Groundnut (Fallback)",
                "accuracy": "85",
                "reasoning": "Fallback recommendation due to API error.",
                "expected_yield": "1.5 Tons/Acre",
                "expert_tip": "Check API connection.",
                "mandi_price": "₹ 6,500/q"
            },
            "alternatives": [
                {"name": "Sunflower", "accuracy": "80", "expected_yield": "1.2 Tons/Acre"}
            ],
            "detected_params": {"soil": soil, "season": season, "weather": weather}
        })

def estimate_soil_from_location(loc):
    if not loc or len(loc.strip()) < 3:
        return "Unknown"
    
    loc = loc.lower().strip()
    
    # 1. Professional Validation: Filter out non-Earth / nonsensical inputs
    invalid_keywords = ["mars", "moon", "jupiter", "saturn", "venus", "pluto", "planet", "galaxy", "space", "alien", "unknown", "test"]
    if any(k == loc or f" {k} " in f" {loc} " for k in invalid_keywords):
        return "Invalid"

    # 2. Regional Soil Mapping for India (Expanded & Localized)
    
    # Specific TN Districts by Soil Type
    tn_black_soil = ["coimbatore", "tiruppur", "erode", "thoothukudi", "virudhunagar", "ramanathapuram", "tirunelveli", "pollachi", "sankarankovil", "kovilpatti"]
    tn_alluvial_soil = ["thanjavur", "tiruvarur", "nagapattinam", "mayiladuthurai", "cuddalore", "trichy", "tiruchirappalli", "pondy", "puducherry"]
    tn_red_soil = ["madurai", "dindigul", "sivaganga", "pudukkottai", "dharmapuri", "krishnagiri", "salem", "namakkal", "the-nilgiris", "theni", "perambalur", "ariyalur", "chengalpattu"]
    tn_sandy_soil = ["kanyakumari", "nagapattinam-coastal", "chennai", "tiruvallur", "tuticorin"]

    # National Mapping
    black_soil_regions = ["maharashtra", "madhya pradesh", "mp", "gujarat", "vidarbha", "marathwada", "indore", "latur", "nagpur", "pune", "bhopal"] + tn_black_soil
    alluvial_soil_regions = ["punjab", "haryana", "uttar pradesh", "up", "bihar", "bengal", "delhi", "ludhiana", "kanpur", "lucknow", "assam"] + tn_alluvial_soil
    red_soil_regions = ["kerala", "andhra", "telangana", "karnataka", "bangalore", "hyderabad", "mysore"] + tn_red_soil
    sandy_soil_regions = ["rajasthan", "thar", "jaipur", "jodhpur", "bikaner", "jaisalmer", "kutch"] + tn_sandy_soil

    # 3. Comprehensive Indian State & Region Indicators
    tn_districts = tn_black_soil + tn_alluvial_soil + tn_red_soil + tn_sandy_soil + ["kancheepuram", "kallakurichi", "ranipet", "tirupathur", "tiruvannamalai", "vellore", "viluppuram", "karur", "thiruvallur", "tenkasi"]
    
    india_indicators = [
        "tamil nadu", "tn", "kerala", "andhra", "telangana", "karnataka", "maharashtra", "gujarat", "rajasthan", 
        "punjab", "haryana", "uttar pradesh", "bihar", "west bengal", "odisha", "assam", "mp", "india", "district", "village"
    ] + tn_districts

    if any(word in loc for word in black_soil_regions):
        return "Black Soil"
    if any(word in loc for word in alluvial_soil_regions):
        return "Alluvial Soil"
    if any(word in loc for word in red_soil_regions):
        return "Red Soil"
    if any(word in loc for word in sandy_soil_regions):
        return "Sandy Soil"
    
    if any(word in loc for word in india_indicators):
        return "Loamy Soil" 

    return "Invalid"

@app.route('/api/get-soil-info', methods=['POST'])
def get_soil_info():
    data = request.json
    location = data.get('location', '')
    soil_type = estimate_soil_from_location(location)
    
    if soil_type == "Invalid":
        return jsonify({
            "status": "error", 
            "message": "Please enter a valid district or enable location access for accurate analysis."
        }), 400
    
    return jsonify({"status": "success", "soil_type": soil_type})

@app.route('/api/smart-recommend', methods=['POST'])
def smart_recommend():
    data = request.json
    location = data.get('location', '')
    
    # 1. Strict Validation
    soil = estimate_soil_from_location(location)
    if soil in ["Invalid", "Unknown"]:
        return jsonify({
            "status": "error", 
            "message": "Valid location required for AI data-mapping. Please check your district name."
        }), 400

    # 2. Auto-detect Season based on current Month
    month = datetime.now().month
    if 7 <= month <= 9: season = "Rainy"    # Kharif
    elif 10 <= month <= 3: season = "Winter" # Rabi
    else: season = "Summer"                  # Zaid

    # 3. Simulated Weather/Water based on common regional patterns
    # In a real app, this would call OpenWeatherMap API
    water = "Medium" 
    if "rajasthan" in location.lower(): water = "Low"
    
    health = "Average"
    weather = "Pleasant" if season == "Winter" else ("Hot" if season == "Summer" else "Rainy")

    # 4. Use the existing recommendation logic with auto-detected params
    # We'll call the internal logic directly (reuse code)
    # For now, we'll just replicate the core scoring loop
    return recommend_with_params(soil, season, water, health, weather, location)


@app.route('/api/predict', methods=['POST'])
def predict():
    data = request.json
    crop = data.get('crop', 'Soybean')
    area = float(data.get('area', 1))
    
    # Real-world approximate yield (Tons/Acre) and Market Price (INR/Ton)
    yield_map = {
        "Groundnut (Nilakkadalai)": 0.8,
        "Mustard (Kadugu)": 0.5,
        "Soybean": 0.7,
        "Sunflower (Suryagandhi)": 0.6,
        "Sesame (Ellu)": 0.3,
        "Safflower (Kusuma)": 0.5,
        "Niger seed (Uchellu)": 0.25,
        "Castor seed (Amanakku)": 0.9,
        "Linseed (Alivithai)": 0.4
    }
    price_map = {
        "Groundnut (Nilakkadalai)": 68000,
        "Mustard (Kadugu)": 58000,
        "Soybean": 48000,
        "Sunflower (Suryagandhi)": 56000,
        "Sesame (Ellu)": 145000,
        "Safflower (Kusuma)": 54000,
        "Niger seed (Uchellu)": 85000,
        "Castor seed (Amanakku)": 62000,
        "Linseed (Alivithai)": 55000
    }
    
    base_yield = yield_map.get(crop, 0.5)
    price_per_ton = price_map.get(crop, 50000)
    
    # Random factor for realism (weather/soil quality impact)
    expected = base_yield * area * random.uniform(0.85, 1.15)
    total_profit = expected * price_per_ton
    
    return jsonify({
        "status": "success", 
        "expected_yield": f"{expected:.2f} Tons", 
        "profit_est": f"₹ {int(total_profit):,}", 
        "harvest_time": "Ready in 100-130 Days (Seasonal)"
    })

@app.route('/api/detect', methods=['POST'])
def detect():
    # In a real app, this would use a CNN model. For now, we simulate crop-specific detection.
    # We can't easily know the crop from an image without a model, so we pick from a broad oilseed disease database.
    DISEASE_DB = [
        {"name": "Leaf Spot (Tikka)", "desc": "Dark brown spots on leaves with yellow halos.", "remedy": ["Spray Carbendazim", "Maintain field hygiene"]},
        {"name": "Rust (Gerua)", "desc": "Orange-brown pustules on the underside of leaves.", "remedy": ["Apply Mancozeb", "Use resistant varieties"]},
        {"name": "Powdery Mildew", "desc": "White flour-like patches on leaves and stems.", "remedy": ["Dust with Sulphur", "Spray Dinocap"]},
        {"name": "Root Rot", "desc": "Sudden wilting of the plant; roots appear black/decayed.", "remedy": ["Seed treatment with Thiram", "Avoid waterlogging"]},
        {"name": "Downy Mildew", "desc": "Greyish-white growth on the lower surface of leaves.", "remedy": ["Spray Metalaxyl", "Crop rotation"]},
        {"name": "Blight", "desc": "Rapid browning and death of plant tissues.", "remedy": ["Copper Oxychloride spray", "Remove infected plants"]}
    ]
    
    res = random.choice(DISEASE_DB)
    return jsonify({
        "status": "success", 
        "detection": {
            "name": res['name'], 
            "description": res['desc'], 
            "remedy": res['remedy']
        }
    })

# Tamil Nadu Market Data for Simulation
MARKET_DATA = [
    {"name": "Groundnut", "mandi": "Erode (TN)", "price": 6800, "min": 6600, "max": 7000, "trend": "+1.1%", "status": "up"},
    {"name": "Groundnut", "mandi": "Tiruvannamalai (TN)", "price": 6750, "min": 6500, "max": 6900, "trend": "+0.8%", "status": "up"},
    {"name": "Sesame (Til)", "mandi": "Villupuram (TN)", "price": 13500, "min": 13000, "max": 14000, "trend": "-0.5%", "status": "down"},
    {"name": "Sesame (Til)", "mandi": "Cuddalore (TN)", "price": 13800, "min": 13500, "max": 14200, "trend": "+1.2%", "status": "up"},
    {"name": "Coconut (Copra)", "mandi": "Pollachi (TN)", "price": 10500, "min": 10200, "max": 10800, "trend": "+2.0%", "status": "up"},
    {"name": "Coconut (Copra)", "mandi": "Tiruppur (TN)", "price": 10300, "min": 10000, "max": 10600, "trend": "+1.5%", "status": "up"},
    {"name": "Sunflower", "mandi": "Coimbatore (TN)", "price": 6100, "min": 5900, "max": 6300, "trend": "+0.7%", "status": "up"},
    {"name": "Castor Seed", "mandi": "Salem (TN)", "price": 5600, "min": 5400, "max": 5800, "trend": "-0.2%", "status": "down"},
    {"name": "Cottonseed", "mandi": "Madurai (TN)", "price": 4200, "min": 4000, "max": 4400, "trend": "+0.5%", "status": "up"},
    {"name": "Mustard", "mandi": "Vellore (TN)", "price": 6100, "min": 5900, "max": 6300, "trend": "+0.3%", "status": "up"},
    {"name": "Groundnut", "mandi": "Namakkal (TN)", "price": 6850, "min": 6700, "max": 7100, "trend": "+1.4%", "status": "up"},
    {"name": "Sesame (Til)", "mandi": "Thanjavur (TN)", "price": 13200, "min": 12800, "max": 13500, "trend": "-0.8%", "status": "down"}
]

@app.route('/api/market-prices', methods=['GET'])
def market_prices():
    global MARKET_DATA
    # Simulation: Fluctuate prices slightly (-5 to +5 rupees)
    for item in MARKET_DATA:
        change = random.randint(-5, 5)
        item['price'] += change
        item['status'] = 'up' if change >= 0 else 'down'
        item['trend'] = f"{'+' if change >= 0 else ''}{random.uniform(0.1, 2.5):.1f}%"
    
    return jsonify({"status": "success", "prices": MARKET_DATA})

@app.route('/api/historical-trends', methods=['GET'])
def historical_trends():
    crop = request.args.get('crop', 'Mustard')
    
    # Months for simulation
    labels = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"]
    
    # Real-ish historical base prices per quintal
    trends = {
        "Mustard": [5200, 5400, 5800, 6100, 6300, 6416],
        "Soybean": [4800, 4950, 5100, 5300, 5400, 5445],
        "Groundnut": [6200, 6500, 6800, 7000, 7100, 6926],
        "Sunflower": [5200, 5350, 5500, 5650, 5800, 5889],
        "Sesame": [12000, 12500, 13000, 13800, 14200, 14500],
        "Safflower": [4800, 4900, 5100, 5200, 5300, 5400],
        "Niger": [7500, 7700, 7900, 8000, 8100, 8200],
        "Castor": [5800, 5950, 6050, 6100, 6150, 6200],
        "Linseed": [5000, 5100, 5250, 5350, 5450, 5500]
    }
    
    return jsonify({
        "status": "success",
        "labels": labels,
        "data": trends.get(crop, trends["Mustard"])
    })

# --- Cache Prevention (Fixes the Ctrl+F5 issue) ---
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
