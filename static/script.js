// Initialize AOS animations
document.addEventListener("DOMContentLoaded", () => {
  // Initialize AOS (Animate On Scroll)
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: true,
      offset: 100
    });
  }

  // Smooth scroll for anchor links (excluding disabled report link)
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      // Skip if report link is disabled
      if (this.id === 'reportNavLink' && this.style.pointerEvents === 'none') {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
        // Update active nav link
        document.querySelectorAll('.navbar-nav .nav-link').forEach(link => {
          link.classList.remove('active');
        });
        this.classList.add('active');
      }
    });
  });

  // Update active nav link on scroll
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
  
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (pageYOffset >= sectionTop - 200) {
        current = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // Set up report link click handler
  const reportNavLink = document.getElementById('reportNavLink');
  if (reportNavLink) {
    reportNavLink.addEventListener('click', function(e) {
      e.preventDefault();
      if (currentPredictionData) {
        generateReport();
      } else {
        alert('Please make a prediction first to generate a report.');
      }
    });
  }

  const form = document.getElementById("predictionForm")

  const today = new Date()
  document.getElementById("Date").value = today.getDate()
  document.getElementById("Month").value = today.getMonth() + 1
  document.getElementById("Year").value = today.getFullYear()
  document.getElementById("Days").value = today.getDay() || 7
  document.getElementById("Holidays_Count").value = 0
  document.getElementById("PM2.5").value = 85
  document.getElementById("PM10").value = 140
  document.getElementById("NO2").value = 45
  document.getElementById("SO2").value = 25
  document.getElementById("CO").value = 1.2
  document.getElementById("Ozone").value = 50

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    // Validate form
    if (!form.checkValidity()) {
      form.classList.add("was-validated")
      return
    }

    const submitBtn = form.querySelector('button[type="submit"]')
    submitBtn.disabled = true
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Predicting...'

    try {
      await predictAQI()
    } catch (error) {
      console.error("Prediction error:", error)
      showError("An error occurred during prediction. Please try again.")
    } finally {
      submitBtn.disabled = false
      submitBtn.innerHTML = "Predict AQI"
    }
  })

  // Run Test button: send a sample prediction and show raw response
  const runBtn = document.getElementById('runTestBtn')
  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      runBtn.disabled = true
      runBtn.textContent = 'Running...'
      try {
        const sample = new FormData()
        sample.set('Date', document.getElementById('Date').value || '15')
        sample.set('Month', document.getElementById('Month').value || '1')
        sample.set('Year', document.getElementById('Year').value || '2025')
        sample.set('Holidays_Count', document.getElementById('Holidays_Count').value || '0')
        sample.set('Days', document.getElementById('Days').value || '1')
        sample.set('PM2.5', document.getElementById('PM2.5').value || '85')
        sample.set('PM10', document.getElementById('PM10').value || '140')
        sample.set('NO2', document.getElementById('NO2').value || '45')
        sample.set('SO2', document.getElementById('SO2').value || '25')
        sample.set('CO', document.getElementById('CO').value || '1.2')
        sample.set('Ozone', document.getElementById('Ozone').value || '50')

        console.log('[v0] Run test payload:', Object.fromEntries(sample.entries()))
        const resp = await fetch('/predict', { method: 'POST', body: sample })
        const text = await resp.text()
        let parsed = null
        try { parsed = JSON.parse(text) } catch (e) { parsed = text }
        const dbg = document.getElementById('debugResponse')
        if (dbg) { dbg.style.display = 'block'; dbg.textContent = typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2) }
        if (resp.ok && typeof parsed === 'object' && parsed.success) {
          if (typeof displayResult === 'function') displayResult(parsed)
        } else {
          console.warn('[v0] Run test non-OK response', resp.status, parsed)
        }
      } catch (err) {
        console.error('[v0] Run test error', err)
        const dbg = document.getElementById('debugResponse')
        if (dbg) { dbg.style.display = 'block'; dbg.textContent = String(err) }
      } finally {
        runBtn.disabled = false
        runBtn.textContent = 'Run Test (sample)'
      }
    })
  }

  initCharts()
})

function showError(message) {
  const resultCard = document.getElementById("resultCard")
  const categoryDescription = document.getElementById("categoryDescription")

  categoryDescription.className = "alert alert-danger"
  categoryDescription.innerHTML = `<strong>Error:</strong> ${message}`
  resultCard.style.display = "block"
  resultCard.scrollIntoView({ behavior: "smooth" })
}

function initCharts() {
  // Home page: render pollutant chart from user input values (not monthly AQI)
  renderInputPollutantChart()

  // Update pollutant chart live when pollutant inputs change
  const pollutantIds = ["PM2.5", "PM10", "NO2", "SO2", "CO", "Ozone"]
  pollutantIds.forEach((id) => {
    const el = document.getElementById(id)
    if (el) el.addEventListener('input', renderInputPollutantChart)
  })
}

