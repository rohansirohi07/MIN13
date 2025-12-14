// Display helper used by form script
function displayResult(data) {
  const resultCard = document.getElementById("resultCard")
  const aqiDisplay = document.getElementById("aqiDisplay")
  const categoryLabel = document.getElementById("categoryLabel")
  const categoryRange = document.getElementById("categoryRange")
  const categoryDescription = document.getElementById("categoryDescription")

  // Use gradient background if color provided
  if (data.color) {
    aqiDisplay.style.background = `linear-gradient(135deg, ${data.color}, ${adjustBrightness(data.color, -20)})`
  }

  document.getElementById("aqiValue").textContent = data.aqi
  categoryLabel.textContent = data.category
  categoryRange.textContent = `AQI Range: ${data.range}`

  const descriptions = {
    Good: "Air quality is satisfactory. Outdoor activities can be pursued normally.",
    Satisfactory: "Air quality is acceptable. Sensitive individuals should limit prolonged exposure.",
    "Moderately Polluted": "Members of sensitive groups should avoid prolonged exposure.",
    Poor: "Everyone should avoid prolonged exposure. Health effects may be observed.",
    "Very Poor": "Severe health effects are possible. Avoid outdoor activities.",
  }

  const bgClass = {
    Good: "alert-success",
    Satisfactory: "alert-info",
    "Moderately Polluted": "alert-warning",
    Poor: "alert-danger",
    "Very Poor": "alert-danger",
  }[data.category]

  categoryDescription.className = `alert ${bgClass}`
  categoryDescription.innerHTML = `
        <strong>${data.category}</strong><br>
        ${descriptions[data.category] || "Check current AQI levels."}
    `

  resultCard.style.display = "block"
  resultCard.scrollIntoView({ behavior: "smooth" })

  // Enable report link and store prediction data
  if (typeof enableReportLink === 'function') {
    enableReportLink(data)
  }
}

function adjustBrightness(color, percent) {
  const num = Number.parseInt(color.replace("#", ""), 16)
  const amt = Math.round(2.55 * percent)
  let R = (num >> 16) + amt
  let G = ((num >> 8) & 0x00ff) + amt
  let B = (num & 0x0000ff) + amt
  R = R < 0 ? 0 : R > 255 ? 255 : R
  G = G < 0 ? 0 : G > 255 ? 255 : G
  B = B < 0 ? 0 : B > 255 ? 255 : B
  return (
    "#" + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)
  )
}
