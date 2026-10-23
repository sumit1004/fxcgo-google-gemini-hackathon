import os
import sys
from datetime import datetime, timedelta
import requests
import pandas as pd
import networkx as nx
import searoute as sr
import numpy as np
import xgboost as xgb
import yfinance as yf
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

print("Initializing AI Logistics Engine...")

# 1. LOAD PRE-TRAINED MODELS
congestion_model_path = os.path.join(BASE_DIR, "xgboost_congestion_model.json")
freight_model_path = os.path.join(BASE_DIR, "xgboost_freight_model.json")

model_congestion = xgb.XGBRegressor()
model_congestion.load_model(congestion_model_path)

model_freight = xgb.XGBRegressor()
model_freight.load_model(freight_model_path)

# 2. BUILD THE BASE GRAPH
ports = {
    "Nhava Sheva": {"coords": [72.9463, 18.9497], "id": 1, "country": "India"},
    "Mundra": {"coords": [69.7061, 22.7380], "id": 2, "country": "India"},
    "Chennai": {"coords": [80.3013, 13.0844], "id": 3, "country": "India"},
    "Colombo": {"coords": [79.8456, 6.9497], "id": 4, "country": "Sri Lanka"},
    "Singapore": {"coords": [103.7667, 1.2721], "id": 5, "country": "Singapore"},
    "Fremantle": {"coords": [115.7444, -32.0534], "id": 6, "country": "Australia"},
    "Melbourne": {"coords": [144.9126, -37.8409], "id": 7, "country": "Australia"},
    "Sydney": {"coords": [151.2127, -33.8568], "id": 8, "country": "Australia"}
}

edges = [
    ("Nhava Sheva", "Colombo"), ("Mundra", "Colombo"), ("Chennai", "Colombo"),
    ("Colombo", "Singapore"), ("Colombo", "Fremantle"), ("Singapore", "Fremantle"),
    ("Singapore", "Melbourne"), ("Fremantle", "Melbourne"), ("Melbourne", "Sydney")
]

route_graph = nx.Graph()

try:
    fuel_price = yf.download("BZ=F", period="1d", progress=False)['Close'].iloc[-1].item()
except Exception:
    fuel_price = 80.0

for start, end in edges:
    origin, dest = ports[start]["coords"], ports[end]["coords"]
    route_data = sr.searoute(origin, dest, units="naut")
    route_graph.add_edge(start, end, distance=route_data['properties']['length'], geojson=route_data)

print(f"Logistics Engine initialized with {len(ports)} ports and {len(edges)} maritime shipping lanes.")

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "logistics_engine",
        "supported_ports": list(ports.keys()),
        "port_count": len(ports)
    }), 200

@app.route('/ports', methods=['GET'])
def get_supported_ports():
    return jsonify({
        "status": "success",
        "ports": [
            {
                "name": name,
                "country": info.get("country", "Global"),
                "coordinates": {"longitude": info["coords"][0], "latitude": info["coords"][1]},
                "id": info["id"]
            }
            for name, info in ports.items()
        ]
    }), 200

