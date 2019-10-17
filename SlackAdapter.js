const request = require('request-promise');
const integrations = require("./configs/integrations").slack;

class SlackAdapter {
    async initIntegration(skype) {
        this.skype = skype;

        const { RTMClient } = require('@slack/rtm-api');

        // Initialize
        const rtm = new RTMClient(integrations.token);

        rtm.on('message', (event) => {
            this.processMessageFromSlack(event);
        });

        // collect contacts
        const members = await this.collectContacts(integrations.token);
        const channels = await this.collectChannels(integrations.token);
        this.contacts = members.members.concat(channels.channels);

        // Connect to Slack
        (async () => {
            await rtm.start();
        })();
    }

    async collectContacts(token) {
        return  await request({
            method: 'GET',
            uri: `https://slack.com/api/users.list?token=${token}`,
            json: true
        });
    }

    async collectChannels(token) {
        return  await request({
            method: 'GET',
            uri: `https://slack.com/api/channels.list?token=${token}`,
            json: true
        });
    }

    async processMessageFromSlack(event) {
        if (event && event.type === "message") {
            const {text, user, channel} = event;

            const sender = this.contacts.find(member => member.id === user) || {real_name: 'unknown user', profile: {}};
            const channelContact = this.contacts.find(member => member.id === channel);

            // recognized sender
            if (sender || channelContact) {
                const senderName = channelContact ? `${sender.real_name} in ${channelContact.name}` : sender.real_name;
                let message = text;

                // loop over contacts and replace mentions
                this.contacts
                    .filter(contact => contact.profile)
                    .forEach(contact => message = message.replace(`<@${contact.id}>`, `@${contact.profile.display_name ? contact.profile.display_name : contact.name}`));

                const target = integrations.pipes
                    .find(pipe => pipe.from === sender.profile.display_name_normalized || pipe.from === sender.name || (channelContact && pipe.from === channelContact.name));

                // pipe for sender found
                if (target){
                    if (target.slackWebHook) {
                        await this.send(senderName, message, target.slackWebHook);
                    } else if (this.skype && target.skypeTarget) {
                        const conversationId = await this.skype.getConversationByTarget(target.skypeTarget);
                        await this.skype.api.sendMessage({textContent: `${senderName}:\n${message}`}, conversationId)
                    }
                }
            }
        }
        console.log(event);
    }

    async send(from, content, slackWebHook) {
        const body = {
            username: from,
            text: this.cleanMessage(content)
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

    cleanMessage(message) {
        return message
            .replace(/<quote .*><legacyquote>/, '```\n<legacyquote>')
            .replace(/<legacyquote>/g, '')
            .replace(/<\/legacyquote>/g, '')
            .replace(/<\/quote>/g, '```\n')
            .replace(/\[.*\]/, '')
            .replace(/<<</, '')
            .replace(/&lt;&lt;&lt;/g, '');
    }


}

module.exports = SlackAdapter;