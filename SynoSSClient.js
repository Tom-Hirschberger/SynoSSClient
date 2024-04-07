const axios = require("axios").default;
const https = require("https");

class LogoutError extends Error {
    constructor(message, cause) {
      super(message);
      this.cause = cause
      this.name = "LogoutError";
    }
}

class ListCameraError extends Error {
    constructor(message, cause) {
      super(message);
      this.cause = cause
      this.name = "ListCameraError";
    }
}

class GetCameraStreamInfoError extends Error {
    constructor(message, cause) {
      super(message);
      this.cause = cause
      this.name = "GetCameraStreamInfoError";
    }
}

class ListPTZInfoError extends Error {
    constructor(message, cause) {
      super(message);
      this.cause = cause
      this.name = "ListPTZInfoError";
    }
}

class SetPTZPresetError extends Error {
    constructor(message, cause) {
      super(message);
      this.cause = cause
      this.name = "SetPTZPresetError";
    }
}

class SynoSSClient {
    //Look-at: https://global.download.synology.com/download/Document/Software/DeveloperGuide/Package/SurveillanceStation/All/enu/Surveillance_Station_Web_API.pdf

    //webapi/query.cgi?api=SYNO.API.Info&method=Query&version=1
    #queryClient;

    //webapi/entry.cgi?api=SYNO.API.Auth
    //webapi/entry.cgi?api=SYNO.SurveillanceStation.Camera
    //webapi/entry.cgi?api=SYNO.SurveillanceStation.PTZ.Preset
    #entryClient;

    #apiVersions = null

    //The login object containing the sid and token
    #loginInfo

    //The inital options set during construction
    #opts

    constructor(opts) {
        this._init(opts);
    }

    _init(opts) {
        this.#loginInfo = null
        this.#opts = opts

        let baseURL = opts.host+":"+opts.port+"/webapi"
        if (opts.protocol === "http"){
            this.#queryClient = axios.create({
                baseURL: "http://"+baseURL+"/query.cgi?api=SYNO.API.Info&method=Query&version=1",
            });

