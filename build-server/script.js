const path = require("path")
const {exec} = require("child_process")
const fs = require('fs')
const {S3Client, PutObjectCommand} = require("@aws-sdk/client-s3")
const mime = require("mime-types")
const Redis = require("ioredis")
const dotenv = require("dotenv")
dotenv.config()

const publisher = new Redis(process.env.REDIS_URL)
publisher.on('error', (err) => console.error('[Redis] connection error:', err.message))

const s3client = new S3Client({
    region: 'ap-south-1',
    credentials: process.env.IAM_ACCESS_KEY_ID && process.env.IAM_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.IAM_ACCESS_KEY_ID,
        secretAccessKey: process.env.IAM_SECRET_ACCESS_KEY
    } : undefined
})

const PROJECT_ID = process.env.PROJECT_ID
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID

async function publishLog(log) {
    await publisher.publish(`logs:${DEPLOYMENT_ID}`, JSON.stringify({ log }))
}

async function publishStatus(status) {
    await publisher.publish(`status:${DEPLOYMENT_ID}`, JSON.stringify({ status }))
}

async function init() {
    console.log("executing the script")
    publishLog('Build Started...')
    await publishStatus('IN_PROGRESS')
    const outDirPath = path.join(__dirname, 'output')
    const p = exec(`cd ${outDirPath} && rm -rf node_modules package-lock.json && npm install && npm run build`)

    p.stdout.on('data', function(data) {
        console.log(data.toString())
        publishLog(data.toString())
    })

    p.stderr.on('data', function(data) {
        console.log('Error', data.toString())
        publishLog(`error: ${data.toString()}`)
    })

    p.on('close', async function(code) {
        console.log("Build Completed")
        publishLog(`Build Complete`)

        if (code !== 0) {
            console.error(`Build process exited with code ${code}`)
            await publishStatus('FAIL')
            process.exit(1)
        }

        const distFolderPath = path.join(__dirname, 'output', 'dist')

        if (!fs.existsSync(distFolderPath)) {
            console.error("Build failed — dist folder not found")
            await publishStatus('FAIL')
            process.exit(1)
        }

        const distFolderContents = fs.readdirSync(distFolderPath, { recursive: true })

        for (const file of distFolderContents) {
            const filepath = path.join(distFolderPath, file)
            if (fs.lstatSync(filepath).isDirectory()) continue

            console.log("uploading", filepath)
            publishLog(`uploading ${file}`)

            const command = new PutObjectCommand({
                Bucket: 'repoflow-outputs',
                Key: `__output/${PROJECT_ID}/${file}`,
                Body: fs.createReadStream(filepath),
                ContentType: mime.lookup(filepath)
            })

            try {
                await s3client.send(command)
                publishLog(`uploaded ${file}`)
                console.log("uploaded", filepath)
            } catch (err) {
                console.error("S3 upload failed:", err)
                publishLog(`error uploading ${file}: ${err.message}`)
            }
        }
        publishLog(`Done`)
        console.log("Done")
        await publishStatus('READY')
        publisher.quit()
    })
}

init()