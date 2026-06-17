<div align="center">
  <h1>🌊 Resilience Lanka</h1>
  <p><b>Advanced AI-Powered Flood Risk Analytics & Prediction Platform for Sri Lanka</b></p>
  <img src="https://img.shields.io/badge/Frontend-React%20%7C%20Vite-61DAFB?style=for-the-badge&logo=react" alt="Frontend" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi" alt="Backend" />
  <img src="https://img.shields.io/badge/AI_Model-Scikit--Learn-F7931E?style=for-the-badge&logo=scikit-learn" alt="Machine Learning" />
  <img src="https://img.shields.io/badge/Database-MongoDB-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB" />
</div>

<br />

## 📖 Overview
**Resilience Lanka** is a state-of-the-art, full-stack machine learning application designed to predict and analyze flood risks across Sri Lanka. Built to handle extreme weather conditions, the system bridges the gap between raw meteorological data and actionable intelligence. It offers real-time interactive mapping, Explainable AI (XAI), historical comparisons, and professional reporting in a stunning, premium dark-themed interface.

---

## ✨ Key Features

### 1. 🗺️ Interactive AI Map (Geospatial Analysis)
- **Auto-Detection:** Click anywhere on the map of Sri Lanka to automatically fetch local elevation (Open-Meteo API), reverse-geocode the location, and calculate distances to nearest rivers, hospitals, and evacuation centers.
- **Surrounding Risk Bubbles:** Instantly calculates flood risk for the selected coordinate as well as 8 surrounding geographic points concurrently, visualizing the risk spread.
- **Strict Boundaries:** The map is geofenced exclusively to Sri Lanka.

### 2. 🧠 Explainable AI (XAI) & Machine Learning
- **Advanced Ensemble Model:** Powered by a highly accurate `StackingRegressor` trained on complex meteorological, topographical, and infrastructural data.
- **Feature Importance:** The platform doesn't just give a score; it explains *why*. It breaks down the exact percentage contribution of parameters (e.g., "36% due to 7-Day Rainfall", "25% due to Low Elevation").
- **Extreme Weather Resilience:** Backend constraints scale up to 5000mm of monthly rainfall to accurately process extreme natural disasters without failure.

### 3. 📊 What-If Scenario Simulation (Admin/Researcher Mode)
- Researchers can run simulations to see how the risk score changes if a single parameter is altered.
- e.g., "What happens to the risk if the 7-day rainfall increases from 100mm to 1000mm in Colombo?" Generates dynamic risk curves.

### 4. 📄 Professional PDF Reporting & History
- Generates beautiful, branded PDF reports containing the risk score, parameter breakdown, and actionable advice.
- **Historical Comparison:** Automatically tracks past predictions for the same district and renders a comparative bar chart directly on the PDF to monitor risk escalation over time.

### 5. 🔐 Authentication & Analytics Dashboard
- **Role-Based Access:** Standard User Mode and Advanced/Admin Mode.
- **Global Analytics:** The system logs all predictions asynchronously to MongoDB, allowing administrators to view country-wide risk trends and statistics.

---

## 🛠️ Technology Stack

### Frontend
* **Core:** React, Vite, Vanilla CSS (Custom UI/UX with Glassmorphism)
* **Map Engine:** Leaflet (`react-leaflet`)
* **Animations:** Framer Motion
* **Charts & Visualizations:** Recharts
* **PDF Generation:** `html2canvas`, `jspdf`

### Backend
* **Framework:** FastAPI (Python)
* **Machine Learning:** Scikit-Learn, Pandas, NumPy, Joblib
* **Database:** MongoDB (`motor` async driver)
* **Auth:** JWT (JSON Web Tokens), Passlib

---

## ⚙️ System Architecture

### 1. Data Processing Pipeline
When a prediction request is made, the backend runs a **Feature Engineering** pipeline identical to the one used during model training:
- Calculates `Rainfall Intensity Ratio` (7-day vs Monthly).
- Calculates `Population Vulnerability` (Density vs Infrastructure Score).
- Calculates an `Extreme Risk Index` combining elevation and proximity to rivers.

### 2. Error Handling & Fallbacks
- **Database Fallback:** If the primary MongoDB cluster goes offline, the system seamlessly attempts to connect to local instances or bypasses logging to ensure the Prediction API remains online.
- **Concurrent Processing:** Frontend utilizes `Promise.all()` to fetch complex map rendering logic instantly without UI blocking.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB (Local or Atlas URI)

### 1. Start the Backend (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # (On Windows: venv\Scripts\activate)
pip install -r requirements.txt
```
*Create a `.env` file in the `backend/` directory:*
```env
MONGODB_URI="mongodb+srv://<your-uri>"
DB_NAME="resilience_lanka"
SECRET_KEY="your-secret-key"
MODEL_PATH="path/to/flood_risk_model.pkl"
```
*Run the server:*
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Start the Frontend (React/Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🎨 UI/UX Design Philosophy
The system was designed to feel **premium and urgent**. It completely avoids generic dashboards, opting instead for tailored HSL color palettes, deep dark modes, smooth micro-animations, and glowing neon accents (Emerald for Low Risk, Amber for Medium, Red for High/Critical) to clearly communicate danger levels at a glance.

---

## 🏆 Hackathon / Competition Readiness
This project goes beyond a standard Jupyter Notebook data science project. It is a **fully deployable Software-as-a-Service (SaaS)** demonstrating the complete ML lifecycle: from data preprocessing and model training to deployment, scalable REST APIs, Explainable AI, and a production-grade user interface.