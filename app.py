from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
import json

app = Flask(__name__)
CORS(app)

# Load the models
bangalore_model = joblib.load(r'preprocessing\india\bangalore_home_price_model.pickle')
chennai_model = joblib.load(r'preprocessing\india\chennai_home_price_model.pickle')

# Load the column structure
with open(r'preprocessing\india\bangalore_columns.json', 'r') as file:
    bangalore_column = json.load(file)["data_columns"]

with open(r'preprocessing\india\chennai_columns.json', 'r') as file:
    chennai_column = json.load(file)["data_columns"]

# Load the dataset
bangalore_data = pd.read_csv(r'preprocessing\india\bhp.csv')
chennai_data = pd.read_csv(r'preprocessing\india\chp.csv')

# Extract unique locations
bangalore_loc = sorted(bangalore_data['location'].unique())
chennai_loc = sorted(chennai_data['location'].unique())

def predict_price(model, column, loc, sqft, bath, bhk):
    loc_col = f'location_{loc}'

    x = np.zeros(len(column))

    try:
        # Fill the relevant values
        x[column.index('total_sqft')] = sqft
        x[column.index('bath')] = bath
        x[column.index('bhk')] = bhk
    except ValueError as e:
        print(f"Error: {e}")
        return "Invalid input feature name."

    if loc_col in column:
        loc_idx = column.index(loc_col)
        x[loc_idx] = 1

    return model.predict([x])[0]

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_locations', methods=['POST'])
def get_locations():
    city = request.json['city']
    if city == 'bangalore':
        loc = bangalore_loc
    elif city == 'chennai':
        loc = chennai_loc
    else:
        loc = []
    return jsonify({'locations': loc})

@app.route('/predict', methods=['POST'])
def predict():
    # Get form data
    location = request.form['location']
    sqft = float(request.form['sqft'])
    bath = int(request.form['bath'])
    bhk = int(request.form['bhk'])
    city = request.form['city']

    # Create DataFrame
    if city.lower() == 'bangalore':
        model = bangalore_model
        column = bangalore_column
    elif city.lower() == 'chennai':
        model = chennai_model
        column = chennai_column
    else:
        return jsonify({'error': 'City not supported'})

    # Make prediction
    prediction = predict_price(model, column, location, sqft, bath, bhk)

    if isinstance(prediction, str):
        return jsonify({'error': prediction})
    
    output = round(float(prediction), 2)
    return jsonify({'prediction': output})

if __name__ == "__main__":
    app.run(debug=True)
