# InterestHub API

Backend REST API for an interest-based social application. It provides authentication,
profiles and follows, image posts, likes, comments, and threaded replies.

## Requirements

- Node.js 24 LTS (`nvm use`)
- MongoDB
- A Cloudinary account for profile and post image uploads

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set a strong `JWT_SECRET` and valid MongoDB and Cloudinary values in `.env`.

## Commands

```bash
npm run dev       # start the development server
npm run build     # compile TypeScript into dist/
npm run lint      # lint source files
npm test          # run integration tests
```

The API is served below `/api`; Swagger documentation is available at `/api-docs`
and a health check is available at `/api/health`.
