// visualization.js — browser-friendly Chart.js usage (no module imports)
let aqiChartInstance = null
let pollutantChartInstance = null

function createAQIChart(data) {
  const canvas = document.getElementById("aqiChart")
  if (!canvas) return
  const ctx = canvas.getContext("2d")

  if (aqiChartInstance) {
    aqiChartInstance.destroy()
  }

  aqiChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: data.map((d) => d.month),
      datasets: [
        {
          label: "AQI Level",
          data: data.map((d) => d.aqi),
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.1)",
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
          },
        },
        y: {
          beginAtZero: true,
          max: 500,
        },
      },
    },
  })
}

function createPollutantChart(data) {
  const canvas = document.getElementById("pollutantChart")
  if (!canvas) return
  const ctx = canvas.getContext("2d")

  if (pollutantChartInstance) {
    pollutantChartInstance.destroy()
  }

  pollutantChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: data.map((d) => d.month),
      datasets: [
        {
          label: "PM2.5",
          data: data.map((d) => d.pm25),
          backgroundColor: "#ef4444",
          borderRadius: 4,
          borderSkipped: false,
        },
        {
          label: "PM10",
          data: data.map((d) => d.pm10),
          backgroundColor: "#f59e0b",
          borderRadius: 4,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
    },
  })
}
