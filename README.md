# HoosHungry

HoosHungry is a student meal-exchange marketplace. Buyers can request meals, sellers can accept requests using extra swipes, and both sides can track the order through pickup and completion.

[Demo Link](https://www.youtube.com/watch?v=W-Gr6ZOkuhY)



## Running Locally:

### Prerequisites

- Node.js
- .NET 10 SDK
- A Supabase project with a service role key

### 1. Configure the backend

Use `backend/appsettings.example.json` as the template for local backend config.

Set your Supabase values through local config or environment variables:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`

### 2. Apply the database schema

Run the SQL in `backend/Supabase/schema.sql` in the Supabase SQL Editor so the app tables exist.

### 3. Start the backend

From the repo root:

```bash
dotnet run --project backend/backend.csproj
```

Backend URLs:

- API: `http://localhost:5009/api`
- Swagger: `http://localhost:5009/swagger`

### 4. Start the frontend

In a second terminal:

```bash
cd frontend/hooshungry
npm install
npm run dev
```

Frontend URL:

- `http://localhost:5173`

## Project Structure

- `frontend/hooshungry`: Vite + React frontend
- `backend`: ASP.NET Core API
- `backend/Supabase/schema.sql`: current schema snapshot for Supabase
