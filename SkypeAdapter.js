const skypeHttp = require("skype-http");
const UriObjectUtils = require('./UriObjectUtils');
const SlackAdapter = require('./SlackAdapter');
const cron = require("node-cron");
const integrations = require("./configs/integrations").skype;

class SkypeAdapter {
    constructor(username, password) {
        this.username = username;
        this.password = password;
        this.initConnectionChecker();
    }

    initConnectionChecker() {
        // call this each midnight
        cron.schedule("0 0 * * *", async () => {
            if (this.api) {
                try {
                    console.log("---------------------");
                    console.log(`Reset connection at ${new Date()}`);

                    // stop listening
                    await this.api.stopListening();

                    // and recreate the api
                    await this.initIntegration();

                    console.log("Connection is recreated");
                    console.log("---------------------");
                } catch (e) {
                    console.log("------------------------------Exception occurred during connection reset------------------------------");
                    console.log(e);
                    console.log("---------------------------------------------------------------------------------------------------------");
                    process.exit(1)
                }
            }
        });
    }

    async initIntegration() {
        console.log(`Try to login using "${this.username}" username`);
        this.api = await skypeHttp.connect({
            credentials: {
                username: this.username,
                password: this.password
            }
        });

        // log available conversation
        this.contacts = await this.api.getContacts();
        this.conversations = await this.api.getConversations();
        console.log('Available contacts:');
        console.log(JSON.stringify(this.contacts, null, 2));
        console.log('Available conversation:');
        console.log(JSON.stringify(this.conversations, null, 2));

        // Log every event
        this.api.on("event", (event) => {
            if (event.resourceType === 'NewMessage') {
                this.onNewMessage(event);
            }
        });

        await this.api.listen();
    }

    async onNewMessage(event) {
        if (this.isNotSupportedType(event.resource.type)) {
            // just not handle not supported type
            return;
        }

        const toId = event.resource.conversation;
        const toThread = event.resource.native.threadtopic;
        const from = event.resource.native.imdisplayname;
        const fromId = event.resource.from.username;
        const toTitle = toThread ? toThread : this.contacts.find(contact => contact.personId === toId).displayName;
        if (fromId == this.api.context.username) {
            // outgoing message
            const triggeredIntegration = integrations.pipes.find(integration =>
                (!toThread && toId.toLowerCase().includes(integration.from.toLowerCase()))
                || (toThread && toThread.toLowerCase().includes(integration.from.toLowerCase()))
            );

            if (triggeredIntegration) {
                console.log(`Sent a message to the target in the following integration: ${JSON.stringify(triggeredIntegration)}`);
                const direction = `"${from}" >>> "${toTitle}"`;
                console.log(`Try to sync message ${direction}`);
                await this.send(`${direction}`, triggeredIntegration, event.resource)
            }
        } else {
            // incoming messages
            const fromId = toId;
            const fromThread = toThread;

            const triggeredIntegration = integrations.pipes.find(integration =>
                (!fromThread && fromId.toLowerCase().includes(integration.from.toLowerCase()))
                || (!fromThread && from.toLowerCase().includes(integration.from.toLowerCase()))
                || (fromThread && fromThread.toLowerCase().includes(integration.from.toLowerCase()))
            );

            if (triggeredIntegration) {
                console.log(`Got a message for the following integration: ${JSON.stringify(triggeredIntegration)}`);
                const userTitle = this.getUserTitle(from, fromThread);
                console.log(`Try to send message from ${userTitle}`);
                await this.send(userTitle, triggeredIntegration, event.resource)
            }
        }
    }

    async send(from, integration, event) {
        // check targets
        if (!integration.slackWebHook && !integration.skypeTarget) {
            console.log(`No target specified for the following integration: ${JSON.stringify(integration)}`);
            return;
        }

        // check if we got a media message - upload it to file share and get an uri for that media
        if (event.type === 'RichText/UriObject' || event.type === 'RichText/Media_GenericFile' || event.type === 'RichText/Media_Video') {
            const utils = new UriObjectUtils(this.api);
            let uri = event.uri;

            if (event.type === 'RichText/Media_Video') {
                uri += '/views/video';
            } else if (event.uri_thumbnail.includes('/views/original')) {
                uri += '/views/original';
            } else {
                uri += '/views/imgpsh_mobile_save_anim';
            }

            const destinationFileName = `temp/${new Date().getTime()}_${event.original_file_name}`;

            await utils.downloadUriObject(uri, destinationFileName);
            const upload = await new UriObjectUtils().uploadFile(destinationFileName, event.original_file_name);

            // replace content with uri
            event.native.content = `<a href="${upload.url}">${upload.pageUrl}</a>`;
        }

        // sending messages to targets
        if (integration.slackWebHook) {
            await SlackAdapter().send(from, event.native.content, integration.slackWebHook);
        }
        if (integration.skypeTarget) {
            await this.sendSkype(event, integration.skypeTarget);
        }
    }

    async sendSkype(event, target) {
        const conversationId = this.getConversationByTarget(target);
        const textContent = this.getQuote(event);
        await this.api.sendMessage({textContent: textContent}, conversationId)
    }

    // util functions
    getConversationByTarget(target) {
        const conversation = this.conversations.find(conversation => {
            return conversation.id.toLowerCase().includes(target.toLowerCase()) ||
                (conversation.threadProperties && target.toLowerCase().includes(conversation.threadProperties.topic.toLowerCase()))
        });

        if (conversation) {
            return conversation.id;
        }

        return this.contacts.find(contact => contact.personId.toLowerCase().includes(target.toLowerCase())).personId;
    }

    isNotSupportedType(type) {
        return type !== 'RichText'
            && type !== 'Text'
            && type !== 'RichText/UriObject'
            && type !== 'RichText/Media_GenericFile'
            && type !== 'RichText/Media_Video';
    }

    getUserTitle(fromUser, fromThread) {
        if (!fromThread || fromUser === fromThread) {
            return fromUser;
        } else {
            return `"${fromThread}" <<< "${fromUser}"`;
        }
    }

    getQuote(event) {
        const timestamp = Math.round(event.composeTime.getTime() / 1000);
        return `<quote author="${event.from.username}" authorname="${event.native.imdisplayname}" timestamp="${timestamp}" conversation="${event.conversation} messageid="${event.id}"><legacyquote>[${timestamp}] ${event.native.imdisplayname}: </legacyquote>${event.native.content}<legacyquote>&lt;&lt;&lt; </legacyquote></quote>`;
    }
}

module.exports = SkypeAdapter;