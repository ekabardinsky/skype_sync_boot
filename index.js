const SkypeAdapter = require('./SkypeAdapter');
const SlackAdapter = require('./SlackAdapter');
const integrations = require("./configs/integrations");

const skypeUsername = integrations.skype.username ? integrations.skype.username : Buffer.from(integrations.skype.username64, 'base64').toLocaleString();
const skypePassword = integrations.skype.password ? integrations.skype.password : Buffer.from(integrations.skype.password64, 'base64').toLocaleString();

const slackPipes = integrations.slack && integrations.slack.pipes ? integrations.slack.pipes : null;

let skype = null;

if (skypeUsername && skypePassword) {
    // init adapter
    skype = new SkypeAdapter(skypeUsername, skypePassword);
    (async () => {
        try {
            await skype.initIntegration();
        } catch (e) {
            console.log('Get error to connect with live.com');
            console.log(e)
            process.exit(1)
        }
    })();
}

if (slackPipes) {
    (async () => {
        try {
            await (new SlackAdapter()).initIntegration(skype);
        } catch (e) {
            console.log(e)
            process.exit(1)
        }
    })();
}
