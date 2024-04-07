const SynoSSClient = require("./SynoSSClient");

sleep = function(ms) {
    // add ms millisecond timeout before promise resolution
    return new Promise(resolve => setTimeout(resolve, ms))
}

let opts = {
    protocol: "http",
    replaceHostPart: true,
    replacePortPart: true,
    ignoreCertErrors: true
}

opts.host = process.env.SYNO_HOST
opts.port = process.env.SYNO_PORT
opts.user = process.env.SYNO_USER
opts.password = process.env.SYNO_PASS

doIt = async function(){
    try{
        this.client = new SynoSSClient(opts, "Test");

        let camIdMapping = await client.getCams()

        let camIds = []
        for (let camName in camIdMapping){
            camIds.push(camIdMapping[camName])
        }
        let getCamStreamInfo = await client.getCamStreamInfo(camIds)
        console.log(JSON.stringify(getCamStreamInfo, null, 2))

        console.log("Trying to logout (1)")
        await this.client.logout()
        console.log("Logged out (1)")
    } catch (err){
        console.error(err)
    }
}

doIt()