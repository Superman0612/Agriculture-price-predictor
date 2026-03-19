let priceChart = null;

async function runPrediction() {
  const btn = document.getElementById('predict-btn');
  btn.classList.add('loading');
  btn.querySelector('.btn-text').textContent = 'Forecasting…';

  const payload = {
    commodity:  document.getElementById('commodity').value,
    district:   document.getElementById('district').value,
    market:     document.getElementById('market').value,
    state:      document.getElementById('state').value,
    variety:    document.getElementById('variety').value,
    grade:      document.getElementById('grade').value,
    min_price:  parseFloat(document.getElementById('min_price').value),
    max_price:  parseFloat(document.getElementById('max_price').value),
  };

  try {
    const res = await fetch('/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!data.success) throw new Error(data.error || 'Prediction failed');

    showResults(data);
    renderChart(data);

  } catch (err) {
    alert('Error: ' + err.message);
  } finally {
    btn.classList.remove('loading');
    btn.querySelector('.btn-text').textContent = 'Predict Price';
  }
}

function showResults(data) {
  const resultsSection = document.getElementById('results');
  const trendsSection  = document.getElementById('trends');

  resultsSection.classList.remove('hidden');
  trendsSection.classList.remove('hidden');

  document.getElementById('current-price').textContent = `₹ ${data.current_price.toFixed(2)} / Quintal`;
  document.getElementById('predicted-price').textContent = `₹ ${data.predicted_price.toFixed(2)} / Quintal`;

  const recCard = document.getElementById('recommendation-card');
  const recIcon = document.getElementById('rec-icon');
  const recText = document.getElementById('recommendation-text');
  const pctEl   = document.getElementById('pct-change');

  if (data.recommendation === 'Sell Now') {
    recCard.classList.add('sell-now');
    recIcon.textContent = '🔔';
    recText.textContent = 'Sell Now';
    pctEl.textContent = `Price expected to drop ${Math.abs(data.pct_change)}%`;
  } else {
    recCard.classList.remove('sell-now');
    recIcon.textContent = '⏳';
    recText.textContent = 'Wait Before Selling';
    pctEl.textContent = `Price may rise by ${Math.abs(data.pct_change)}%`;
  }

  document.querySelectorAll('.result-card').forEach(c => {
    c.style.animation = 'none';
    c.offsetHeight;
    c.style.animation = '';
  });

  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderChart(data) {
  document.getElementById('chart-title').textContent = data.commodity + ' — Price History';

  const ctx = document.getElementById('priceChart').getContext('2d');

  const gradientFill = ctx.createLinearGradient(0, 0, 0, 280);
  gradientFill.addColorStop(0, 'rgba(46,107,62,0.25)');
  gradientFill.addColorStop(1, 'rgba(46,107,62,0)');

  if (priceChart) priceChart.destroy();

  priceChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.historical.labels,
      datasets: [{
        label: `${data.commodity} Price (Rs./Quintal)`,
        data: data.historical.data,
        borderColor: '#2E6B3E',
        backgroundColor: gradientFill,
        borderWidth: 2.5,
        pointBackgroundColor: '#2E6B3E',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        tension: 0.4,
        fill: true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1B4332',
          titleFont: { family: 'DM Sans', size: 12 },
          bodyFont:  { family: 'DM Sans', size: 13, weight: '600' },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` ₹ ${ctx.parsed.y.toFixed(2)} / Quintal`,
          }
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'DM Sans', size: 12 }, color: '#5C3D1E' }
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(160,98,42,0.08)' },
          ticks: {
            font: { family: 'DM Sans', size: 12 },
            color: '#5C3D1E',
            callback: v => `₹ ${v}`,
          }
        }
      }
    }
  });
}

// validate min/max prices
document.addEventListener('DOMContentLoaded', () => {
  const minEl = document.getElementById('min_price');
  const maxEl = document.getElementById('max_price');

  minEl.addEventListener('change', () => {
    if (parseFloat(maxEl.value) <= parseFloat(minEl.value)) {
      maxEl.value = (parseFloat(minEl.value) * 1.2).toFixed(1);
    }
  });
});


// -----------------------------
// Commodity → Variety
// -----------------------------
document.getElementById("commodity").addEventListener("change", async function () {

  const commodity = this.value;

  const res = await fetch(`/get_varieties?commodity=${commodity}`);
  const varieties = await res.json();

  const varietySelect = document.getElementById("variety");

  varietySelect.innerHTML = "";

  varieties.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    varietySelect.appendChild(opt);
  });

});


// -----------------------------
// State → District
// -----------------------------
document.getElementById("state").addEventListener("change", async function () {

  const state = this.value;

  const res = await fetch(`/get_districts?state=${state}`);
  const districts = await res.json();

  const districtSelect = document.getElementById("district");
  const marketSelect = document.getElementById("market");

  districtSelect.innerHTML = "";
  marketSelect.innerHTML = "";

  districts.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d;
    districtSelect.appendChild(opt);
  });

});


// -----------------------------
// District → Market
// -----------------------------
document.getElementById("district").addEventListener("change", async function () {

  const district = this.value;

  const res = await fetch(`/get_markets?district=${district}`);
  const markets = await res.json();

  const marketSelect = document.getElementById("market");

  marketSelect.innerHTML = "";

  markets.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    marketSelect.appendChild(opt);
  });

});
