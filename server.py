from flask import Flask, jsonify, render_template
from flask_cors import CORS
import threading
import time
import crypto_tracker

app = Flask(__name__)
CORS(app)

LATEST_DATA = []
HISTORY_DATA = []

def background_worker():
    """Runs forever in the background."""
    global LATEST_DATA, HISTORY_DATA
    while True:
        new_data = crypto_tracker.get_live_data(limit=15)
        if new_data:
            LATEST_DATA = new_data
            # Save history for chart
            for coin in new_data:
                HISTORY_DATA.append({
                    "timestamp": coin["timestamp"],
                    "name": coin["name"],
                    "price": coin["price_clean"]
                })
            # Limit history size
            if len(HISTORY_DATA) > 1000:
                HISTORY_DATA = HISTORY_DATA[-1000:]
                
        time.sleep(60) # Wait 60s before next scrape

# Start background thread
threading.Thread(target=background_worker, daemon=True).start()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    if not LATEST_DATA:
        return jsonify({"status": "loading"})
    return jsonify({
        "status": "success",
        "current": LATEST_DATA,
        "history": HISTORY_DATA
    })

if __name__ == '__main__':
    print("⚡ Server Running at http://127.0.0.1:5000")
    app.run(debug=True, port=5000, use_reloader=False)