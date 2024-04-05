const axios = require("axios").default;
const https = require("https");

class SynoSSClient {
    //webapi/query.cgi?api=SYNO.API.Info&method=Query&version=1
    #initClient;

    //webapi/query.cgi?api=SYNO.API.Auth
    //webapi/query.cgi?api=SYNO.SurveillanceStation.Camera
    //webapi/query.cgi?api=SYNO.SurveillanceStation.PTZ.Preset
    #authenticatedClient;

    //Auth API Version
    #authApiVersion

    //Camera API Version
    #cameraApiVersion

    //PTZ Preset API Version
    #ptzPresetApiVersion

    constructor(opts, modulePath) {
        this._init(opts);
    }

    async _init(opts) {
        this.opts = opts

        let baseURL = opts.host+":"+opts.port+"/webapi"
        if (opts.protocol === "http"){
            this.#initClient = axios.create({
                baseURL: "http://"+baseURL+"/query.cgi?api=SYNO.API.Info&method=Query&version=1",
            });

            this.#authenticatedClient = axios.create({
                baseURL: "http://"+baseURL,
            });
        } else {
            this.#initClient = axios.create({
                baseURL: "https://"+baseURL+"/query.cgi?api=SYNO.API.Info&method=Query&version=1",
                httpsAgent: new https.Agent({
                    // This setting disables SSL certificate errors and reduces security
                    rejectUnauthorized: !opts.ignoreCertErrors
                })
            });

            this.#authenticatedClient = axios.create({
                baseURL: "https://"+baseURL,
                httpsAgent: new https.Agent({
                    // This setting disables SSL certificate errors and reduces security
                    rejectUnauthorized: !opts.ignoreCertErrors
                })
            });
        }

        this.allApisInfo = await this.queryApiVersions()
        if (this.allApisInfo != null){
            this.#authApiVersion = this.allApisInfo["SYNO.API.Auth"].maxVersion
            console.log("AuthAPIVersion: "+this.#authApiVersion)

            this.#cameraApiVersion = this.allApisInfo["SYNO.SurveillanceStation.Camera"].maxVersion
            console.log("cameraAPIVersion: "+this.#cameraApiVersion)

            this.#ptzPresetApiVersion = this.allApisInfo["SYNO.SurveillanceStation.PTZ.Preset"].maxVersion
            console.log("ptzPresetApiVersion: "+this.#ptzPresetApiVersion)

            this.loginInfo = await this.login(opts.user, opts.password)
            console.log(JSON.stringify(this.loginInfo, null, 2))

            this.camInfo = await this.getCams()

            for (let camIdx = 0; camIdx < this.camInfo.length; camIdx++){
                let curCamId = this.camInfo[camIdx].id

                let paths = await this.getGetLiveViewPath(curCamId)
                console.log("Cam["+this.camInfo[camIdx].id+"]("+this.camInfo[camIdx].newName+"): "+paths[0].mjpegHttpPath)
            }
        }
    }

    queryApiVersions(){
        return this.#initClient.get()
            .then((response) => {
                let allApis = response.data.data
                return allApis
            }).catch(error => {
                console.error("Error while trying to query the available APIs and their supported versions!",error.errno, error.code, error.syscall, error.hostname)
            })
    }

    login(username, password) {
        let loginObj = {
            api:"SYNO.API.Auth",
            version: this.#authApiVersion,
            method: "login",
            account: username,
            passwd: password,
            //session: "SurveillanceStation",
            format: "sid",
            enable_syno_token: "yes"
        }
        this.successfulLogin = false

        return this.#authenticatedClient
        .get(
            "/entry.cgi?",{
                params: loginObj
            })
            .then((response) => {
                if (response.data.success){
                    this.successfulLogin = true
                    return {sid: response.data.data.sid, synotoken: response.data.data.synotoken}
                } else {
                    return {error: response.data.error.code}
                }
            }).catch(error => {            
                console.error("Error during login request!",error.errno, error.code, error.syscall, error.hostname);
                return null
            }
        )
    }

    getCams(){
        if (this.successfulLogin){
            let queryObj = {
                api:"SYNO.SurveillanceStation.Camera",
                method: "List",
                version: this.#cameraApiVersion,
                _sid: this.loginInfo.sid,
                SynoToken: this.loginInfo.synotoken
            }

            return this.#authenticatedClient
                .get(
                    "/entry.cgi?",{
                        params: queryObj,
                    })
                    .then((response) => {
                        // console.log(response)
                        console.log(JSON.stringify(response.data, null, 2))
                        if (response.data.success){
                            return response.data.data.cameras
                        } else {
                            return {error: response.data.error.code}
                        }
                    }).catch(error => {            
                        console.error("Error during login request!",error.errno, error.code, error.syscall, error.hostname);
                        return null
                    }
                )
        } else {
            return null
        }
    }

    getGetLiveViewPath(camId){
        if (this.successfulLogin){
            let queryObj = {
                api:"SYNO.SurveillanceStation.Camera",
                method: "GetLiveViewPath",
                version: this.#cameraApiVersion,
                _sid: this.loginInfo.sid,
                SynoToken: this.loginInfo.synotoken,
                idList: ""+camId
            }

            return this.#authenticatedClient
                .get(
                    "/entry.cgi?",{
                        params: queryObj,
                    })
                    .then((response) => {
                        // console.log(response)
                        // console.log(JSON.stringify(response.data, null, 2))
                        if (response.data.success){
                            return response.data.data
                        } else {
                            return {error: response.data.error.code}
                        }
                    }).catch(error => {            
                        console.error("Error during login request!",error.errno, error.code, error.syscall, error.hostname);
                        return null
                    }
                )
        } else {
            return null
        }
    }
}

module.exports = SynoSSClient;
