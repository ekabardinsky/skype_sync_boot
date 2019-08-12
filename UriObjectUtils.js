const messagesUri = require("skype-http/messages-uri");
const Incident = require("incident").Incident;
const request = require('request-promise');
const fs = require("async-file");

class UriObjectUtils {

    constructor(api) {
        this.api = api;
    }

    async downloadUriObject(uri, filename) {
        const body = await request({
            uri,
            method: 'GET',
            encoding: "binary",
            headers: {
                Authorization: `skype_token ${this.api.context.skypeToken.value}`
            }
        });

        await fs.writeFile(filename, Buffer.from(body, 'binary'))
    }
}
module.exports = UriObjectUtils;