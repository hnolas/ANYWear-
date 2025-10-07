# Wearable Dashboard Project

A full-stack application for visualizing wearable device data with an Angular frontend (Fuse template) and FastAPI backend.

## Project Structure

- **Frontend**: Angular 18 with Material Design (Fuse Admin Template)
- **Backend**: FastAPI with MySQL database integration

## Prerequisites

### Frontend Requirements
- Node.js (v18 or higher recommended based on .nvmrc)
- npm or yarn package manager

### Backend Requirements
- Python 3.8+
- MySQL database
- pip (Python package manager)

## Getting Started

### 1. Frontend Setup (Angular)

Navigate to the frontend directory:
```bash
cd /Users/harshanand/Downloads/Project/Pycharm/DataIntegrationModule/wearable_dashboard/themeforest-9Jn3pKa0-fuse-angularjs-material-design-admin-template/fuse-starter-v20.0.0
```

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm start
```

The Angular application will be available at `http://localhost:4200`

#### Other Frontend Commands
- Build for production: `npm run build`
- Run tests: `npm test`
- Watch mode: `npm run watch`

### 2. Backend Setup (FastAPI)

Navigate to the backend directory:
```bash
cd /Users/harshanand/Downloads/Project/Pycharm/DataIntegrationModule/streamlit_acc_ui
```

Create and activate a virtual environment (recommended):
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

Install dependencies:
```bash
pip install fastapi uvicorn mysql-connector-python pydantic
```

Configure your MySQL database connection:
- Update the database credentials in `sql/mysql_database.py`

Start the FastAPI server:
```bash
uvicorn app:app --reload
```

The backend API will be available at `http://localhost:8000`

#### Backend API Documentation
Once the server is running, you can access:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Available API Endpoints

- `GET /days-worn` - Get the number of days each participant wore the device
- `GET /cgm-metrics` - Get CGM (Continuous Glucose Monitoring) metrics
- Additional endpoints available in `app.py`

## Database Setup

Ensure your MySQL database is configured with the required tables:
- `cgm_data` - Contains CGM device data with fields like `pid`, `device_timestamp`, etc.

Update the database connection settings in the backend configuration files.

## Development

### Frontend Development
The frontend uses Angular 18 with:
- Angular Material UI components
- Tailwind CSS
- Chart.js, ApexCharts, Highcharts for data visualization
- Transloco for internationalization

### Backend Development
The backend uses:
- FastAPI for REST API endpoints
- MySQL for data persistence
- CORS middleware enabled for cross-origin requests
- Pydantic for data validation

## CORS Configuration

The backend is configured to accept requests from any origin (`allow_origins=["*"]`).
For production, update this in `app.py` to restrict to specific domains:
```python
allow_origins=["http://localhost:4200", "https://yourdomain.com"]
```

## License

Frontend: Licensed under ThemeForest Standard License
Backend: Custom implementation

## Support

For frontend template support, visit: https://themeforest.net/user/srcn

---

## Original Fuse Template Documentation

This project was generated with [Angular CLI](https://github.com/angular/angular-cli)

### Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

### Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

### Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

### Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