# 3. DEFINE THE OPTIMIZE ENDPOINT
@app.route('/optimize', methods=['GET', 'POST'])
def optimize_route():
    if request.method == 'POST' and request.is_json:
        data = request.get_json() or {}
        start_port = data.get('origin') or data.get('originPort')
        end_port = data.get('destination') or data.get('destinationPort')
    else:
        start_port = request.args.get('origin')
        end_port = request.args.get('destination')

    if not start_port or not end_port:
        return jsonify({"error": "Both origin and destination ports are required."}), 400

    if start_port not in ports or end_port not in ports:
        return jsonify({
            "error": f"Invalid port selected. Origin '{start_port}' or Destination '{end_port}' is not in supported maritime corridor ports.",
            "supported_ports": list(ports.keys())
        }), 400

    if start_port == end_port:
        return jsonify({"error": "Origin and destination ports cannot be the same."}), 400

    weather_data = {}
    forecast_dates = []
    weather_source_is_live = True

    for port, info in ports.items():
        lon, lat = info["coords"]
        wave_url = f"https://marine-api.open-meteo.com/v1/marine?latitude={lat}&longitude={lon}&daily=wave_height_max&timezone=auto"
        wind_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=wind_speed_10m_max&timezone=auto"

        try:
            wave_resp = requests.get(wave_url, timeout=4).json()
            wind_resp = requests.get(wind_url, timeout=4).json()
            weather_data[port] = {
                "waves": wave_resp["daily"]["wave_height_max"],
                "winds": wind_resp["daily"]["wind_speed_10m_max"],
                "live": True
            }
            if not forecast_dates:
                forecast_dates = wave_resp["daily"]["time"]
        except Exception:
            weather_source_is_live = False
            weather_data[port] = {"waves": [1.5]*7, "winds": [15.0]*7, "live": False}
            if not forecast_dates:
                forecast_dates = [(datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]

    daily_results = []
    for day_idx in range(7):
        for u, v, data in route_graph.edges(data=True):
            dist = data['distance']
            wave_height = weather_data[v]["waves"][day_idx]
            if wave_height is None:
                wave_height = 1.5

            pred_delay = model_congestion.predict(pd.DataFrame([[ports[v]["id"], np.random.randint(5, 15), wave_height]], columns=['port_id', 'ships_waiting', 'wave_height_m']))[0]
            pred_freight = model_freight.predict(pd.DataFrame([[dist, fuel_price, 1.1, pred_delay]], columns=['distance_nm', 'fuel_price_usd', 'container_imbalance', 'delay_days']))[0]

            route_graph[u][v]['temp_cost'] = (1.0 * pred_freight) + (1000 * pred_delay) + (500 * (dist / (15 * 24)))
            route_graph[u][v]['temp_freight'] = pred_freight
            route_graph[u][v]['temp_delay'] = pred_delay

        try:
            path = nx.shortest_path(route_graph, source=start_port, target=end_port, weight="temp_cost")
            daily_results.append({
                "date": forecast_dates[day_idx],
                "freight_usd": round(float(sum(route_graph[path[i]][path[i+1]]['temp_freight'] for i in range(len(path)-1))), 2),
                "congestion_days": round(float(sum(route_graph[path[i]][path[i+1]]['temp_delay'] for i in range(len(path)-1))), 2),
                "origin_wave_m": round(float(weather_data[start_port]["waves"][day_idx] or 1.5), 2),
                "origin_wind_kmh": round(float(weather_data[start_port]["winds"][day_idx] or 15.0), 2),
                "score": float(sum(route_graph[path[i]][path[i+1]]['temp_cost'] for i in range(len(path)-1)))
            })
        except nx.NetworkXNoPath:
            continue

    if not daily_results:
        return jsonify({"error": "No maritime path found between the selected ports."}), 404

    best_day = min(daily_results, key=lambda x: x['score'])
    best_day_idx = forecast_dates.index(best_day['date'])

    for u, v, data in route_graph.edges(data=True):
        wave = weather_data[v]["waves"][best_day_idx] or 1.5
        route_graph[u][v]['predicted_delay'] = model_congestion.predict(pd.DataFrame([[ports[v]["id"], np.random.randint(5, 15), wave]], columns=['port_id', 'ships_waiting', 'wave_height_m']))[0]

    evaluated_paths = []
    for path in nx.all_simple_paths(route_graph, source=start_port, target=end_port):
        t_dist = sum(route_graph[path[i]][path[i+1]]['distance'] for i in range(len(path)-1))
        t_delay = sum(route_graph[path[i]][path[i+1]]['predicted_delay'] for i in range(len(path)-1))
        evaluated_paths.append({
            "route": path,
            "dist": float(t_dist),
            "delay": float(t_delay),
            "score": t_dist + (t_delay * 400)
        })

    evaluated_paths.sort(key=lambda x: x['score'])
    best_route = evaluated_paths[0]
    worst_route = evaluated_paths[-1] if len(evaluated_paths) > 1 else best_route

    dist_savings = ((worst_route['dist'] - best_route['dist']) / worst_route['dist']) * 100 if best_route != worst_route else 0.0
    delay_savings = ((worst_route['delay'] - best_route['delay']) / worst_route['delay']) * 100 if best_route != worst_route else 0.0

    def extract_coords(path_nodes):
        coords_list = []
        for i in range(len(path_nodes) - 1):
            u, v = path_nodes[i], path_nodes[i+1]
            raw_coords = route_graph[u][v]['geojson']['geometry']['coordinates']
            coords_list.append({
                "segment": f"{u} to {v}",
                "distance_nm": round(float(route_graph[u][v]['distance']), 2),
                "points": [[lat, lon] for lon, lat in raw_coords]
            })
        return coords_list

    return jsonify({
        "status": "success",
        "route_request": {"origin": start_port, "destination": end_port},
        "forecast_comparison": daily_results,
        "recommendation": {
            "optimal_departure_date": best_day['date'],
            "optimal_route": best_route['route'],
            "alternative_route": worst_route['route'] if best_route != worst_route else None,
            "optimal_distance_nm": round(best_route['dist'], 2),
            "estimated_freight_usd": best_day['freight_usd'],
            "estimated_delay_days": best_day['congestion_days'],
            "marine_weather": {
                "departure_wave_m": best_day['origin_wave_m'],
                "departure_wind_kmh": best_day['origin_wind_kmh'],
                "is_live_data": weather_source_is_live,
                "source": "Open-Meteo Marine API (Live)" if weather_source_is_live else "Open-Meteo Marine API (Fallback Estimate)"
            },
            "optimization_gains": {
                "distance_efficiency_percent": round(dist_savings, 1),
                "congestion_avoided_percent": round(delay_savings, 1)
            },
            "map_data": {
                "optimal_path_segments": extract_coords(best_route['route']),
                "alternative_path_segments": extract_coords(worst_route['route']) if best_route != worst_route else []
            },
            "disclaimer": "Freight fares and port delay estimates are calculated by pre-trained XGBoost models using sea-route nautical charts, current fuel benchmarks, and marine weather forecasts. Values are estimates for planning and decision support, not binding carrier booking quotations."
        }
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    print(f"Starting Logistics Engine on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)