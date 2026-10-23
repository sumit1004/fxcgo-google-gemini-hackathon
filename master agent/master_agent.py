import subprocess
import time
import requests
import sys
import os

# Safe UTF-8 console output for Windows
try:
    if sys.stdout.encoding != 'utf-8':
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if sys.stderr.encoding != 'utf-8':
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Microservices configuration
services = {
    "Forex Engine": {
        "file": "forex_app.py",
        "port": 5002,
        "folder_path": os.path.join(BASE_DIR, "forex_service"),
        "process": None
    },
    "Route Engine": {
        "file": "route_app.py",
        "port": 5001,
        "folder_path": os.path.join(BASE_DIR, "route_service"),
        "process": None
    }
}

def start_service(name, info):
    print(f"[*] Initiating {name} on port {info['port']}...")
    target_directory = info["folder_path"]
    env = os.environ.copy()
    env["PORT"] = str(info["port"])
    env["PYTHONIOENCODING"] = "utf-8"
    
    process = subprocess.Popen(
        [sys.executable, info["file"]],
        cwd=target_directory,
        env=env
    )
    return process

def monitor_services():
    while True:
        for name, info in services.items():
            url = f"http://127.0.0.1:{info['port']}/health"
            process = info["process"]
            
            try:
                response = requests.get(url, timeout=3)
                if response.status_code == 200:
                    print(f"   [+] {name}: Online and healthy (Port {info['port']}).")
                else:
                    print(f"   [!] {name}: Status {response.status_code}")
            except requests.exceptions.RequestException:
                print(f"   [!] {name}: Waiting or unresponsive...")
                if process and process.poll() is not None:
                    print(f"   [*] Restarting {name}...")
                    services[name]["process"] = start_service(name, info)
                    
        print("-" * 50)
        time.sleep(15)

if __name__ == "__main__":
    print("FXCGO Master Agent Orchestrator Starting...\n" + "="*50)
    
    for name, info in services.items():
        services[name]["process"] = start_service(name, info)
        
    time.sleep(4)
    print("="*50)
    
    try:
        monitor_services()
    except KeyboardInterrupt:
        print("\nShutting down AI microservices...")
        for name, info in services.items():
            if info["process"]:
                info["process"].terminate()