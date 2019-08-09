# skype_sync_boot

Skype sync bot help you to listen messages in skype and resend them into the slack. I don't care why do you need that, but this bot can do that.

#### Firstly, configure integrations.json to point up which messages should gone to the slack

#### To start listen skype chats and forward messages to the slack, just run the following command:
```shell script
export SKYPE_LOGIN=login; export SKYPE_PASSWORD=password; node index.js
```