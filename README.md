# AED - Automated ETL Designer

A modern, production-ready visual ETL (Extract, Transform, Load) pipeline designer with drag-and-drop interface, AI-powered suggestions, and real-time execution monitoring.

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![React](https://img.shields.io/badge/React-18-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

## 🎯 Overview

**AED (Automated ETL Designer)** is a comprehensive visual ETL tool that enables data analysts and engineers to design, execute, and monitor data transformation pipelines through an intuitive drag-and-drop interface.

### Key Capabilities

- **Visual Pipeline Designer**: Build complex ETL workflows with 24+ transformation types
- **AI-Powered Suggestions**: Get intelligent recommendations based on data profiling (15 detection rules)
- **Real-time Execution**: Monitor pipeline runs with detailed logs and row-level tracking
- **3-Tier Validation**: Client, server, and runtime validation for robust pipelines
- **Secure & Scalable**: JWT authentication, role-based access, production-ready architecture
- **Light/Dark Mode**: Beautiful, responsive UI with theme support

## 🏗️ Architecture

### Tech Stack

**Frontend**
- React 18 + TypeScript
- Vite (build tool)
- React Flow (visual editor)
- Tailwind CSS (styling)
- Axios (HTTP client)

**Backend**
- FastAPI (Python 3.11+)
- SQLAlchemy + Alembic (ORM & migrations)
- Pandas (data transformations)
- JWT (authentication)
- MySQL (database)

**Infrastructure**
- Docker & Docker Compose
- Uvicorn (ASGI server)
- Local file storage (S3-ready)

### System Architecture

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   React      │─────▶│   FastAPI    │─────▶│   Pandas     │
│   Frontend   │ HTTP │   Backend    │      │   Engine     │
│   (Port 5173)│      │   (Port 8000)│      │              │
└──────────────┘      └──────────────┘      └──────────────┘
                             │
                             ▼
                      ┌──────────────┐
                      │    MySQL     │
                      │  (Metadata)  │
                      └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ (for frontend)
- **Python** 3.11+ (for backend)
- **MySQL** 8.0+ (database)

### Local Development Setup

**1. Clone the repository**
```bash
git clone <repository-url>
cd "Phase 1"
```

**2. Backend Setup**
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # On Windows
# source venv/bin/activate  # On Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Create .env file with:
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=AED
SECRET_KEY=your-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Run migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**3. Frontend Setup**
```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

**4. Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### First Steps

1. **Register an account** at http://localhost:5173/register
2. **Upload sample data** (CSV, Excel, or JSON)
3. **Create a pipeline** using the visual editor
4. **Get AI suggestions** based on your data
5. **Run and monitor** your ETL pipeline

## 📁 Project Structure

```
Phase 1/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── main.py            # Application entry point
│   │   ├── config.py          # Configuration
│   │   ├── api/v1/            # API endpoints
│   │   │   ├── auth.py        # Authentication
│   │   │   ├── pipelines.py   # Pipeline CRUD
│   │   │   ├── runs.py        # Run management
│   │   │   ├── files.py       # File operations
│   │   │   ├── suggestions.py # AI suggestions
│   │   │   └── settings.py    # User settings
│   │   ├── models/
│   │   │   ├── orm_models.py  # SQLAlchemy models
│   │   │   └── pydantic_schemas.py  # API schemas
│   │   ├── services/
│   │   │   └── runner.py      # ETL execution engine
│   │   ├── db/
│   │   │   └── session.py     # Database session
│   │   └── utils/
│   │       ├── security.py    # JWT & password hashing
│   │       └── file_utils.py  # File operations
│   ├── alembic/               # Database migrations
│   ├── tests/                 # Backend tests
│   └── requirements.txt
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/             # Page components
│   │   │   ├── LoginPage.tsx
│   │   │   ├── PipelinesPage.tsx
│   │   │   ├── EditorPage.tsx
│   │   │   ├── RunsPage.tsx
│   │   │   ├── SettingsPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── components/
│   │   │   ├── ui/            # Base UI components
│   │   │   ├── layout/        # Layout components
│   │   │   └── editor/        # Pipeline editor
│   │   ├── contexts/          # React contexts
│   │   │   └── ThemeContext.tsx
│   │   └── services/
│   │       └── api.ts         # API client
│   ├── package.json
│   └── vite.config.ts
│
├── data/                      # Local storage
│   ├── uploads/               # Uploaded files
│   └── outputs/               # Pipeline outputs
│
├── docker-compose.yml
└── README.md
```

## 🎨 Features

### 1. Visual Pipeline Designer

**24 Node Types Available:**

**Sources (5)**
- CSV Source
- Excel Source  
- JSON Source
- Database Source (SQL query support)
- API Source (REST endpoints)

**Transformations (15)**
- Select Columns
- Filter Rows (with conditions)
- Rename Columns
- Cast Types
- Aggregate (GROUP BY)
- **JOIN** (inner, left, right, outer)
- Sort
- Fill Missing Values
- Drop Duplicates
- Normalize (min-max, z-score, robust)
- String Transform (trim, case, phone/email/currency)
- Filter Outliers (statistical methods)
- Split Column
- Merge Columns
- Extract Date Parts

**Destinations (5)**
- CSV Load
- Excel Load
- JSON Load
- Database Load
- API Load

### 2. AI-Powered Suggestions (15 Rules)

The suggestion engine analyzes your data and provides intelligent recommendations:

1. **High Null Detection** → Fill or drop columns
2. **Date Pattern Recognition** → Parse dates
3. **Numeric Analysis** → Suggest aggregations
4. **String-to-Number** → Type casting
5. **Join Key Detection** → Identify potential joins
6. **Low Cardinality** → One-hot encoding
7. **Text Cleaning** → Trim and normalize
8. **Outlier Detection** → 3σ and IQR methods
9. **Duplicate Detection** → Drop duplicates
10. **Normalization** → Scale numeric data
11. **Email Validation** → Validate formats
12. **Phone Standardization** → Format phone numbers
13. **Currency Parsing** → Extract monetary values
14. **Case Normalization** → Standardize text case
15. **Global Suggestions** → Multi-column analysis

### 3. 3-Tier Validation System

**Client-Side (10+ rules)**
- At least one SOURCE node
- At least one LOAD node
- All nodes connected (no orphans)
- Cycle detection (DFS algorithm)
- Required config fields
- Real-time feedback

**Server-Side (12+ rules)**
- Pipeline structure validation
- Node type validation
- Config completeness
- Server-side cycle detection
- Orphan detection
- Connection compatibility

**Runtime Validation (8+ rules)**
- Column existence checking
- Type compatibility
- Schema validation per node
- Data availability
- Descriptive error messages

### 4. Run Monitoring

- **Real-time status updates** (PENDING → RUNNING → SUCCESS/FAILED)
- **Node-level execution logs** with timestamps
- **Row count tracking** (input/output per transformation)
- **Detailed error messages** with stack traces
- **Result file downloads**
- **Run history** with filtering

### 5. Security Features

- **JWT Authentication** with access & refresh tokens
- **Password hashing** using bcrypt
- **Role-based access** (admin, analyst, viewer)
- **SQL injection prevention** via parameterized queries
- **Path sanitization** (prevent directory traversal)
- **File validation** (type, size, extension)
- **CORS configuration**
- **User data isolation**

## 📖 API Documentation

### Authentication

```bash
# Register
POST /api/v1/auth/register
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}

