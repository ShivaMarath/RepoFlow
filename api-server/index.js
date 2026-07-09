const express = require("express")
const { generateSlug } = require("random-word-slugs")
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs")
const { Server } = require("socket.io")
const Redis = require("ioredis")
const { z } = require("zod")
const { neonConfig } = require('@neondatabase/serverless');
const { PrismaNeon } = require('@prisma/adapter-neon');
const { PrismaClient } = require('./generated/prisma');
const ws = require('ws');
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const cors = require('cors')

const dotenv = require("dotenv");
dotenv.config();

neonConfig.webSocketConstructor = ws;
const dbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace('postgresql://', 'postgres://') : '';
console.log("Using DB URL:", dbUrl);
const adapter = new PrismaNeon({ connectionString: dbUrl });
const prisma = new PrismaClient({ adapter });

const PORT = process.env.PORT || 9000
const app = express()
app.use(express.json())
app.use(cors({ origin: '*', credentials: true }))

// ── Redis ────────────────────────────────────────────────────────────────────
const subscriber = new Redis(process.env.REDIS_URL, {
    tls: { rejectUnauthorized: false },
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
        if (times > 3) return null
        return Math.min(times * 500, 2000)
    }
})
subscriber.on('error', (err) => console.error('Redis connection error:', err.message))

// ── Socket.io ────────────────────────────────────────────────────────────────
const io = new Server({ cors: { origin: '*' } })

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
})

io.listen(9002, () => console.log('Socket Server 9002'))

// ── AWS ECS ──────────────────────────────────────────────────────────────────
const ecsClient = new ECSClient({ region: process.env.AWS_REGION || "ap-south-1" })

const config = {
    CLUSTER: process.env.ECS_CLUSTER,
    TASK: process.env.ECS_TASK,
}

// ── Auth middleware ──────────────────────────────────────────────────────────
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' })
    }
    try {
        const token = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' })
    }
}

// ── Auth routes ──────────────────────────────────────────────────────────────
app.post('/auth/signup', async (req, res) => {
    const schema = z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6)
    })
    const safeParseResult = schema.safeParse(req.body)
    if (safeParseResult.error) return res.status(400).json({ error: safeParseResult.error })

    const { name, email, password } = safeParseResult.data

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } })
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' })
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await prisma.user.create({
            data: { name, email, password: hashedPassword }
        })

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        return res.json({
            status: 'success',
            data: { token, user: { id: user.id, name: user.name, email: user.email } }
        })
    } catch (error) {
        console.error("Signup failed:", error)
        return res.status(500).json({ status: 'error', message: 'Signup failed' })
    }
})

app.post('/auth/signin', async (req, res) => {
    const schema = z.object({
        email: z.string().email(),
        password: z.string()
    })
    const safeParseResult = schema.safeParse(req.body)
    if (safeParseResult.error) return res.status(400).json({ error: safeParseResult.error })

    const { email, password } = safeParseResult.data

    try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        const isValidPassword = await bcrypt.compare(password, user.password)
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' })
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        return res.json({
            status: 'success',
            data: { token, user: { id: user.id, name: user.name, email: user.email } }
        })
    } catch (error) {
        console.error("Signin failed:", error)
        return res.status(500).json({ status: 'error', message: 'Signin failed' })
    }
})

app.get('/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: {
                id: true,
                name: true,
                email: true,
                createdAt: true,
                updatedAt: true,
                _count: { select: { projects: true } }
            }
        })
        if (!user) {
            return res.status(404).json({ error: 'User not found' })
        }
        return res.json({ status: 'success', data: { user } })
    } catch (error) {
        console.error("Get user failed:", error)
        return res.status(500).json({ status: 'error', message: 'Failed to get user' })
    }
})

// ── Project routes ───────────────────────────────────────────────────────────
app.post('/project', authMiddleware, async (req, res) => {
    const schema = z.object({
        name: z.string(),
        gitURL: z.string()
    })
    const safeParseResult = schema.safeParse(req.body)
    if (safeParseResult.error) return res.status(400).json({ error: safeParseResult.error })

    const { name, gitURL } = safeParseResult.data
    try {
        const project = await prisma.project.create({
            data: {
                name,
                gitURL,
                subDomain: generateSlug(),
                userId: req.user?.userId
            }
        })
        return res.json({ status: 'success', data: { project } })
    } catch (error) {
        console.error("Project creation failed.", error)
        return res.status(500).json({ status: 'error', message: 'Project creation failed' })
    }
})

app.get('/projects', authMiddleware, async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            where: { userId: req.user.userId },
            include: {
                Deployment: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { id: true, status: true, createdAt: true }
                },
                _count: { select: { Deployment: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
        return res.json({ status: 'success', data: { projects } })
    } catch (error) {
        console.error("Failed to fetch projects:", error)
        return res.status(500).json({ status: 'error', message: 'Failed to fetch projects' })
    }
})

