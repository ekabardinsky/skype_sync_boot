const request = require('request-promise');

class SlackAdapter {
    constructor(slackWebHook) {
        this.slackWebHook = slackWebHook;
    }

    async send(from, content) {
        const body = {
            username: from,
            text: this.cleanMessage(content)
        };
        console.log(`Send message to: ${from}`);

        const response = await request({
            method: 'POST',
            body,
            uri: this.slackWebHook,
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