# Login
POST /api/v1/auth/login
{
  "email": "john@example.com",
  "password": "password123"
}
# Returns: { "access_token": "...", "refresh_token": "..." }

# Get Current User
GET /api/v1/auth/me
Headers: Authorization: Bearer <token>

# Change Password
POST /api/v1/auth/change-password
Headers: Authorization: Bearer <token>
{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

### Pipelines

```bash
# Create Pipeline
POST /api/v1/pipelines/
Headers: Authorization: Bearer <token>
{
  "name": "Sales ETL",
  "description": "Process sales data",
  "nodes": [...],
  "edges": [...]
}

# List Pipelines
GET /api/v1/pipelines/
Headers: Authorization: Bearer <token>

# Get Pipeline
GET /api/v1/pipelines/{id}
Headers: Authorization: Bearer <token>

# Update Pipeline
PUT /api/v1/pipelines/{id}
Headers: Authorization: Bearer <token>
{
  "name": "Updated Name",
  "nodes": [...],
  "edges": [...]
}

# Delete Pipeline
DELETE /api/v1/pipelines/{id}
Headers: Authorization: Bearer <token>

# Validate Pipeline
POST /api/v1/pipelines/{id}/validate
Headers: Authorization: Bearer <token>

# Run Pipeline
POST /api/v1/pipelines/{id}/runs
Headers: Authorization: Bearer <token>
```

### Files

```bash
# Upload File
POST /api/v1/files/upload
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: file=<binary>

# Get File Sample
GET /api/v1/files/{file_id}/sample?rows=100
Headers: Authorization: Bearer <token>

# Download Result
GET /api/v1/files/download/{path}
Headers: Authorization: Bearer <token>
```

### Suggestions

```bash
# Get Suggestions from Sample
POST /api/v1/suggestions/from-sample
Headers: Authorization: Bearer <token>
{
  "column_stats": {
    "age": { "null_count": 5, "data_type": "int64" },
    "email": { "null_count": 0, "data_type": "object" }
  }
}
```

**Interactive API Docs:** http://localhost:8000/docs

## 🧪 Testing

### Backend Tests

```bash
cd backend
pytest                              # Run all tests
pytest tests/test_auth.py          # Specific test
pytest --cov=app                   # With coverage
```

### Frontend Tests

```bash
cd frontend
npm test                           # Run tests
npm run test:coverage              # With coverage
```

## 🛠️ Development

### Backend Development

```bash
# Create migration
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# Run with debug logging
uvicorn app.main:app --reload --log-level debug
```

### Frontend Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run type-check

# Linting
npm run lint
```

## 🐳 Docker Deployment

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v
```

## 🔒 Production Checklist

- [ ] Change `SECRET_KEY` to a strong random value (min 32 chars)
- [ ] Use strong database password
- [ ] Configure CORS origins to your domain
- [ ] Enable HTTPS/SSL
- [ ] Set up database backups
- [ ] Configure file upload limits
- [ ] Set up monitoring and logging
- [ ] Review security headers
- [ ] Update dependencies regularly
- [ ] Configure rate limiting

## 🛣️ Roadmap

**Completed ✅**
- Visual pipeline designer with 24 node types
- AI-powered suggestions (15 rules)
- 3-tier validation system
- Real-time run monitoring
- JWT authentication
- Light/dark theme
- JOIN transformation
- User settings persistence
- Password management

**Planned 🚧**
- S3/cloud storage integration
- Pipeline scheduling (cron jobs)
- Real-time collaboration
- Data lineage visualization
- Version control for pipelines
- Advanced ML-based suggestions
- Export pipelines as Python/SQL
- Multi-database support (PostgreSQL, MongoDB)
- Advanced transformations (pivot, window functions)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 👨‍💻 Authors

Built for data teams, by data engineers.

## 🙏 Acknowledgments

- [React Flow](https://reactflow.dev/) - Visual node editor
- [FastAPI](https://fastapi.tiangolo.com/) - High-performance Python framework
- [Pandas](https://pandas.pydata.org/) - Data transformation library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework

---

**Need help?** Open an issue or contact the development team.
