const express = require("express")
const httpProxy = require("http-proxy")
const dotenv = require("dotenv")
dotenv.config()
const PORT = process.env.PORT || 8000
const app = express()
const proxy = httpProxy.createProxy()
app.use((req,res)=>{
    const hostname = req.hostname;
    const subdomain = hostname.split(".")[0];
    const resolveTo = `${process.env.BASE_PATH}/${subdomain}`

    proxy.web(req,res, {target: resolveTo, changeOrigin: true})
})

proxy.on("proxyReq", (proxyReq,req,res)=>{
    const url = req.url
    if(url ==='/'){
        proxyReq.path += "index.html"
    }
})

app.listen(PORT , ()=>{console.log(`Proxy server running on ${PORT}`)})