            this.#entryClient = axios.create({
                baseURL: "http://"+baseURL+"/entry.cgi?",
            });
        } else {
            this.#queryClient = axios.create({
                baseURL: "https://"+baseURL+"/query.cgi?api=SYNO.API.Info&method=Query&version=1",
                httpsAgent: new https.Agent({
                    // This setting disables SSL certificate errors and reduces security
                    rejectUnauthorized: !opts.ignoreCertErrors
                })
            });

            this.#entryClient = axios.create({
                baseURL: "https://"+baseURL,
                httpsAgent: new https.Agent({
                    // This setting disables SSL certificate errors and reduces security
                    rejectUnauthorized: !opts.ignoreCertErrors
                })
            });
        }
    }

    getLoginInfo(){
        return this.#loginInfo
    }

    queryApiVersions(useCachedData){
        if (typeof useCachedData === "undefined"){
            useCachedData = true
        }
        const self = this
        if (useCachedData && (self.#apiVersions != null)){
            console.log("Cached information about the api versions available. Using it.")
            return new Promise(function(myResolve, myReject) {
                    myResolve(self.#apiVersions)
                });
        } else {
            console.log("Either no cached api version information is available or we should not use it. Query the api version information.")
            return self.#queryClient.get()
                .then((response) => {
                    let newVersionInfo = {}
                    for (let curApi in response.data.data){
                        newVersionInfo[curApi] = response.data.data[curApi].maxVersion
                    }
                    self.#apiVersions = newVersionInfo
                    return newVersionInfo
                })
        }
    }

    login(useCachedData) {
        if (typeof useCachedData === "undefined"){
            useCachedData = true
        }
        const self = this
        if (useCachedData && (self.#loginInfo != null)){
            console.log("Login not neccessary. Using cached login information.")
            return new Promise(function(myResolve, myReject) {
                myResolve(self.#loginInfo)
            });
        } else {
            console.log("Either no cached information is available or should be used. Trying to login.")

            return self.logout(useCachedData).then( () => 
                self.queryApiVersions(true).then(
                    (apiVersions) => {
                        let api = "SYNO.API.Auth"
                        let loginObj = {
                            api: api,
                            version: apiVersions[api],
                            method: "login",
                            account: self.#opts.user,
                            passwd: self.#opts.password,
                            session: "SurveillanceStation",
                            format: "sid",
                            enable_syno_token: "yes"
                        }

                        return self.#entryClient
                            .get(
                                "",{
                                    params: loginObj
                                })
                                .then((response) => {
                                    if (response.data.success){
                                        self.#loginInfo = {sid: response.data.data.sid, synotoken: response.data.data.synotoken}
                                        return self.#loginInfo
                                    } else {
                                        throw new Error("Login not possible",{cause: {returnCode: response.data.error.code}})
                                    }
                                })
                    }
                )
            )
        }
    }

    logout(useCachedData) {
        if (typeof useCachedData === "undefined"){
            useCachedData = true
        }
        const self = this
        if (self.#loginInfo != null){
            console.log("Trying to logout.")

            return self.queryApiVersions(useCachedData).then(
                (apiVersions) => {
                    let api = "SYNO.API.Auth" 
                    let logoutObj = {
                        api: api,
                        version: apiVersions[api],
                        method: "logout",
                        session: "SurveillanceStation",
                        _sid: self.#loginInfo.sid,
                        SynoToken: self.#loginInfo.synotoken
                    }

                    return self.#entryClient
                        .get(
                            "",{
                                params: logoutObj
                            })
                            .then((response) => {
                                if (response.data.success){
                                    self.#loginInfo = null
                                    return new Promise(function(myResolve, myReject) {
                                        myResolve(true)
                                    });
                                } else {
                                    throw new LogoutError("Logout not possible. API retured with error.",{cause: {returnCode: response.data.error.code}})
                                }
                            })
                }
            )
        } else {
            return new Promise(function(myResolve, myReject) {
                myResolve(true)
            });
        }
    }

    getCams(useCachedData){
        const self = this

        if (typeof useCachedData === "undefined"){
            useCachedData = true
        }

        return self.login(useCachedData).then(
            () => self.queryApiVersions(true).then( 
                (apiVersions) => {
                    let api = "SYNO.SurveillanceStation.Camera"
                    let camListObj = {
                        api: api,
                        method: "List",
                        version: apiVersions[api],
                        _sid: this.#loginInfo.sid,
                        SynoToken: this.#loginInfo.synotoken
                    }

                    return this.#entryClient
                        .get(
                            "",{
                                params: camListObj,
                            })
                            .then((response) => {
                                if (response.data.success){
                                    let camIdMapping = {}
                                    for (let camIdx = 0; camIdx < response.data.data.cameras.length; camIdx ++){
                                        let camObj = response.data.data.cameras[camIdx]
                                        camIdMapping[camObj.newName] = camObj.id
                                    }

                                    return camIdMapping
                                } else {
                                    throw new ListCameraError("Could not list cameras", {cause: {returnCode: response.data.error.code}})
                                }
                            }).catch(error => {       
                                throw new ListCameraError("Could not list cameras", {cause: { errno: error.errno, code: error.code, syscall: error.syscall, hostname: error.hostname}})
                            }
                        )
                }
            )
        )
    }

    getCamStreamInfo(camIds, useCachedData){
        const self = this

        if (typeof useCachedData === "undefined"){
            useCachedData = true
        }

        if (typeof camIds === "undefined"){
            throw new GetCameraStreamInfoError("Could not get stream info of the cameras. The list of camera ids is missing!")
        }

        camIds = camIds.join(",")

        return self.login(useCachedData).then(
            () => self.queryApiVersions(true).then( 
                (apiVersions) => {
                    let api = "SYNO.SurveillanceStation.Camera"
                    let camStreamInfoObj = {
                        api: api,
                        method: "GetLiveViewPath",
                        idList: camIds,
                        version: apiVersions[api],
                        _sid: this.#loginInfo.sid,
                        SynoToken: this.#loginInfo.synotoken
                    }

                    return this.#entryClient
                        .get(
                            "",{
                                params: camStreamInfoObj,
                            })
                            .then((response) => {
                                if (response.data.success){
                                    let camIdStreamMapping = {}

                                    for (let camIdx = 0; camIdx < response.data.data.length; camIdx ++){
                                        let camObj = response.data.data[camIdx]

                                        camIdStreamMapping[camObj.id] = camObj.mjpegHttpPath
                                    }

                                    return camIdStreamMapping
                                } else {
                                    throw new GetCameraStreamInfoError("Could not get stream info of the cameras", {cause: {returnCode: response.data.error.code}})
                                }
                            }).catch(error => {
                                console.log(error)
                                throw new GetCameraStreamInfoError("Could not get stream info of the cameras", {cause: { errno: error.errno, code: error.code, syscall: error.syscall, hostname: error.hostname}})
                            }
                        )
                }
            )
        )
    }
}

module.exports = SynoSSClient;
