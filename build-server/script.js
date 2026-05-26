const path = require("path")
const {exec} = require("child_process")
const fs = require('fs')
const {S3Client,PutObjectCommand} = require ("@aws-sdk/client-s3")
const mime = require("mime-types")
const dotenv = require("dotenv")
dotenv.config()

const s3client = new S3Client({
    region:'ap-south-1',
    credentials:{
        accessKeyId:process.env.IAM_ACCESS_KEY_ID,
        secretAccessKey:process.env.IAM_SECRET_ACCESS_KEY
    }
})
const PROJECT_ID = process.env.PROJECT_ID

async function init(){
    console.log("execiting the script")
    const outDirPath = path.join(__dirname,'output')
    const p = exec(`cd ${outDirPath} && npm install &&npm run build`)
    p.stdout.on('data', function(data){
        console.log(data.toString())
    })
     p.stderr.on('data', function(data){
        console.log('Error',data.toString())
    })
     p.on('close', async function(){
        console.log("Build Completed")
        const distFolderPath = path.join(__dirname,'output', 'dist')
        const distFolderContents = fs.readdirSync(distFolderPath, {recursive:true})

        for (const file of distFolderContents){
            const filepath = path.join(distFolderPath,file)
            if(fs.lstatSync(filepath).isDirectory()) continue;

            console.log("uploading ", filepath)
            const command = new PutObjectCommand({
                Bucket:'repoflow-outputs',
                Key:`__output/${PROJECT_ID}/${file}`,
                Body:fs.createReadStream(filepath),
                ContentType: mime.lookup(filepath)
            })
            await s3client.send(command)
            console.log("uploaded ", filepath)
        }
        console.log("Done")
    })
}

init();