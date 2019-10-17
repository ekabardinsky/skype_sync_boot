# Skype sync boot
Skype sync bot help you to listen messages in slack/skype and resend them into the slack/skype. I don't care why do you need that, but this bot can do that.

#### Steps to get sync bot configured:
* Create/configure `integrations.json` to point up which messages should gone to the slack (please take a look at `integrations.json.example` file)
* Build a docker image, to run it in background: `docker build --tag="skype-sync-boot" .`
* Run the image: `docker run --name skype-boot -v path/to/your/configs:/configs -d skype-sync-boot`

**NOTE: Microsoft can block login to the skype if unusual activity is detected (maybe you trying to run this bot on dedicated server or using VPN).
Please approve that login (see email notification) or try to run bot on your local machine. Also, try to login to the web version. Sometimes microsoft want to show you some notifications before you access skype. This prevent skype-boot to scrab token.**

#### Or just start it by the following command:
```shell script
node index.js
```
#### Notes
1. If case if you create new skyp chat - don't forget to accept invitation by skype user used in integration
2. To update username/password - you need to restart application
3. To reflect integration.json update - you need to restart application
4. Something broken or not works - you need to restart application