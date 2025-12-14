from flask import Flask, render_template, request, jsonify
import joblib
import pandas as pd
import numpy as np
import json
import traceback

app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False

# Load your pre-trained model (graceful handling if missing or fails to unpickle)
model = None
try:
    model = joblib.load("stack_aqi_model.pkl")
    print("[v0] Model loaded successfully")
except Exception as e:
    print(f"[v0] Error loading model: {e}")

feature_cols = ['Date', 'Month', 'Year', 'Holidays_Count', 'Days', 'PM2.5', 'PM10', 'NO2', 'SO2', 'CO', 'Ozone']

csv_file = "final_dataset.csv"
df = None

try:
    df = pd.read_csv(csv_file)
    print("[v0] CSV data loaded successfully")
except Exception as e:
    print(f"[v0] Error loading CSV: {e}")
    df = None

# AQI category mappings with detailed information
AQI_CATEGORIES = {
    0: {
        "range": "0-50",
        "label": "Good",
        "color": "#10b981",
        "health_implications": "Air quality is satisfactory, and air pollution poses little or no risk.",
        "safety_measures": "None. Enjoy your normal outdoor activities."
    },
    1: {
        "range": "51-100",
        "label": "Satisfactory",
        "color": "#3b82f6",
        "health_implications": "Air quality is acceptable. However, there may be a moderate health concern for a very small number of unusually sensitive people.",
        "safety_measures": "Sensitive Individuals (e.g., with asthma, heart disease): Consider limiting prolonged outdoor exertion. General Public: Safe for all activities."
    },
    2: {
        "range": "101-200",
        "label": "Moderately Polluted",
        "color": "#f59e0b",
        "health_implications": "Breathing discomfort to people with lung diseases such as asthma, and discomfort to people with heart disease, children, and older adults.",
        "safety_measures": "Sensitive Individuals: Limit time outdoors. Reduce strenuous activities. Keep medications readily available. General Public: Limit prolonged or heavy outdoor exertion."
    },
    3: {
        "range": "201-300",
        "label": "Poor",
        "color": "#ef4444",
        "health_implications": "Breathing discomfort to most people on prolonged exposure.",
        "safety_measures": "Sensitive Individuals: Avoid all outdoor physical exertion. Stay indoors as much as possible. Consider wearing an N95/KN95 mask if going out. General Public: Limit outdoor exertion."
    },
    4: {
        "range": "301-399",
        "label": "Very Poor",
        "color": "#991b1b",
        "health_implications": "May cause respiratory illness on prolonged exposure. The effect may be more pronounced in people with lung and heart diseases.",
        "safety_measures": "Everyone: Avoid all outdoor physical activity. Stay indoors. Run an air purifier with a HEPA filter if available. Keep windows and doors closed."
    },
    5: {
        "range": "400+",
        "label": "Severe",
        "color": "#7f1d1d",
        "health_implications": "Affects healthy people and seriously impacts those with existing diseases. Emergency health warning: everyone is more likely to be affected.",
        "safety_measures": "Everyone: Avoid all outdoor activity. Consult a doctor if you experience persistent symptoms (coughing, wheezing, breathlessness). Wear an N95/KN95 mask if you must go out. Stay hydrated and eat antioxidant-rich food."
    }
}

def get_aqi_category(aqi_value):
    """Get AQI category based on value"""
    if aqi_value <= 50:
        return AQI_CATEGORIES[0]
    elif aqi_value <= 100:
        return AQI_CATEGORIES[1]
    elif aqi_value <= 200:
        return AQI_CATEGORIES[2]
    elif aqi_value <= 300:
        return AQI_CATEGORIES[3]
    elif aqi_value <= 399:
        return AQI_CATEGORIES[4]
    else:
        return AQI_CATEGORIES[5]

@app.route('/')
def index():
    """Render main page"""
    return render_template('index.html', features=feature_cols, categories=json.dumps(AQI_CATEGORIES))

