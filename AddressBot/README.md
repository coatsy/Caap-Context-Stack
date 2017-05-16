A simple bot that confirms the current location of the user.
If the user is using Cortana then the address is potentially part of their userInfo and therefore the bot uses this address. 
If not using Cortana or their userInfo does not contain their address then the bot asks the user to confirm their address. To confirm
their address the bot uses the location-dialog as per this https://github.com/Microsoft/BotBuilder-Location/tree/master/Node 

Ensure you complete the .env with your Application ID and Password and your Bing API key
