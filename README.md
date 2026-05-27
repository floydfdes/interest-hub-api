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

## Docker

Create the environment file as usual before starting the containers:

```bash
cp .env.example .env
docker compose up --build
```

Compose starts the API at `http://localhost:4300` and a persisted MongoDB
container. The API uses the `JWT_SECRET` and Cloudinary values from `.env`.

To connect the container to MongoDB Atlas or another hosted database instead of
the bundled MongoDB service, set `DOCKER_MONGO_URI` in `.env`:

```dotenv
DOCKER_MONGO_URI=mongodb+srv://username:password@cluster/interesthub
```

For deployment behind HTTPS, set `NODE_ENV=production` so authentication
cookies use their secure production configuration.
