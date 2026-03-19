from flask import Flask, request, jsonify, render_template
import pickle
import pandas as pd
import random

# Load dataset for dropdown values
df = pd.read_csv('agmarknet_india_historical_prices_2024_2025.csv')

commodities = sorted(df['Commodity'].dropna().unique())
markets = sorted(df['Market Name'].dropna().unique())
states = sorted(df['State'].dropna().unique())
varieties = sorted(df["Variety"].dropna().unique())
grades = sorted(df["Grade"].dropna().unique())
district = sorted(df['District Name'].dropna().unique())

app = Flask(__name__)

# Load trained pipeline model
with open('crop_price_model.pkl', 'rb') as f:
    model = pickle.load(f)

# Home page
@app.route('/')
def index():
    return render_template(
        "index.html",
        commodities=commodities,
        district=district,
        markets=markets,
        states=states,
        varieties=varieties,
        grades=grades
    )


# Prediction API
@app.route('/get_varieties')
def get_varieties():

    commodity = request.args.get('commodity')

    varieties = df[df["Commodity"] == commodity]["Variety"].dropna().unique()

    return jsonify(sorted(varieties.tolist()))


@app.route('/get_districts')
def get_districts():
    state = request.args.get('state')

    districts = (
        df[df["State"] == state]["District Name"]
        .dropna()
        .sort_values()
        .unique()
        .tolist()
    )

    return jsonify(districts)


@app.route('/get_markets')
def get_markets():

    district = request.args.get('district')

    markets = (
        df[df["District Name"] == district]["Market Name"]
        .dropna()
        .sort_values()
        .unique()
        .tolist()
    )

    return jsonify(markets)


@app.route('/predict', methods=['POST'])
def predict():

    try:

        data = request.get_json()

        commodity  = data.get('commodity')
        district   = data.get('district')
        market     = data.get('market')
        state      = data.get('state')
        variety    = data.get('variety')
        grade      = data.get('grade')
        min_price  = float(data.get('min_price'))
        max_price  = float(data.get('max_price'))

        # -------------------------------
        # BASIC VALIDATION
        # -------------------------------

        if max_price <= min_price:
            return jsonify({"success": False, "error": "Max price must be greater than Min price"})

        # -------------------------------
        # MODEL PREDICTION
        # -------------------------------

        X = pd.DataFrame([{
            "Commodity": commodity,
            "District Name": district,
            "Market Name": market,
            "State": state,
            "Variety": variety,
            "Grade": grade,
            "Min Price (Rs./Quintal)": min_price,
            "Max Price (Rs./Quintal)": max_price
        }])

        predicted = float(model.predict(X)[0])
        predicted = round(predicted, 2)

        # -------------------------------
        # CURRENT PRICE FROM DATASET
        # -------------------------------

        filtered = df[
            (df["Commodity"] == commodity) &
            (df["District Name"] == district) &
            (df["Market Name"] == market)
        ].copy()

        if filtered.empty:
            return jsonify({
                "success": False,
                "error": "No historical data found for this selection"
            })

        filtered["Price Date"] = pd.to_datetime(filtered["Price Date"], dayfirst=True)

        latest = filtered.sort_values("Price Date").iloc[-1]

        current = float(latest["Modal Price (Rs./Quintal)"])

        # -------------------------------
        # SELL RECOMMENDATION
        # -------------------------------

        recommendation = "Wait Before Selling" if predicted > current else "Sell Now"

        pct_change = round(((predicted - current) / current) * 100, 2)

        # -------------------------------
        # HISTORICAL GRAPH DATA
        # -------------------------------

        hist_df = df[
            (df["Commodity"] == commodity) &
            (df["State"] == state) &
            (df["District Name"] == district) &
            (df["Market Name"] == market)
        ].copy()

        hist_df["Price Date"] = pd.to_datetime(hist_df["Price Date"], dayfirst=True)

        hist_df = hist_df.sort_values("Price Date")

        hist_df["month"] = hist_df["Price Date"].dt.to_period("M")

        monthly = hist_df.groupby("month")["Modal Price (Rs./Quintal)"].mean().reset_index()

        monthly["month"] = monthly["month"].astype(str)

        monthly = monthly.tail(12)

        labels = monthly["month"].tolist()

        prices = monthly["Modal Price (Rs./Quintal)"].round(2).tolist()

        # -------------------------------
        # RESPONSE
        # -------------------------------

        return jsonify({
            "success": True,
            "current_price": current,
            "predicted_price": predicted,
            "recommendation": recommendation,
            "pct_change": pct_change,
            "historical": {
                "labels": labels,
                "data": prices
            },
            "commodity": commodity
        })

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

if __name__ == '__main__':
    app.run(debug=True, port=5000)