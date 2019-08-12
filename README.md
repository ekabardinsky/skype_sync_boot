# Skype sync boot

Skype sync bot help you to listen messages in skype and resend them into the slack/skype. I don't care why do you need that, but this bot can do that.

#### Steps to get sync bot configured:
* Create/configure `integrations.json` to point up which messages should gone to the slack (`from`: skype id for regular user or chat name)
* Build a docker image, to run it in background: `docker build --tag="skype-sync-boot" .`
* Run the image: `docker run --name skype-boot -e SKYPE_LOGIN=login -e SKYPE_PASSWORD=password --restart always -v path/to/your/configs:/configs -d skype-sync-boot`
#### Or just start it by the following command:
```shell script
export SKYPE_LOGIN=login; export SKYPE_PASSWORD=password; node index.js
```