@app.route('/predict', methods=['POST'])
def predict():
    """Predict AQI based on input features"""
    if model is None:
        return jsonify({'error': 'Model not loaded', 'success': False}), 500
    try:
        # Log incoming form for debugging
        try:
            print(f"[v0] /predict form: {request.form.to_dict()}")
        except Exception:
            print("[v0] /predict received non-form data")
        user_input = []
        for col in feature_cols:
            value = request.form.get(col)
            if value is None:
                return jsonify({'error': f'Missing field: {col}'}), 400
            user_input.append(float(value))
        
        X = np.array(user_input).reshape(1, -1)
        pred_aqi = model.predict(X)[0]
        pred_aqi = max(0, round(float(pred_aqi), 2))
        
        category = get_aqi_category(pred_aqi)
        
        return jsonify({
            'success': True,
            'aqi': pred_aqi,
            'category': category['label'],
            'color': category['color'],
            'range': category['range'],
            'health_implications': category['health_implications'],
            'safety_measures': category['safety_measures']
        })
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[v0] Prediction error:\n{tb}")
        return jsonify({'error': str(e), 'trace': tb, 'success': False}), 500

@app.route('/api/sample-data', methods=['GET'])
def sample_data():
    """Return monthly AQI trend and pollutants from CSV for years 2021-2024"""
    if df is None:
        return jsonify([])
    
    try:
        # Filter data for years 2021-2024
        df_copy = df.copy()
        df_copy = df_copy[df_copy['Year'].isin([2021, 2022, 2023, 2024])]
        
        if len(df_copy) == 0:
            return jsonify(generate_fallback_data())
        
        # Parse date if it exists
        if 'Date' in df_copy.columns:
            df_copy['Date'] = pd.to_datetime(df_copy['Date'], errors='coerce')
            df_copy['Month'] = df_copy['Date'].dt.month
        elif 'Month' not in df_copy.columns:
            df_copy['Month'] = 1
        
        # Group by Year and Month, then calculate averages
        monthly_data = []
        month_names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        # Get all unique year-month combinations, sorted chronologically
        df_copy['YearMonth'] = df_copy['Year'].astype(str) + '-' + df_copy['Month'].astype(str).str.zfill(2)
        year_month_combos = sorted(df_copy['YearMonth'].unique())
        
        for ym in year_month_combos:
            year, month = map(int, ym.split('-'))
            month_df = df_copy[(df_copy['Year'] == year) & (df_copy['Month'] == month)]
            
            if len(month_df) == 0:
                continue
            
            aqi = month_df['AQI'].mean() if 'AQI' in month_df.columns else None
            pm25 = month_df['PM2.5'].mean() if 'PM2.5' in month_df.columns else None
            pm10 = month_df['PM10'].mean() if 'PM10' in month_df.columns else None

            monthly_data.append({
                'month': f"{month_names[month - 1]} {year}",
                'year': year,
                'month_num': month,
                'aqi': round(aqi, 2) if aqi is not None else None,
                'pm25': round(pm25, 2) if pm25 is not None else None,
                'pm10': round(pm10, 2) if pm10 is not None else None
            })
        
        return jsonify(monthly_data if monthly_data else generate_fallback_data())
    except Exception as e:
        print(f"[v0] Error processing CSV data: {e}")
        return jsonify(generate_fallback_data())


@app.route('/trends')
def trends():
    """Render a standalone page with Monthly AQI Trend chart"""
    return render_template('trends.html')

def generate_fallback_data():
    """Generate fallback data if CSV processing fails"""
    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    data = []
    for i, month in enumerate(months):
        data.append({
            'month': month,
            'aqi': round(150 + (30 * np.sin(i * np.pi / 6))),
            'pm25': round(100 + np.random.randint(-30, 30)),
            'pm10': round(150 + np.random.randint(-40, 40))
        })
    return data

if __name__ == '__main__':
    app.run(debug=True, port=5000)
