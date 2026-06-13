# SEO AI OS

This is the SEO AI OS workspace containing the NestJS backend and Next.js frontend.

## Structure

- `/frontend` - Next.js Application (React, TypeScript, Tailwind)
- `/backend` - NestJS Application (TypeScript, strict mode)
- `docker-compose.yml` - Local PostgreSQL service

## Getting Started

### Prerequisites
- Node.js (>=20.9.0 recommended, or run current system Node)
- Docker & Docker Compose

### Run Database
To start the PostgreSQL database:
```bash
docker compose up -d
```

### Run Backend
1. Navigate to `/backend`:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run start:dev
   ```

### Run Frontend
1. Navigate to `/frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
