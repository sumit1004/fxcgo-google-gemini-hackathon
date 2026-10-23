import subprocess
import time
import requests
import sys

def start_server():
    print("🤖 Agent: Initiating currency forecasting server...")
    # Launch app.py as a background subprocess
    # sys.executable ensures it uses the exact same Python environment
    process = subprocess.Popen([sys.executable, "app.py"])
    return process

def monitor_server(process, port=5000):
    url = f"http://127.0.0.1:{port}/health"
    
    while True:
        try:
            # Agent pings the server to check if it is responding
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                print("   ✅ Agent Check: Server is running optimally.")
        except requests.exceptions.RequestException:
            print("   🚨 Agent Alert: Server is unresponsive or offline!")
            
            # Check if the process actually crashed
            if process.poll() is not None:
                print("   🔄 Agent Action: Restarting server...")
                process = start_server()
                
        # Wait 10 seconds before checking again
        time.sleep(10)

if __name__ == "__main__":
    print("🛡️ Server Management Agent Started")
    server_process = start_server()
    
    # Give the server a few seconds to boot up before the first check
    time.sleep(5) 
    
    try:
        monitor_server(server_process)
    except KeyboardInterrupt:
        print("\n🛑 Agent shutting down. Terminating server...")
        server_process.terminate()