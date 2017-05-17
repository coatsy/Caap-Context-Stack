// This loads the environment variables from the .env file
require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');
var azure = require('azure-storage');


// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users 
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector);

// root dialog
bot.dialog('/', function (session, args) { 

    // if the user types 'subscribe' then they wish to be notified when new leaders occur for segments they are interested in
    if (session.message.text === "subscribe") {
        session.beginDialog('/confirmStravaDetails');
    }
});

// handle the proactive initiated dialog
bot.dialog('/confirmStravaDetails', [function (session) {
    builder.Prompts.text(session, "What is your Strava name?");
},
function (session, results) {
    session.dialogData.name = results.response;
    builder.Prompts.text(session, "What is your Strava Group name?");
},
function (session, results) {

    session.dialogData.group = results.response;

    var savedMessage = session.message;

    var tableSvc = azure.createTableService(process.env.AZURE_STORAGE_CONNECTION);

    tableSvc.createTableIfNotExists('stravapeople', function(error, result, response){
        if(!error){
            // Table exists or created

        } else {
            session.send(error.message);
        }
    });

    var entGen = azure.TableUtilities.entityGenerator;
    var task = {
        PartitionKey: entGen.String('stravaSubscribers'),
        RowKey: entGen.String(savedMessage.address.conversation.id),
        ConversationId: entGen.String(savedMessage.address.conversation.id),
        UserId: entGen.String(savedMessage.address.user.id),
        BotId: entGen.String(savedMessage.address.bot.id),
        BotName: entGen.String(savedMessage.address.bot.name),
        MessageId: entGen.String(savedMessage.address.id),
        ChannelId: entGen.String(savedMessage.address.channelId),
        ServiceUrl: entGen.String(savedMessage.address.serviceUrl),
        StravaName: entGen.String(session.dialogData.name),
        StravaGroup: entGen.String(session.dialogData.group)
    };

    tableSvc.insertOrReplaceEntity('stravapeople',task, function (error, result, response) {
        if(!error){
            // Entity inserted
        }
    });

    session.endDialog('Congratulations you have now subscribed to Strava notifications!')
}]);

