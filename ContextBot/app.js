
// Import modules
// environment variables
require('dotenv-extended');
// handle dates
var moment = require('moment');
// bot sdks
var builder = require('botbuilder');
var azure = require('botbuilder-azure');
var restify = require('restify');

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create connector and listen for messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

server.post('/api/messages', connector.listen());

// keys for storage
var contextStateKey = 'ConversationContextStack';
var stravaIdKey = 'StarvaId';
var locationKey = 'Location';

// Setup bot with default dialog
var bot = new builder.UniversalBot(connector, function (session) {

    session.send('Welcome to StravaBot');

    // check for stava ID
    var stravaId = session.userData[stravaIdKey];
    if (!stravaId)
    {
        return session.beginDialog('stravaId');
    }

    // check for location
    var location = session.userData[locationKey];
    if (!location)
    {
        return session.beginDialog('location');
    }

    session.beginDialog('stravaQuery');
});

// Azure DocumentDb State Store
var docDbClient = new azure.DocumentDbClient({
    host: process.env.DOCUMENT_DB_HOST,
    masterKey: process.env.DOCUMENT_DB_MASTER_KEY,
    database: process.env.DOCUMENT_DB_DATABASE,
    collection: process.env.DOCUMENT_DB_COLLECTION
});
var botStorage = new azure.AzureBotStorage({ gzipData: false }, docDbClient);

// Set Custom Store
bot.set('storage', botStorage);

bot.dialog('stravaQuery', function(session, args, next){
    // get the current context stack
    var contextState = session.privateConversationData[contextStateKey] || {"contextStack" : []};

    var queryString = session.message.text.trim();

    // send the query off to the query analysis engine
    var queryResponse = executeQuery(queryString, contextState);

    // update the context state
    contextState.contextStack.push(queryResponse.contextState);

    // write the updated context state back to storage
    session.privateConversationData[contextStateKey] = contextState;

    // Write the response back to the user 

    session.send(queryResponse.fullResponse);

    session.endDialog();
});

var CityLabels = {
    Sydney: 'Sydney',
    Seattle: 'Seattle',
    Auckland: 'Auckland'
};
var CityLocations = {
    Sydney: {lat: -33.8696, lon: 151.207},
    Seattle: {lat: 47.60357, lon: -122.3295},
    Auckland: {lat:-36.84732, lon: 174.7628} 
};

bot.dialog('location', new builder.UniversalBot(connector, [function(session){
    builder.Prompts.choice(
            session,
            'Where are you?',
            [CityLabels.Auckland, CityLabels.Seattle, CityLabels.Sydney],
            {
                maxRetries: 3,
                retryPrompt: 'Not a valid option'
            });
},function(session, result){
    if (!result.response) {
        // exhausted attemps and no selection, start over
        session.send('Ooops! Too many attemps :( But don\'t worry, I\'m handling that exception and you can try again!');
        return session.endDialog();
    }

    // on error, start over
    session.on('error', function (err) {
        session.send('Failed with message: %s', err.message);
        session.endDialog();
    });

    // continue on proper dialog
    var selection = result.response.entity;
    switch (selection) {
        case CityLabels.Auckland:
            session.userData[locationKey] = CityLocations.Auckland;
            break;
        case CityLabels.Seattle:
            session.userData[locationKey] = CityLocations.Seattle;
            break;
        case CityLabels.Sydney:
            session.userData[locationKey] = CityLocations.Sydney;
            break;
    }

    session.send('Set your location to %s', selection);

}]));

function executeQuery(query, context){
    // query analysis happens here - LUIS or whatever else

    // based on query analysis, actually run the query

    // return the query response and a context state object that summarises the response
    var newContextState = {
            "queryTime": moment().utc().toISOString(),
            "queryString" : query,
            "responseType" : "scalar",
            "entityType" : "count",
            "responseData" : 4
        };
    
    var fullResponse = {
        "responseText" : "There are four of your friends with times on this segment"
    };

    return {
        "fullResponse" : fullResponse,
        "contextState" : newContextState
    };

}