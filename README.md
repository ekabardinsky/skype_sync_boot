# Skype sync boot
Skype sync bot help you to listen messages in skype and resend them into the slack/skype. I don't care why do you need that, but this bot can do that.

#### Steps to get sync bot configured:
* Create/configure `integrations.json` to point up which messages should gone to the slack (please take a look at `integrations.json.example` file)
* Build a docker image, to run it in background: `docker build --tag="skype-sync-boot" .`
* Run the image: `docker run --name skype-boot --restart always -v path/to/your/configs:/configs -d skype-sync-boot`
#### Or just start it by the following command:
```shell script
node index.js
```
#### Update integrations.json
You can update any integrations and changes will be applied immediately.
To update username/password - you need to restart application