// ── Deploy route ─────────────────────────────────────────────────────────────
app.post('/deploy', authMiddleware, async (req, res) => {
    const { projectId } = req.body

    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project) return res.status(404).json({ error: 'Project not found' })

    if (project.userId && project.userId !== req.user.userId) {
        return res.status(403).json({ error: 'You do not have permission to deploy this project' })
    }

    const existingDeployment = await prisma.deployment.findFirst({
        where: { projectId, status: { in: ['QUEUED', 'IN_PROGRESS'] } }
    })
    if (existingDeployment) {
        return res.status(409).json({ error: 'A deployment is already running for this project' })
    }

    try {
        const deployment = await prisma.deployment.create({
            data: {
                project: { connect: { id: projectId } },
                status: 'QUEUED',
            }
        })

        const command = new RunTaskCommand({
            cluster: config.CLUSTER,
            taskDefinition: config.TASK,
            launchType: 'FARGATE',
            count: 1,
            networkConfiguration: {
                awsvpcConfiguration: {
                    assignPublicIp: 'ENABLED',
                    subnets: [process.env.SUBNET1, process.env.SUBNET2, process.env.SUBNET3],
                    securityGroups: [process.env.SECURITY_GROUPS]
                }
            },
            overrides: {
                containerOverrides: [
                    {
                        name: 'builder-image',
                        environment: [
                            { name: 'GIT_REPOSITORY__URL', value: project.gitURL },
                            { name: 'PROJECT_ID', value: project.subDomain },
                            { name: 'DEPLOYMENT_ID', value: deployment.id },
                            { name: 'REDIS_URL', value: process.env.REDIS_URL },
                        ]
                    }
                ]
            }
        })

        await ecsClient.send(command)

        return res.json({ status: 'queued', data: { deploymentId: deployment.id } })

    } catch (error) {
        console.error("ECS RunTask error:", error)
        return res.status(500).json({ status: 'error', message: error.message })
    }
})

// ── Deployments route ────────────────────────────────────────────────────────
app.get('/deployments/:projectId', authMiddleware, async (req, res) => {
    const { projectId } = req.params
    try {
        const project = await prisma.project.findUnique({ where: { id: projectId } })
        if (!project) {
            return res.status(404).json({ error: 'Project not found' })
        }
        if (project.userId && project.userId !== req.user.userId) {
            return res.status(403).json({ error: 'You do not have permission to view deployments for this project' })
        }

        const deployments = await prisma.deployment.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        })
        return res.json({ status: 'success', data: { deployments } })
    } catch (error) {
        console.error("Failed to fetch deployments:", error)
        return res.status(500).json({ status: 'error', message: 'Failed to fetch deployments' })
    }
})

// ── Update Deployment Status route ───────────────────────────────────────────
app.patch('/deployment/:id/status', async (req, res) => {
    const { id } = req.params
    const { status } = req.body

    const schema = z.object({
        status: z.enum(['NOT_STARTED', 'QUEUED', 'IN_PROGRESS', 'READY', 'FAIL'])
    })
    const safeParseResult = schema.safeParse({ status })
    if (safeParseResult.error) return res.status(400).json({ error: safeParseResult.error })

    try {
        const deployment = await prisma.deployment.update({
            where: { id },
            data: { status }
        })
        return res.json({ status: 'success', data: { deployment } })
    } catch (error) {
        console.error("Failed to update deployment status:", error)
        return res.status(500).json({ status: 'error', message: 'Failed to update deployment status' })
    }
})

// ── Proxy error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err)
    res.status(500).json({ status: 'error', message: 'Internal server error' })
})

// ── Redis pub/sub ─────────────────────────────────────────────────────────────
async function initRedisSubscribe() {
    console.log('Subscribed to logs and status....')
    await subscriber.psubscribe('logs:*')
    await subscriber.psubscribe('status:*')
    subscriber.on('pmessage', async (pattern, channel, message) => {
        if (channel.startsWith('logs:')) {
            io.to(channel).emit('message', message)
        } else if (channel.startsWith('status:')) {
            const deploymentId = channel.split(':')[1]
            try {
                const { status } = JSON.parse(message)
                await prisma.deployment.update({
                    where: { id: deploymentId },
                    data: { status }
                })
                console.log(`Updated deployment ${deploymentId} status to ${status}`)
            } catch (err) {
                console.error(`Failed to update deployment status via Redis:`, err)
            }
        }
    })
    console.log('Redis ready ✓')
}

initRedisSubscribe().catch(error => {
    console.error("Redis subscribe failed — live logs disabled:", error.message)
    // Server keeps running without live log streaming
})

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => { console.log(`API server running on ${PORT}`) })