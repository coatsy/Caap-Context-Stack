// This loads the environment variables from the .env file
require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');
var locationDialog = require('botbuilder-location');
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

var lat;
var lon;

var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL);
var bot = new builder.UniversalBot(connector);
bot.recognizer(recognizer);

// Register BotBuilder-Location dialog
bot.library(locationDialog.createLibrary(process.env.BING_MAPS_API_KEY));

bot.dialog('/', [
    function (session, args, next) {
        if (!session.userData.name) {
            session.beginDialog('/profile');
        } else {
            next();
        }
    },
    function (session, results) {
        session.send('Hello %s!', session.userData.name);
    }
])
.triggerAction({
    matches: 'None'
});

bot.dialog('/profile', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.userData.name = results.response;
        session.endDialog();
    }
]);

// handle the proactive initiated dialog
bot.dialog('/subscribe', [function (session) {
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
        UserName: entGen.String(savedMessage.address.name),
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
    session.send('Congratulations you have now subscribed to Strava notifications!');
}])
.triggerAction({
    matches: 'subscribe',
    intentThreshold: 0.6
});

bot.dialog('/findRun', [
    function (session, args, next) {

        // reset the lon and lat before each request
        // todo: give the user the opportunity change or keep their current location
        session.userData["lat"] = null;
        session.userData["lon"] = null;

        if (session.message && session.message.entities) {
            var userInfo = session.message.entities.find((e) => {
                    return e.type === 'UserInfo';
                });

                if (userInfo) {

                    var currentLocation = userInfo['currentLocation'];
                    if (currentLocation)
                    {
                        //Access the latitude and longitude values of the users location.
                        session.userData["lat"] = currentLocation.Hub.Latitude;
                        session.userData["lon"] = currentLocation.Hub.Longitude;
                    }
                }
        };

        if (!session.userData["lat"] && !session.userData["lon"]) {
            session.replaceDialog('/findLocation');
        } else {
            session.endDialog('Thanks, I will find routes based on your current address %s %s', session.userData["lat"], session.userData["lon"])
        }
    }
])
.triggerAction({
    matches: 'findRun',
    intentThreshold: 0.6
});

bot.dialog('/findBike', [
    function (session, args, next) {

        // reset the lon and lat before each request
        // todo: give the user the opportunity change or keep their current location
        session.userData["lat"] = null;
        session.userData["lon"] = null;

        if (session.message && session.message.entities) {
            var userInfo = session.message.entities.find((e) => {
                    return e.type === 'UserInfo';
                });

                if (userInfo) {

                    var currentLocation = userInfo['currentLocation'];
                    if (currentLocation)
                    {
                        //Access the latitude and longitude values of the users location.
                        session.userData["lat"] = currentLocation.Hub.Latitude;
                        session.userData["lon"] = currentLocation.Hub.Longitude;    
                    }
                }
        };

        if (!session.userData["lat"] && !session.userData["lon"]) {
            session.replaceDialog('/findLocation');
        } else {
            session.endDialog('Thanks, I will find routes based on your current address %s %s', session.userData["lat"], session.userData["lon"])
        }
    }
])
.triggerAction({
    matches: 'findBike',
    intentThreshold: 0.6
});

// Main request address dialog, invokes BotBuilder-Location
bot.dialog('/findLocation', [
    function (session) {
        // Ask for address
     var options = {
            prompt: "Where is your current location?",
            useNativeControl: true,
            reverseGeocode: true,
			skipFavorites: false,
			skipConfirmationAsk: true,
            requiredFields:
                locationDialog.LocationRequiredFields.streetAddress |
                locationDialog.LocationRequiredFields.locality |
                locationDialog.LocationRequiredFields.region |
                locationDialog.LocationRequiredFields.postalCode |
                locationDialog.LocationRequiredFields.country
        };

        locationDialog.getLocation(session, options);
    },
    function (session, results) {
        if (results.response) {
            var place = results.response;
            session.userData["lon"] = place.geo.longitude;
            session.userData["lat"] = place.geo.latitude;

            session.send('Thanks, I will find routes based on your current address %s %s', session.userData["lat"], session.userData["lon"]);
            session.endDialog();
        }
    }
]);