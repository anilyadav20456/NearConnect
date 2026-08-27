# 🌐 NearConnect

**NearConnect** is a real-time, location-based social networking and chat platform built with **Flask (Python)** and **React**. It enables users to discover nearby people within custom distance radii, exchange real-time messages via Socket.IO, manage friend requests, and customize profile preferences.

---

## ✨ Core Features

* 📍 **Geo-Location Discovery**: Locate nearby users within configurable radii (2km, 4km, 5km).
* 💬 **Real-Time Messaging**: Socket.IO powered instant messaging with read receipts, image attachments, and active status tracking.
* 👥 **Connections & Requests**: Manage friend requests, accept/reject, or block/report users.
* 🔔 **Notifications**: Real-time Socket.IO and persistent database notifications.
* 📧 **Brevo Email Integration**: Automatic verification codes, welcome emails, and notifications.
* 🔐 **JWT Authentication**: Secure user registration, password hashing, and token-based sessions.

---

## 🛠️ Technology Stack

* **Backend**: Flask 3, Flask-SocketIO, Flask-SQLAlchemy, PyJWT, Gunicorn, Eventlet, SQLite / PostgreSQL
* **Frontend**: React 18, React Router v7, Socket.IO Client, Bootstrap Icons, CSS3
* **Deployment**: Render (Backend Web Service) & Vercel (Frontend SPA)

---

## 🚀 Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows PowerShell:
.\venv\Scripts\activate
pip install -r requirements.txt
python app.py
```
*Backend runs on `http://127.0.0.1:5001`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```
*Frontend runs on `http://localhost:3000`*

---

## ☁️ Production Deployment

### Backend (Render)
* **Root Directory**: `backend`
* **Build Command**: `pip install -r requirements.txt`
* **Start Command**: `gunicorn -k eventlet -w 1 app:app`

### Frontend (Vercel)
* **Root Directory**: `frontend`
* **Build Command**: `npm run build`
* **Output Directory**: `build`
* **Environment Variable**: `REACT_APP_API_URL=https://your-render-backend.onrender.com`

---

## 📄 License
Licensed under the [MIT License](LICENSE).
