// This loads the environment variables from the .env file
require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');


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

    // notifications will have the activity type 'event'
    if (session.message.type === 'event')
    {

    } 


    // if the user types 'subscribe' then they wish to be notified when new leaders occur for segments they are interested in
    if (session.message.text === "subscribe") {
        savedAddress = session.message.address;
        session.send("Hey! You have now subscribed to Segment Leader Board Notifications");
    }
});

// handle the proactive initiated dialog
bot.dialog('/newLeader', function (session, args, next) {
    var segmentName = "Durban Category 4";

    if (session.message.text === "done") {
        session.send("I hope you are not too disappointed!!");
        session.endDialog();
    } else {
        session.send('Hello. Just to let you know, there is new leader for the segment %s. Type "done" to resume', segmentName);
    }
});

