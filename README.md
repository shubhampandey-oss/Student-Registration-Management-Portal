# Cognifyz Technologies — Full Stack Development Internship

## Student Registration and Management Portal (Enterprise Edition)

**Live Website:** https://cognifyz-student-portal.onrender.com

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4.19-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%20(sql.js)-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![Bootstrap](https://img.shields.io/badge/UI-Bootstrap%205-7952B3?logo=bootstrap&logoColor=white)](https://getbootstrap.com/)

A complete full-stack web application developed for the **Cognifyz Technologies Full Stack Web Development Internship**. The portal covers 8 internship tasks across 4 progressive levels, featuring server-side EJS rendering, RESTful APIs, SQLite database integration, authentication, security middleware, caching, automated backups, and background tasks.

---

## 🚀 Live Demo

- **Live Website:** https://cognifyz-student-portal.onrender.com
- **API Documentation:** https://cognifyz-student-portal.onrender.com/api/docs
- **Health Check:** https://cognifyz-student-portal.onrender.com/api/v1/health

> Note: On Render's free plan, the service may take some time to respond after a period of inactivity.

---

## 💻 Run Locally

### Prerequisites
- Node.js v18 or higher
- npm

### Installation

```powershell
npm install
cp .env.example .env
```

Configure the required environment variables in `.env`.

### Start the Application

```powershell
# Development mode
npm run dev

# Production mode
npm start

# Run automated tests
npm test

# Trigger a database backup
npm run backup
```

Open http://localhost:3000 to access your local development instance.

---

## 🌐 Deployment

The application is deployed on Render with GitHub integration.

**Production URL:** https://cognifyz-student-portal.onrender.com

The live deployment uses HTTPS. Local development continues to use `http://localhost:3000`.

---

## 📚 Documentation

Detailed documentation for the internship tasks is available in the `docs/` directory:

- [Task 1: Express Server & EJS Forms](docs/TASK_1.md)
- [Task 2: Client Validation & Extended Fields](docs/TASK_2.md)
- [Task 3: Responsive Grid & Live Filters](docs/TASK_3.md)
- [Task 4: Password Security & Dynamic DOM](docs/TASK_4.md)
- [Task 5: RESTful API & Front-End Integration](docs/TASK_5.md)
- [Task 6: Database Integration & Authentication](docs/TASK_6.md)
- [Task 7: Security & Caching](docs/TASK_7.md)
- [Task 8: Background Tasks & Health Monitoring](docs/TASK_8.md)

---

## 📜 License & Acknowledgements

- **Program:** Cognifyz Technologies Full Stack Development Internship
- **License:** MIT License
