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

    async uploadFile(targetFilePath, originFileName) {
        const uri = 'https://anonfile.com/api/upload';
        var options = {
            method: 'POST',
            uri,
            formData: {
                file: {
                    value: fs.createReadStream(targetFilePath),
                    options: {
                        filename: originFileName
                    }
                }
            },
            headers: {
                /* 'content-type': 'multipart/form-data' */ // Is set automatically
            }
        };

        const upload = JSON.parse(await request(options));

        const page = await request(upload.data.file.url.full);

        const matches = page.match(/href=\"(.*)\"><img/);
        return {
            url: matches[1],
            pageUrl: upload.data.file.url.full
        };
    }
}

module.exports = UriObjectUtils;