import os
import sys
import io
import zipfile
import h5py
import joblib
import numpy as np
import pandas as pd
import yfinance as yf
import xgboost as xgb
from flask import Flask, request, jsonify
from flask_cors import CORS

# Reconfigure stdout/stderr for safe UTF-8 logging on Windows
try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)

def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -50, 50)))

class KerasLSTMPredictor:
    """Exact-weights forward pass predictor for lstm_forex_model.keras.
    Provides Python 3.13 compatibility without modifying model architecture or trained weights.
    """
    def __init__(self, keras_path):
        with zipfile.ZipFile(keras_path) as z:
            with h5py.File(io.BytesIO(z.read('model.weights.h5')), 'r') as f:
                self.w1 = f['layers/lstm/cell/vars/0'][:]
                self.u1 = f['layers/lstm/cell/vars/1'][:]
                self.b1 = f['layers/lstm/cell/vars/2'][:]
                self.w2 = f['layers/lstm_1/cell/vars/0'][:]
                self.u2 = f['layers/lstm_1/cell/vars/1'][:]
                self.b2 = f['layers/lstm_1/cell/vars/2'][:]
                self.wd = f['layers/dense/vars/0'][:]
                self.bd = f['layers/dense/vars/1'][:]

    def predict(self, x, verbose=0):
        batch_size, seq_len, _ = x.shape
        # Layer 1: LSTM (units=50, return_sequences=True)
        h1 = np.zeros((batch_size, 50), dtype=np.float32)
        c1 = np.zeros((batch_size, 50), dtype=np.float32)
        out1 = np.zeros((batch_size, seq_len, 50), dtype=np.float32)

        for t in range(seq_len):
            xt = x[:, t, :]
            z = xt @ self.w1 + h1 @ self.u1 + self.b1
            i, f, c, o = np.split(z, 4, axis=-1)
            i = sigmoid(i)
            f = sigmoid(f)
            c = np.tanh(c)
            c1 = f * c1 + i * c
            o = sigmoid(o)
            h1 = o * np.tanh(c1)
            out1[:, t, :] = h1

        # Layer 2: LSTM (units=50, return_sequences=False)
        h2 = np.zeros((batch_size, 50), dtype=np.float32)
        c2 = np.zeros((batch_size, 50), dtype=np.float32)
        for t in range(seq_len):
            xt = out1[:, t, :]
            z = xt @ self.w2 + h2 @ self.u2 + self.b2
            i, f, c, o = np.split(z, 4, axis=-1)
            i = sigmoid(i)
            f = sigmoid(f)
            c = np.tanh(c)
            c2 = f * c2 + i * c
            o = sigmoid(o)
            h2 = o * np.tanh(c2)

        # Layer 3: Dense (units=1, linear)
        out = h2 @ self.wd + self.bd
        return out

# Load models and scalers
keras_model_path = os.path.join(BASE_DIR, 'lstm_forex_model.keras')
xgb_model_path = os.path.join(BASE_DIR, 'xgb_forex_model.json')
scaler_x_path = os.path.join(BASE_DIR, 'feature_scaler.pkl')
scaler_y_path = os.path.join(BASE_DIR, 'target_scaler.pkl')

try:
    from tensorflow.keras.models import load_model
    lstm_model = load_model(keras_model_path)
    print("Loaded LSTM via tensorflow.keras")
except Exception:
    lstm_model = KerasLSTMPredictor(keras_model_path)
    print("Loaded LSTM via direct weights forward pass (Python 3.13 compatibility)")

xgb_model = xgb.XGBRegressor()
xgb_model.load_model(xgb_model_path)
scaler_x = joblib.load(scaler_x_path)
scaler_y = joblib.load(scaler_y_path)
print("Forex models and scalers loaded successfully.")

def calculate_rsi(series, window=14):
    delta = series.diff(1)
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.ewm(com=window - 1, min_periods=window).mean()
    avg_loss = loss.ewm(com=window - 1, min_periods=window).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "forex_engine",
        "supported_pairs": ["USD/INR", "INR=X"],
        "horizon_business_days": 20
    }), 200

