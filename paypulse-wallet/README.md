# Pulse — Modern Production Payment Application

Pulse is a minimalist, production-grade payment application featuring real Firebase Authentication (Email/Password & Google Sign In), official PayPal JavaScript SDK payment processing, an integrated Gemini AI Assistant, and an advanced background AI Risk Mitigation Pipeline to eliminate false-positive account freezes.

---

## 🎨 Design System & Strict Guidelines

- **Primary Brand Color**: `#5a3bbe`
- **Background**: Plain white `rgb(255, 255, 255)`
- **Secondary Colors**: Pure white `rgb(255, 255, 255)` & Pure black `rgb(0, 0, 0)` strictly. No other colors used.
- **Card Styling**: 100% opaque `#5a3bbe` cards.
- **Icons**: Maximum 2 to 4 purposeful icons per view (zero emoji policy).
- **Text**: Minimal, factual text. No marketing clutter.
- **Real Production Only**: Zero mock data, zero fake users, zero mock statistics.

---

## 🔒 Environment & Secrets Configuration

All sensitive secrets and API credentials are kept in `.env` files and excluded from Git.

### 1. Server Configuration (`server/.env`)
Copy `server/.env.example` to `server/.env` and supply your credentials:
```env
PORT=5000
GEMINI_API_KEY=your_gemini_api_key
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com
```

### 2. Client Configuration (`client/.env`)
Copy `client/.env.example` to `client/.env` and supply your Firebase & PayPal credentials:
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
```

---

## 🚀 Key Modules & Architecture

### 1. Firebase Authentication & Profile Sync
- **Google Sign-In** & **Email/Password** registration and authentication.
- Real-time session management via `onAuthStateChanged`.
- Synced into SQLite database to establish user identity, balance, and transaction history.

### 2. PayPal JavaScript SDK Integration
- Direct integration with PayPal JavaScript SDK loaded dynamically at runtime.
- Backend OAuth authorization, order generation, and capture validation via PayPal REST API.
- Live balance crediting upon capture completion.

### 3. Background AI Account Freeze & Limitation Engine
- Implements Rayson's multi-stage risk pipeline in the backend:
  1. **Volume Spike Detection**: Z-score analysis against 30-day baseline totals (`zscore(today_volume + amount, daily_volumes_30d) > 3.0`).
  2. **Device & Geography Signals**: Identifies untrusted devices and new geographic patterns.
  3. **Dispute & Verification Checks**: Flags high dispute rates and unverified volume thresholds.
  4. **Proportionate Policy Engine**: Replaces all-or-nothing freezes with graded actions (`ALLOW`, `STEP_UP`, `PARTIAL_HOLD`, `LIMIT_ACCOUNT`). Suspicious amounts are held while remaining funds stay accessible.
  5. **Grounded AI Audit Explanations**: Gemini evaluates reason codes to generate deterministic, non-hallucinated compliance notes and checklists in the background audit database (`risk_decisions`).

### 4. Gemini AI Assistant
- Live conversational assistant powered by Google Gemini (`gemini-flash-latest`).
- Provides factual answers regarding wallet balances, transfer procedures, and PayPal integration.
- Strictly adheres to minimal text and zero emojis.

---

## 🛠️ Running the Application

### Backend API Server (Port 5000)
```powershell
cd server
npm start
```

### Frontend Client (Port 5173)
```powershell
cd client
npm run dev
```

Visit **http://localhost:5173** to sign in and use Pulse.
