const SynoSSClient = require("./SynoSSClient");

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

this.client = new SynoSSClient(opts, "Test");