// Declare the functions that were previously undeclared
async function predictAQI() {
  const form = document.getElementById("predictionForm")
  const formData = new FormData(form)

  try {
      // Log that we're submitting and show form payload
      console.log('[v0] Submitting prediction form')
      const payload = {}
      for (const [k, v] of formData.entries()) payload[k] = v
      console.log('[v0] Form payload:', payload)

      const response = await fetch("/predict", {
        method: "POST",
        body: formData,
      })

      // Log response status for debugging
      console.log('[v0] /predict response status:', response.status, 'ok=', response.ok)

      let result = null
      try {
        result = await response.json()
      } catch (parseErr) {
        const text = await response.text()
        console.error('[v0] Failed to parse /predict response as JSON:', parseErr, 'raw:', text)
        showError('Invalid response from server. See console for details.')
        return
      }

      console.log('[v0] /predict JSON result:', result)

      // Show raw response in debug panel for troubleshooting
      const dbg = document.getElementById('debugResponse')
      if (dbg) {
        dbg.style.display = 'block'
        dbg.textContent = JSON.stringify(result, null, 2)
      }

      if (!result.success) {
        showError(result.error || "Prediction failed")
        return
      }

      // Prefer centralized UI helper if available
      if (typeof displayResult === 'function') {
        try {
          displayResult(result)
          return
        } catch (e) {
          console.error('[v0] displayResult failed:', e)
        }
      }

      // Fallback UI update
      const resultCard = document.getElementById("resultCard")
      const aqiDisplay = document.getElementById("aqiDisplay")
      const aqiValue = document.getElementById("aqiValue")
      const categoryLabel = document.getElementById("categoryLabel")
      const categoryRange = document.getElementById("categoryRange")
      const categoryDescription = document.getElementById("categoryDescription")

      aqiValue.textContent = result.aqi
      if (result.color) aqiDisplay.style.backgroundColor = result.color
      categoryLabel.textContent = result.category
      categoryRange.textContent = `AQI Range: ${result.range}`
      categoryDescription.className = "alert alert-info"
      categoryDescription.innerHTML = `
        <strong>${result.category}</strong><br>
        AQI: ${result.aqi} (${result.range})
      `

      resultCard.style.display = "block"
      resultCard.scrollIntoView({ behavior: "smooth" })

      // Enable report link and store prediction data
      enableReportLink(result)
  } catch (error) {
    console.error("[v0] Fetch error:", error)
    showError("Network error: " + error.message)
  }
}

// Report functionality
let currentPredictionData = null

function enableReportLink(predictionData) {
  // Store prediction data for report generation
  currentPredictionData = predictionData
  
  // Enable report link in navbar
  const reportNavLink = document.getElementById('reportNavLink')
  if (reportNavLink) {
    reportNavLink.style.display = 'block'
    reportNavLink.style.opacity = '1'
    reportNavLink.style.pointerEvents = 'auto'
    reportNavLink.classList.add('active')
  }
}

function generateReport() {
  if (!currentPredictionData) {
    alert('Please make a prediction first to generate a report.')
    return
  }

  const reportSection = document.getElementById('report')
  if (!reportSection) return

  // Update report AQI display
  const reportAqiValue = document.getElementById('reportAqiValue')
  const reportCategoryLabel = document.getElementById('reportCategoryLabel')
  const reportCategoryRange = document.getElementById('reportCategoryRange')
  const reportHealthImplications = document.getElementById('reportHealthImplications')
  const reportSafetyMeasures = document.getElementById('reportSafetyMeasures')
  const reportDate = document.getElementById('reportDate')
  const reportTime = document.getElementById('reportTime')

  if (reportAqiValue) {
    reportAqiValue.textContent = currentPredictionData.aqi
    reportAqiValue.style.color = currentPredictionData.color || '#2563eb'
  }

  if (reportCategoryLabel) {
    reportCategoryLabel.textContent = currentPredictionData.category
    reportCategoryLabel.style.color = currentPredictionData.color || '#2563eb'
  }

  if (reportCategoryRange) {
    reportCategoryRange.textContent = `AQI Range: ${currentPredictionData.range}`
  }

  if (reportHealthImplications) {
    reportHealthImplications.textContent = currentPredictionData.health_implications || 'No data available'
  }

  if (reportSafetyMeasures) {
    reportSafetyMeasures.textContent = currentPredictionData.safety_measures || 'No data available'
  }

  // Set current date and time
  const now = new Date()
  if (reportDate) {
    reportDate.textContent = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
  if (reportTime) {
    reportTime.textContent = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  // Update report section background color based on category
  const reportAqiDisplay = document.getElementById('reportAqiDisplay')
  if (reportAqiDisplay && currentPredictionData.color) {
    reportAqiDisplay.style.borderColor = currentPredictionData.color
  }

  // Show report section
  reportSection.style.display = 'block'
  reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function downloadReport() {
  if (!currentPredictionData) {
    alert('No report data available to download.')
    return
  }

  const reportContent = `
AIR QUALITY REPORT
Generated: ${new Date().toLocaleString()}

AQI VALUE: ${currentPredictionData.aqi}
CATEGORY: ${currentPredictionData.category}
AQI RANGE: ${currentPredictionData.range}

HEALTH IMPLICATIONS:
${currentPredictionData.health_implications || 'No data available'}

RECOMMENDED SAFETY MEASURES:
${currentPredictionData.safety_measures || 'No data available'}

---
Report generated by AirQuality AI
  `.trim()

  const blob = new Blob([reportContent], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `AQI_Report_${currentPredictionData.aqi}_${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
}

function closeReport() {
  const reportSection = document.getElementById('report')
  if (reportSection) {
    reportSection.style.display = 'none'
  }
}

// Home page: render a simple pollutant bar chart from current input values
let inputPollutantChart = null
function renderInputPollutantChart() {
  const labels = ["PM2.5", "PM10", "NO2", "SO2", "CO", "Ozone"]
  const values = labels.map((id) => {
    const el = document.getElementById(id)
    const v = el ? parseFloat(el.value) : 0
    return Number.isFinite(v) ? v : 0
  })

  const ctxEl = document.getElementById('pollutantChart')
  if (!ctxEl) return
  const ctx = ctxEl.getContext('2d')

  if (inputPollutantChart) {
    inputPollutantChart.data.labels = labels
    inputPollutantChart.data.datasets[0].data = values
    inputPollutantChart.update()
    return
  }

  inputPollutantChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Pollutant value',
          data: values,
          backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6b7280', '#8b5cf6'],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true },
      },
    },
  })
}
