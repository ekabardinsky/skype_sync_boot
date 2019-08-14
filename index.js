const SkypeAdapter = require('./SkypeAdapter');

// init adapter
const username = process.env.SKYPE_LOGIN;
const password = process.env.SKYPE_PASSWORD;
const skype = new SkypeAdapter(username, password);

(async () => {
    await skype.initIntegration();
})();

