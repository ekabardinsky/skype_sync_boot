const skypeHttp = require("skype-http");
const request = require('request-promise');
const UriObjectUtils = require('./UriObjectUtils');

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

    const me = api.context.username;

    // log available conversation
    const contacts = await api.getContacts();
    const conversations = await api.getConversations();
    console.log('Available contacts:');
    console.log(JSON.stringify(contacts, null, 2));
    console.log('Available conversation:');
    console.log(JSON.stringify(conversations, null, 2));

    // Log every event
    api.on("event", (event) => {
        if (event.resourceType === 'NewMessage') {
            onNewMessage(event);
        }
    });
    api.on("Text", onMessage);
    api.on("RichText", onMessage);
    api.on("NewMessage", onNewMessage);

    await api.listen();

    function onNewMessage(event) {
        if (event.resource.type !== 'RichText'
            && event.resource.type !== 'Text'
            && event.resource.type !== 'RichText/UriObject'
            && event.resource.type !== 'RichText/Media_GenericFile'
            && event.resource.type !== 'RichText/Media_Video') {
            // wrong message type - just skip
            return;
        }

        const content = event.resource.content;
        const toId = event.resource.conversation;
        const toThread = event.resource.native.threadtopic;
        const from = event.resource.native.imdisplayname;
        const fromId = event.resource.from.username;
        const toTitle = toThread ? toThread : contacts.find(contact => contact.personId === toId).displayName;

        if (fromId == me) {
            // outgoing message
            const triggeredIntegration = require("./configs/integrations").pipes.find(integration =>
                (!toThread && toId.toLowerCase().includes(integration.from.toLowerCase()))
                || (toThread && toThread.toLowerCase().includes(integration.from.toLowerCase()))
            );

            if (triggeredIntegration) {
                console.log(`Sent a message to the target in the following integration: ${JSON.stringify(triggeredIntegration)}`);
                (async () => {
                    const direction = `"${from}" >>> "${toTitle}"`;
                    console.log(`Try to sync message ${direction}`);
                    await send(`${direction}`, content, triggeredIntegration, event.resource, api)
                })();
            }
        }
    }

    function getConversationByTarget(target) {
        const conversation = conversations.find(conversation => {
            return conversation.id.toLowerCase().includes(target.toLowerCase()) ||
                (conversation.threadProperties && target.toLowerCase().includes(conversation.threadProperties.topic.toLowerCase()))
        });

        if (conversation) {
            return conversation.id;
        }

        return contacts.find(contact => contact.personId.toLowerCase().includes(target.toLowerCase())).personId;
    }

    function onMessage(event) {
        if (event.type !== 'RichText'
            && event.type !== 'Text'
            && event.type !== 'RichText/UriObject'
            && event.type !== 'RichText/Media_GenericFile'
            && event.type !== 'RichText/Media_Video') {
            // wrong message type - just skip
            return;
        }

        // new messages
        const fromId = event.conversation;
        const fromUser = event.native.imdisplayname;
        const fromThread = event.native.threadtopic;
        const content = event.content;

        const triggeredIntegration = require("./configs/integrations").pipes.find(integration =>
            (!fromThread && fromId.toLowerCase().includes(integration.from.toLowerCase()))
            || (!fromThread && fromUser.toLowerCase().includes(integration.from.toLowerCase()))
            || (fromThread && fromThread.toLowerCase().includes(integration.from.toLowerCase()))
        );

        if (triggeredIntegration) {
            console.log(`Got a message for the following integration: ${JSON.stringify(triggeredIntegration)}`);
            (async () => {
                const userTitle = getUserTitle(fromUser, fromThread);
                console.log(`Try to send message from ${userTitle}`);
                await send(userTitle, content, triggeredIntegration, event, api)
            })();
        }
    }

    function getUserTitle(fromUser, fromThread) {
        if (!fromThread || fromUser === fromThread) {
            return fromUser;
        } else {
            return `"${fromThread}" <<< "${fromUser}"`;
        }
    }

    async function send(from, content, integration, event, api) {
        if (integration.slackWebHook) {
            await sendSlack(from, content, integration.slackWebHook);
        }
        if (integration.skypeTarget) {
            await sendSkype(event, api, integration.skypeTarget);
        }
    }

    async function sendSkype(event, api, target) {
        const conversationId = getConversationByTarget(target);
        if (event.type === 'RichText/UriObject' || event.type === 'RichText/Media_GenericFile' || event.type === 'RichText/Media_Video') {
            const utils = new UriObjectUtils(api);
            let uri = event.uri;

            if (event.type === 'RichText/Media_Video') {
                uri += '/views/video';
            }  else if (event.uri_thumbnail.includes('/views/original')) {
                uri += '/views/original';
            } else {
                uri += '/views/imgpsh_mobile_save_anim';
            }

            const destinationFileName = `temp/${new Date().getTime()}_${event.original_file_name}`;

            await utils.downloadUriObject(uri, destinationFileName);
            const upload = await new UriObjectUtils().uploadFile(destinationFileName, event.original_file_name);

            const content = `<a href="${upload.url}">${upload.pageUrl}</a>`;

            await api.sendMessage({textContent: content}, conversationId)
        } else {
            // the common case
            const textContent = getQuote(event);
            await api.sendMessage({textContent: textContent}, conversationId)
        }
    }

    function getQuote(event) {
        const timestamp = Math.round(event.composeTime.getTime() / 1000);
        return `<quote author="${event.from.username}" authorname="${event.native.imdisplayname}" timestamp="${timestamp}" conversation="${event.conversation} messageid="${event.id}"><legacyquote>[${timestamp}] ${event.native.imdisplayname}: </legacyquote>${event.native.content}<legacyquote>&lt;&lt;&lt; </legacyquote></quote>`;
    }

    async function sendSlack(from, content, slackWebHook) {
        const body = {
            username: from,
            text: cleanMessage(content)
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

    function cleanMessage(message) {
        return message
            .replace(/<quote .*><legacyquote>/, '```\n<legacyquote>')
            .replace(/<legacyquote>/g, '')
            .replace(/<\/legacyquote>/g, '')
            .replace(/<\/quote>/g, '```\n')
            .replace(/\[.*\]/, '')
            .replace(/<<</, '')
            .replace(/&lt;&lt;&lt;/g, '');
    }
})();

