# ▲ Repoflow

A self-hosted platform for deploying frontend projects from Git — similar to Vercel. Push a repo, get a live URL. Built on AWS ECS Fargate, Redis, and Socket.IO.

---

## Architecture

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│  React Frontend │──────▶ │   API Server      │──────▶ │  AWS ECS Fargate│
│  (Port 3000)    │        │   (Port 9000)     │        │  Build Container│
└─────────────────┘        └──────────────────┘        └────────┬────────┘
         │                          │                            │
         │                 ┌────────▼────────┐                  │
         │                 │  Socket.IO       │         Publishes logs
         │◀────────────────│  (Port 9002)     │◀────────────────┘
         │   Live logs      └────────▲────────┘        via Redis pub/sub
         │                          │
         │                 ┌────────┴────────┐
         └────────────────▶│  Reverse Proxy  │
           *.localhost:8000 │  (Port 8000)    │
                            └─────────────────┘
```

**Request flow:**

1. User submits a Git URL via the React frontend
2. API server creates a `Project` + `Deployment` record in the database
3. API server spins up an ECS Fargate task with the Git URL injected as an env var
4. The build container clones the repo, builds it, and uploads the output to S3
5. Build logs are published to Redis (`logs:<deploymentId>`) in real time
6. Socket.IO relays those logs to the frontend via the subscribed channel
7. The reverse proxy serves the built site at `<subDomain>.localhost:8000`

---

## Services

### 1. API Server (`/api-server`)

The control plane. Handles project creation, deployment triggering, and log streaming.

| Endpoint | Method | Description |
|---|---|---|
| `/project` | POST | Create a new project |
| `/deploy` | POST | Trigger a deployment for a project |

**Tech:** Express, Prisma, Zod, Socket.IO, ioredis, AWS SDK v3

---

### 2. Build Server (`/build-server`)

A Docker container run on-demand by ECS Fargate. It:

- Clones the Git repository
- Installs dependencies and runs the build
- Uploads the output directory to S3
- Publishes build logs to Redis in real time

Receives configuration via environment variables:

| Variable | Description |
|---|---|
| `GIT_REPOSITORY__URL` | The Git repo to clone and build |
| `PROJECT_ID` | The project identifier |
| `DEPLOYMENT_ID` | The deployment record ID |

---

### 3. Reverse Proxy (`/reverse-proxy`)

Routes incoming requests to the correct S3-hosted build based on the subdomain.

- Listens on port `8000`
- Reads the subdomain from the host header (e.g. `my-app.localhost:8000`)
- Proxies the request to the corresponding folder in S3

---

### 4. React Frontend (`/frontend`)

The user-facing dashboard.

- Submit a Git URL to create a project and trigger a deployment
- Watch build logs stream in real time via Socket.IO
- View the live deployment URL once the build completes

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker
- An AWS account with:
  - ECS cluster and task definition configured
  - S3 bucket for build output
  - VPC with subnets and a security group
- A Redis instance (e.g. Upstash, Redis Cloud, or local)
- A PostgreSQL database (for Prisma)

### Environment Variables

Create a `.env` file in `api-server/`:

```env
PORT=9000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/Repoflow

# Redis
REDIS_URL=redis://localhost:6379

# AWS
AWS_REGION=ap-south-1
ECS_CLUSTER=your-cluster-arn
ECS_TASK=your-task-definition-arn
SUBNET1=subnet-xxxxxxxx
SUBNET2=subnet-xxxxxxxx
SUBNET3=subnet-xxxxxxxx
SECURITY_GROUPS=sg-xxxxxxxx
```

Create a `.env` file in `build-server/`:

```env
REDIS_URL=redis://localhost:6379
AWS_REGION=ap-south-1
S3_BUCKET=your-s3-bucket-name
```

### Running Locally

**1. API Server**
```bash
cd api-server
npm install
npx prisma migrate dev
npm start
```

**2. Build Server** (Docker)
```bash
cd build-server
docker build -t build-server .
# Deployed automatically by ECS — run locally for testing only
docker run \
  -e GIT_REPOSITORY__URL=https://github.com/your/repo \
  -e PROJECT_ID=test-project \
  -e DEPLOYMENT_ID=test-deployment \
  build-server
```

**3. Reverse Proxy**
```bash
cd reverse-proxy
npm install
npm start
```

**4. Frontend**
```bash
cd frontend
npm install
npm run dev
```

---

## Database Schema

```prisma
model Project {
  id          String       @id @default(cuid())
  name        String
  gitURL      String
  subDomain   String       @unique
  deployments Deployment[]
  createdAt   DateTime     @default(now())
}

model Deployment {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  status    String   // QUEUED | IN_PROGRESS | READY | FAILED
  createdAt DateTime @default(now())
}
```

---

## Known Limitations

- The duplicate deployment check (`findFirst` + `create`) is not atomic. Under concurrent requests, two deployments can slip through. A database-level unique constraint on active deployments is the correct fix.
- No authentication — the API is open. Add an auth middleware before exposing this publicly.
- `SECURITY_GROUPS` supports only a single group. Split on comma if you need multiple: `process.env.SECURITY_GROUPS.split(',')`.

---

