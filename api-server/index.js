const express = require("express")
const { generateSlug } = require("random-word-slugs")
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs")
const {} = require ("socket.io")
const Redis = require("ioredis")
const dotenv = require("dotenv")
dotenv.config()

const PORT = process.env.PORT || 9000
const app = express()
app.use(express.json())

const subscriber = new Redis('')

const io = new Server({ cors: '*' })

io.on('connection', socket => {
    socket.on('subscribe', channel => {
        socket.join(channel)
        socket.emit('message', `Joined ${channel}`)
    })
})

io.listen(9002, () => console.log('Socket Server 9002'))


const ecsClient = new ECSClient({ region: process.env.AWS_REGION || "ap-south-1" })

const config = {
    CLUSTER: process.env.ECS_CLUSTER,
    TASK: process.env.ECS_TASK,
}

app.post('/project', async (req, res) => {
    const { gitURL, slug } = req.body
    const projectSlug = slug ? slug : generateSlug()

    try {
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
                            { name: 'GIT_REPOSITORY__URL', value: gitURL },
                            { name: 'PROJECT_ID', value: projectSlug }
                        ]
                    }
                ]
            }
        })

        await ecsClient.send(command)

        return res.json({
            status: 'queued',
            data: { projectSlug, url: `http://${projectSlug}.localhost:8000` }
        })
    } catch (error) {
        console.error("ECS RunTask error:", error)
        return res.status(500).json({ status: 'error', message: error.message })
    }
})


async function initRedisSubscribe() {
    console.log('Subscribed to logs....')
    subscriber.psubscribe('logs:*')
    subscriber.on('pmessage', (pattern, channel, message) => {
        io.to(channel).emit('message', message)
    })
}

initRedisSubscribe()
app.listen(PORT, () => { console.log(`API server running on ${PORT}`) })