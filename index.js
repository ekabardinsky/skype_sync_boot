const SkypeAdapter = require('./SkypeAdapter');
const integrations = require("./configs/integrations");

// init adapter
const username = integrations.username ? integrations.username : Buffer.from(integrations.username64, 'base64').toLocaleString();
const password = integrations.password ? integrations.password : Buffer.from(integrations.password64, 'base64').toLocaleString();

const skype = new SkypeAdapter(username, password);

(async () => {
    await skype.initIntegration();
})();

