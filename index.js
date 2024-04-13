const MySynoSSclient = require("./MySynoSSclient");

sleep = function(ms) {
    // add ms millisecond timeout before promise resolution
    return new Promise(resolve => setTimeout(resolve, ms))
}

let opts = {
    replaceHostPart: true,
    replacePortPart: true,
    ignoreCertErrors: true
}

opts.protocol = process.env.SYNO_PROTO
opts.host = process.env.SYNO_HOST
opts.port = process.env.SYNO_PORT
opts.user = process.env.SYNO_USER
opts.password = process.env.SYNO_PASS

doIt = async function(){
    try{
        this.client = new MySynoSSclient(opts, "Test");
	
	//let loginInfo = await this.client.login(false)
	//console.log(JSON.stringify(loginInfo, null, 2))

        //let camMapping = await this.client.getCamIds()
        // // let camIdNameMapping = camMapping.idNameMapping
        //let camIds = camMapping.camIds
        
        //let getCamStreamInfo = await this.client.getCamStreamInfo(camIds)
        //console.log(JSON.stringify(getCamStreamInfo, null, 2))

        // let presetInfo = {}
        // for (let camIdx = 0; camIdx < camIds.length; camIdx++){
        //     let camId = camIds[camIdx]
        //     let camPTZPresetInfo = await this.client.getPTZPresetInfoOfOneCam(camId)
        //     presetInfo[camId] = camPTZPresetInfo
        //     // console.log("PTZPresetInfo of cam with id: "+camId + " and name: "+camIdNameMapping[camId]+":")
        //     // console.log(JSON.stringify(camPTZPresetInfo,null,2))
        // }

        // let curPTZInfo = presetInfo[2]
        // let success = await this.client.goPTZPosition(2, curPTZInfo[1].position)
        // console.log("Set PTZ success: "+success)

        // let presetInfos = await this.client.getPTZPresetInfoOfCams(camIds, true)
        // console.log(JSON.stringify(presetInfos, null, 2))

        console.log("Gathering all info about all cameras of the DiskStation")
        let allInfos = await this.client.getAllInfosOfAllCams(true)
        console.log(JSON.stringify(allInfos, null, 2))
    } catch (err){
        if (err.name === "LoginError"){
            console.log("LOGIN ERROR")
            console.log(err)
        } else {
            console.error(err)
        }
    } finally{
        console.log("Trying to logout finally")
        try {
            await this.client.logout()
        } catch (logoutErr) {
            console.log("Logout not possible")
            console.log(logoutErr)
        }
    }
}

doIt()
