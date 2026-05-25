const path = require("path")
const {exec} = require("child_process")
const fs = require('fs')
const {S3Client,PutObjectCommand} = require ("@aws-sdk/client-s3")
const mime = require("mime-types")


const s3client = new S3Client({
    region:'',
    credentials:{
        accessKeyId:"",
        secretAccessKey:""
    }
})
const PROJECT_ID = process.env.PROJECT_ID

async function init(){
    console.log("execiting the script")
    outDirPath = path.join(__dirname,'output')
    const p = exec(`cd ${outDirPath} && npm install &&npm run build`)
    p.stdout.on('data', function(data){
        console.log(data.toString())
    })
     p.stdout.error('error', function(data){
        console.log('Error',data.toString())
    })
     p.on('close', async function(){
        console.log("Build Completed")
        const distFolderPath = path.join(__dirname,'output', 'dist')
        const distFolderContents = fs.readdirSync(distFolderPath, {recursive:true})

        for (const filepath of distFolderContents){
            if(fs.lstatSync(filepath).isDirectory()) continue;

            const command = new PutObjectCommand({
                Bucket:'',
                Key:`__output/${PROJECT_ID}/${filepath}`,
                Body:fs.createReadStream(filepath),
                ContentType: mime.lookup(filepath)
            })
            await s3client.send(command)
        }
        console.log("Done")
    })
}