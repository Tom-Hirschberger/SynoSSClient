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

        let camMapping = await client.getCamIds()
        // let camIdNameMapping = camMapping.idNameMapping
        let camIds = camMapping.camIds
        
        let getCamStreamInfo = await client.getCamStreamInfo(camIds)
        console.log(JSON.stringify(getCamStreamInfo, null, 2))

        let presetInfo = {}
        for (let camIdx = 0; camIdx < camIds.length; camIdx++){
            let camId = camIds[camIdx]
            let camPTZPresetInfo = await this.client.getPTZPresetInfo(camId)
            presetInfo[camId] = camPTZPresetInfo
            // console.log("PTZPresetInfo of cam with id: "+camId + " and name: "+camIdNameMapping[camId]+":")
            // console.log(JSON.stringify(camPTZPresetInfo,null,2))
        }

        let curPTZInfo = presetInfo[2]
        let success = await this.client.goPTZPosition(2, curPTZInfo[1].position)
        console.log("Set PTZ success: "+success)

        console.log("Trying to logout (1)")
        await this.client.logout()
        console.log("Logged out (1)")
    } catch (err){
        console.error(err)
    }
}

doIt()