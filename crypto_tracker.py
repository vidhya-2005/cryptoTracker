import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

URL = "https://coinmarketcap.com/"
DRIVER = None  # Keeps browser open in memory

def setup_driver():
    """Starts Chrome once and keeps it running."""
    print("🔌 Starting Chrome Driver (First Run Only)...")
    options = Options()
    options.add_argument("--headless=new") 
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--log-level=3")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)

def get_live_data(limit=15):
    global DRIVER
    data = []

    try:
        # 1. Initialize Driver only if it doesn't exist
        if DRIVER is None:
            DRIVER = setup_driver()

        # 2. Go to URL or Refresh
        if DRIVER.current_url != URL:
            print(f"🔗 Connecting to {URL}...")
            DRIVER.get(URL)
            WebDriverWait(DRIVER, 20).until(EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr")))
        else:
            # Refreshing is faster than reloading
            # print("🔄 Refreshing data...") 
            DRIVER.refresh() 
            time.sleep(1.5)

        # 3. Fast Scroll to trigger lazy load
        DRIVER.execute_script("window.scrollTo(0, 500);")
        time.sleep(1)

        # 4. Scrape Data
        rows = DRIVER.find_elements(By.CSS_SELECTOR, "table tbody tr")
        
        for row in rows[:limit]:
            cols = row.find_elements(By.TAG_NAME, "td")
            if len(cols) < 8: continue

            try:
                name_text = cols[2].text
                if "Index" in name_text: continue 

                name = name_text.split('\n')[0]
                price_str = cols[3].text
                change = cols[4].text
                mcap = cols[7].text.split('\n')[-1]

                price_clean = float(price_str.replace('$', '').replace(',', ''))

                data.append({
                    "timestamp": datetime.now().isoformat(),
                    "name": name,
                    "price_clean": price_clean,
                    "change_24h": change,
                    "market_cap": mcap
                })
            except:
                continue
                
        print(f"✅ Scraped {len(data)} coins instantly.")
        return data

    except Exception as e:
        print(f"❌ Scraper Error: {e}")
        # Reset driver if it crashes
        if DRIVER:
            try: DRIVER.quit()
            except: pass
        DRIVER = None 
        return []