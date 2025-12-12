let myChart = null;
const USD_TO_INR = 87.50; 
let useINR = false; 
let selectedGraphCoin = "Bitcoin"; 
let myPortfolio = []; 

function toggleCurrency() {
    useINR = !useINR;
    document.getElementById('currency-btn').innerText = useINR ? "Switch to USD ($)" : "Switch to INR (₹)";
    updateDashboard(); 
}

function addAsset() {
    const dropdown = document.getElementById('asset-dropdown');
    const input = document.getElementById('asset-qty');
    const coinName = dropdown.value;
    const qty = parseFloat(input.value);

    if (qty <= 0 || isNaN(qty)) {
        alert("Enter positive quantity"); return;
    }
    const existing = myPortfolio.find(p => p.name === coinName);
    if (existing) existing.qty += qty;
    else myPortfolio.push({ name: coinName, qty: qty });

    input.value = '';
    renderHoldingsList();
    updateDashboard();
}

function removeAsset(name) {
    myPortfolio = myPortfolio.filter(p => p.name !== name);
    renderHoldingsList();
    updateDashboard();
}

function renderHoldingsList() {
    const container = document.getElementById('holdings-list');
    container.innerHTML = '<label style="margin-bottom:10px; display:block; color:#888;">Your Holdings:</label>';
    if (myPortfolio.length === 0) container.innerHTML += '<p style="font-size:0.8em; color:#555;">No assets added yet.</p>';

    myPortfolio.forEach(item => {
        const div = document.createElement('div');
        div.style.background = '#252525';
        div.style.padding = '10px';
        div.style.marginBottom = '8px';
        div.style.borderRadius = '5px';
        div.style.display = 'flex';
        div.style.justifyContent = 'space-between';
        div.innerHTML = `<div><strong>${item.name}</strong><br><span style="color:#aaa; font-size:0.8em;">Qty: ${item.qty}</span></div><button onclick="removeAsset('${item.name}')" style="background:#ff4d4d; border:none; color:white; padding:2px 8px; height:25px; margin:0;">X</button>`;
        container.appendChild(div);
    });
}

async function updateDashboard() {
    try {
        const res = await fetch('/api/data');
        const data = await res.json();
        if (data.status === 'loading') {
            document.getElementById('status').innerText = "⏳ Scraper starting..."; return;
        }
        document.getElementById('status').innerText = "✅ Live Data Active";
        
        populateDropdowns(data.current);
        renderTable(data.current);
        calculateNetWorth(data.current);
        renderChart(data.history);
    } catch (err) { console.error(err); }
}

function populateDropdowns(coins) {
    const assetDrop = document.getElementById('asset-dropdown');
    const graphDrop = document.getElementById('coin-selector');

    if (assetDrop.children.length <= 1) {
        assetDrop.innerHTML = ''; graphDrop.innerHTML = '';
        coins.forEach(coin => {
            if(coin.name.includes("Index")) return;
            const opt1 = document.createElement('option'); opt1.value = coin.name; opt1.innerText = coin.name; assetDrop.appendChild(opt1);
            const opt2 = document.createElement('option'); opt2.value = coin.name; opt2.innerText = coin.name; if (coin.name === selectedGraphCoin) opt2.selected = true; graphDrop.appendChild(opt2);
        });
        graphDrop.addEventListener('change', (e) => { selectedGraphCoin = e.target.value; updateDashboard(); });
    }
}

function calculateNetWorth(coins) {
    let total = 0;
    myPortfolio.forEach(item => {
        const liveCoin = coins.find(c => c.name === item.name);
        if (liveCoin) total += item.qty * liveCoin.price_clean;
    });
    document.getElementById('net-worth').innerText = formatMoney(total);
}

function formatMoney(amount) {
    return (useINR ? '₹' : '$') + (amount * (useINR ? USD_TO_INR : 1)).toLocaleString(useINR ? 'en-IN' : 'en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function renderTable(coins) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';
    coins.forEach(coin => {
        if(coin.name.includes("Index")) return;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><b>${coin.name}</b></td><td>${formatMoney(coin.price_clean)}</td><td class="${coin.change_24h.includes('-')?'red':'green'}">${coin.change_24h}</td><td>${coin.market_cap}</td>`;
        tbody.appendChild(tr);
    });
}

function renderChart(history) {
    const ctx = document.getElementById('priceChart').getContext('2d');
    const coinData = history.filter(h => h.name === selectedGraphCoin);
    if (coinData.length === 0) return;

    const labels = coinData.map(h => h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : "");
    const prices = coinData.map(h => useINR ? h.price * USD_TO_INR : h.price);

    if (myChart) {
        myChart.data.labels = labels;
        myChart.data.datasets[0].label = `${selectedGraphCoin} Price`;
        myChart.data.datasets[0].data = prices;
        myChart.update('none');
    } else {
        myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${selectedGraphCoin} Price`,
                    data: prices,
                    borderColor: '#00d2ff',
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    fill: false,
                    tension: 0.1,
                    pointStyle: 'circle' // Fixes the rectangle legend
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: { legend: { labels: { color: 'white', usePointStyle: true, boxWidth: 6 } } },
                scales: { x: { grid: { color: '#333' } }, y: { grid: { color: '#333' } } },
                animation: false
            }
        });
    }
}

document.getElementById('currency-btn').addEventListener('click', toggleCurrency);
renderHoldingsList(); 
setInterval(updateDashboard, 2000);
updateDashboard();