@app.route('/predict', methods=['GET', 'POST'])
def get_forecast():
    try:
        # Check requested currency pair
        requested_pair = request.args.get('currency_pair') or request.args.get('ticker') or 'INR=X'
        if request.is_json and request.get_json():
            data = request.get_json()
            requested_pair = data.get('currencyPair') or data.get('currency_pair') or requested_pair

        clean_pair = requested_pair.upper().strip()
        if clean_pair not in ['INR=X', 'USD/INR', 'USDINR']:
            return jsonify({
                "status": "error",
                "message": f"Unsupported currency pair: {requested_pair}. The Forex model currently only supports USD/INR (INR=X). Please select USD/INR."
            }), 400

        ticker = "INR=X"
        df_live = yf.download(ticker, period="6mo", interval="1d")

        if isinstance(df_live.columns, pd.MultiIndex):
            df_live.columns = df_live.columns.get_level_values(0)

        df_live = df_live[['Close']].copy()
        df_live.columns = ['Price']
        df_live = df_live.dropna()

        df_live['Return'] = df_live['Price'].diff()
        df_live['RSI'] = calculate_rsi(df_live['Price'])
        df_live['SMA_20'] = df_live['Price'].rolling(window=20).mean()
        df_live['SMA_50'] = df_live['Price'].rolling(window=50).mean()
        df_live = df_live.dropna()

        feature_cols = ['Price', 'Return', 'RSI', 'SMA_20', 'SMA_50']
        look_back = 60

        X_scaled_live = scaler_x.transform(df_live[feature_cols].values)
        current_sequence = X_scaled_live[-look_back:].copy()

        last_known_price = float(df_live['Price'].iloc[-1])
        forecast_steps = 20
        future_predictions = []

        for step in range(forecast_steps):
            seq_input = current_sequence.reshape(1, look_back, 5)
            lstm_pred_step = lstm_model.predict(seq_input, verbose=0)

            last_step_features = seq_input[:, -1, :]
            xgb_input = np.hstack([last_step_features, lstm_pred_step])

            pred_scaled_ret = xgb_model.predict(xgb_input)
            pred_real_ret = scaler_y.inverse_transform(pred_scaled_ret.reshape(-1, 1))[0][0]

            projected_price = last_known_price + pred_real_ret
            future_predictions.append(float(projected_price))

            historical_prices_with_new = list(df_live['Price'].iloc[-120:].values) + future_predictions
            new_prices_series = pd.Series(historical_prices_with_new)

            delta = new_prices_series.diff(1)
            gain = delta.where(delta > 0, 0)
            loss = -delta.where(delta < 0, 0)
            avg_gain = gain.ewm(com=13, min_periods=14).mean()
            avg_loss = loss.ewm(com=13, min_periods=14).mean()
            rs = avg_gain / avg_loss
            new_rsi = (100 - (100 / (1 + rs))).iloc[-1]
            if np.isnan(new_rsi):
                new_rsi = 50.0

            new_sma20 = new_prices_series.rolling(window=20).mean().iloc[-1]
            new_sma50 = new_prices_series.rolling(window=50).mean().iloc[-1]

            raw_feature_vector = np.array([[projected_price, pred_real_ret, new_rsi, new_sma20, new_sma50]])
            scaled_feature_vector = scaler_x.transform(raw_feature_vector)

            current_sequence = np.vstack([current_sequence[1:], scaled_feature_vector[0]])
            last_known_price = projected_price

        forecast_dates = pd.date_range(start=df_live.index[-1] + pd.Timedelta(days=1), periods=forecast_steps, freq='B')
        forecast_list = [
            {"date": date.strftime('%Y-%m-%d'), "predicted_price": round(price, 4)}
            for date, price in zip(forecast_dates, future_predictions)
        ]

        current_price = round(float(df_live['Price'].iloc[-1]), 4)
        avg_forecast = round(float(np.mean(future_predictions)), 4)
        min_forecast = round(float(np.min(future_predictions)), 4)
        max_forecast = round(float(np.max(future_predictions)), 4)
        end_forecast = round(float(future_predictions[-1]), 4)
        change_pct = round(((end_forecast - current_price) / current_price) * 100, 2)

        return jsonify({
            "status": "success",
            "currency_pair": "USD/INR",
            "ticker": ticker,
            "current_price": current_price,
            "metrics": {
                "average_forecast": avg_forecast,
                "min_forecast": min_forecast,
                "max_forecast": max_forecast,
                "projected_change_percent": change_pct,
                "trend": "BULLISH" if change_pct > 0.5 else ("BEARISH" if change_pct < -0.5 else "NEUTRAL")
            },
            "forecast": forecast_list,
            "disclaimer": "This currency forecast is generated by an LSTM-XGBoost machine learning model based on historical rates and technical indicators. It is provided for decision support only and does not constitute a guaranteed exchange rate or financial quotation."
        })

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5002))
    print(f"Starting Forex Engine on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
