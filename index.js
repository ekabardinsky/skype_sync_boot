const skypeHttp = require("skype-http");
const integrations = require("./integrations");
const request = require('request-promise');

const username = process.env.SKYPE_LOGIN;
const password = process.env.SKYPE_PASSWORD;

(async () => {
    console.log(`Try to login using "${username}" username`);
    const api = await skypeHttp.connect({
        credentials: {
            username,
            password
        }
    });

    // log available conversation
    const conversations = await api.getConversations();
    console.log('Available conversations');
    console.log(JSON.stringify(conversations, null, 2));

    // Log every event
    api.on("Text", onMessage);
    api.on("RichText", onMessage);

    await api.listen();

    function onMessage(event) {
        console.log(JSON.stringify(event));
        // new messages
        const fromId = event.conversation;
        const fromUser = event.native.imdisplayname;
        const fromThread = event.native.threadtopic;
        const content = event.content;

        const triggeredIntegration = integrations.pipes.find(integration =>
            (!fromThread && fromId.toLowerCase().includes(integration.from.toLowerCase()))
            || (!fromThread && fromUser.toLowerCase().includes(integration.from.toLowerCase()))
            || (fromThread && fromThread.toLowerCase().includes(integration.from.toLowerCase()))
        );

        if (triggeredIntegration) {
            console.log(`Got a message for the following integration${JSON.stringify(triggeredIntegration)}`);
            (async () => {
                const userTitle = getUserTitle(fromUser, fromThread);
                console.log(`Try to send message from ${userTitle}`);
                await send(userTitle, content, triggeredIntegration)
            })();
        }
    }

    function getUserTitle(fromUser, fromThread) {
        if (!fromThread || fromUser === fromThread) {
            return fromUser;
        } else {
            return `From "${fromUser}" in "${fromThread}"`;
        }
    }

    async function send(from, content, integration) {
        if (integration.type.toLowerCase() === 'slack') {
            await sendSlack(from, content, integration.slackWebHook);
        }
    }

    async function sendSlack(from, content, slackWebHook) {
        const body = {
            username: from,
            text: content
        };
        console.log(`Send message to: ${from}`);

        const response = await request({
            method: 'POST',
            body,
            uri: slackWebHook,
            json: true
        });

        console.log(`Response from webhook: ${JSON.stringify(response)}`);
    }
})();

