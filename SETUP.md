# SEO AI OS - Local Setup Guide

Welcome to the **SEO AI OS** setup guide! Follow these instructions to run the complete Multi-Tenant Enterprise SEO & AI Visibility platform locally.

---

## Prerequisites
Ensure the following dependencies are installed and available on your system:
- **Node.js**: `v20.20.1` (using NVM is highly recommended)
- **PostgreSQL**: `v10.0+` (already installed and running on port `5432`)
- **NPM**: `v10.0.0+`

---

## 1. Database Initialization

Since a local PostgreSQL instance is running on port `5432` with username `postgres` and password `password`:

1. Connect to PostgreSQL and create the database:
   ```bash
   PGPASSWORD=password createdb -U postgres -h localhost -p 5432 seo_ai_os
   ```
2. Enable the required cryptographic UUID extension:
   ```bash
   PGPASSWORD=password psql -U postgres -h localhost -p 5432 -d seo_ai_os -c 'CREATE EXTENSION IF NOT EXISTS "pgcrypto";'
   ```

---

## 2. Backend Setup (`/backend`)

The backend is built with NestJS and uses the Prisma ORM.

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Configure environment variables in the `.env` file:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/seo_ai_os
   PORT=3001
   ```
3. Sync the database schema and compile the Prisma Client:
   ```bash
   npx prisma db push
   ```
4. Seed the database with default roles, permissions, organizations, default owner account, and campaign trace records:
   ```bash
   npx ts-node prisma/seed.ts
   ```
5. Launch the NestJS backend development server:
   ```bash
   npm run start:dev
   ```

The backend server will spin up on [http://localhost:3001](http://localhost:3001). 
- **Interactive Swagger Documentation**: Access [http://localhost:3001/docs](http://localhost:3001/docs) for full endpoint specifications.

---

## 3. Frontend Setup (`/frontend`)

The frontend dashboard is built with Next.js 15, Zustand state store, and Tailwind CSS.

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server (using Turbopack compiler):
   ```bash
   npm run dev
   ```

The frontend application will start on [http://localhost:3000](http://localhost:3000).

---

## 4. Default Credentials (Seeded Account)

Use these credentials to log in to the dashboard portal:
- **Email Address**: `agency@seoaios.com`
- **Password**: `password123`
- **Default Role**: `OWNER` (full access rights)

---

## Project Structure
```
seo-ai-os/
├── backend/                   # NestJS Module-based Backend Service
│   ├── prisma/                # Prisma DB Schema & Seeding Logic
│   └── src/                   # REST Controllers & Services 
├── frontend/                  # Next.js 15 Dashboard App
│   ├── src/app/               # App Router pages and screens
│   ├── src/components/        # Responsive Charts & KPI cards
│   └── src/store/             # Zustand State store
├── schema.sql                 # Pure SQL DDL Reference DDL
├── docker-compose.yml         # Containerized PostgreSQL Template
└── SETUP.md                   # This Setup Document
```
