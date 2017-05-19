// Import modules
// environment variables
require('dotenv-extended').load();
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
var stravaIdKey = 'StravaId';
var locationKey = 'Location';
var welcomedKey = 'UserWelcomed';

// Azure DocumentDb State Store
var docDbClient = new azure.DocumentDbClient({
    host: process.env.DOCUMENT_DB_HOST,
    masterKey: process.env.DOCUMENT_DB_MASTER_KEY,
    database: process.env.DOCUMENT_DB_DATABASE,
    collection: process.env.DOCUMENT_DB_COLLECTION
});
var botStorage = new azure.AzureBotStorage({
    gzipData: false
}, docDbClient);

// Setup bot with default dialog
var bot = new builder.UniversalBot(connector, function (session) {

    var welcomed = session.privateConversationData[welcomedKey];
    if (!welcomed) {
        session.send('Welcome to StravaBot');
        session.privateConversationData[welcomedKey] = true;
    }
    // check for stava ID
    var stravaId = session.userData[stravaIdKey];
    if (!stravaId) {
        return session.beginDialog('stravaId');
    }

    // check for location
    var location = session.userData[locationKey];
    if (!location) {
        return session.beginDialog('location');
    }

    session.beginDialog('stravaQuery');
}).set('storage', botStorage);

var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL);
bot.recognizer(recognizer);
var place;

// bot.dialog('findRoute', function (session, args, next) {
//     session.send('I see you\'re looking for a route (%s)', args.intent.score);
//     session.endDialog();
// }).triggerAction({
//     matches: 'Route.Find',
//     intentThreshold: 0.9
// });

bot.dialog('stravaQuery', function (session) {
    // get the current context stack
    var contextState = session.privateConversationData[contextStateKey] || {
        "contextStack": []
    };

    var queryString = session.message.text.trim();

    // send the query off to the query analysis engine
    var queryResponse = executeQuery(queryString, contextState, session);

    // update the context state
    contextState.contextStack.push(queryResponse.contextState);

    // write the updated context state back to storage
    session.privateConversationData[contextStateKey] = contextState;

    // Write the response back to the user 

    switch (queryResponse.fullResponse.responseType) {
        case "plainText":
            session.send(queryResponse.fullResponse.response);
            break;
        case "card":
            var msg = new builder.Message(session);
            msg.attachmentLayout(builder.AttachmentLayout.carousel);
            msg.attachments(queryResponse.fullResponse.response)
            session.send(msg);
            break;
    };
    session.endDialog();
});

bot.dialog('stravaId', [function (session) {
    builder.Prompts.text(session, 'What is your Strava ID?');
}, function (session, result) {
    if (!result.response) {
        session.send('Oops, we need your Strava ID to keep you fit');
        return session.endDialog();
    }

    session.userData[stravaIdKey] = result.response;
    session.send('Thank you, we\'ll use %s as your Strava Id from now on', result.response);
    return session.endDialog();
}]);

var CityLocations = {
    Sydney: {
        name: "Sydney",
        lat: -33.8696,
        lon: 151.207
    },
    Seattle: {
        name: "Seattle",
        lat: 47.60357,
        lon: -122.3295
    },
    Auckland: {
        name: "Auckland",
        lat: -36.84732,
        lon: 174.7628
    }
};

bot.dialog('location', [
    function (session) {


        builder.Prompts.choice(
            session,
            'Where are you?', [CityLocations.Auckland.name, CityLocations.Seattle.name, CityLocations.Sydney.name], {
                maxRetries: 3,
                retryPrompt: 'Please choose one of the cities listed'
            });
    },
    function (session, result) {
        if (!result.response) {
            // exhausted attemps and no selection, start over
            session.send('Ooops! Too many attempts :( But don\'t worry, I\'m handling that exception and you can try again!');
            return session.endDialog();
        }

        // on error, start over
        session.on('error', function (err) {
            session.send('Failed with message: %s', err.message);
            session.endDialog();
        });

        // continue on proper dialog
        var selection = result.response.entity;
        var loc;
        switch (selection) {
            case CityLocations.Auckland.name:
                loc = CityLocations.Auckland;
                break;
            case CityLocations.Seattle.name:
                loc = CityLocations.Seattle;
                break;
            case CityLocations.Sydney.name:
                loc = CityLocations.Sydney;
                break;
        }

        session.userData[locationKey] = loc;
        session.send('Set your location to %s', selection);
    }
]);

function executeQuery(query, context, session) {
    // query analysis happens here - LUIS or whatever else

    // based on query analysis, actually run the query

    // return the query response and a context state object that summarises the response
    var newContextState, fullResponse;


    if (query == 'how many friends have run this segment') {
        newContextState = {
            "queryTime": moment().utc().toISOString(),
            "queryString": query,
            "responseType": "scalar",
            "entityType": "count",
            "responseData": 4
        };

        fullResponse = {
            "responseType": "plainText",
            "response": "There are four of your friends with times on this segment"
        };

    } else if (query == 'who are they') {
        var userTimes = [{
                "person": "fdf13948-37ab-43f6-b336-27cddb00dc5c",
                "time": "08:14.6"
            },
            {
                "person": "c4524afb-9576-4885-9c54-b4e64eb4f98c",
                "time": "08:18.0"
            },
            {
                "person": "9f96c9fc-c700-41c4-b0c2-8a2a567c5fcd",
                "time": "08:32.3"
            },
            {
                "person": "1f2f002c-ea40-402f-abbc-a21cea5d89e4",
                "time": "09:17.5"
            }
        ];
        newContextState = {
            "queryTime": moment().utc().toISOString(),
            "queryString": query,
            "responseType": "vector",
            "entityType": "composite",
            "compositeComponentEntityTypes": ["person", "time"],
            "responseData": {
                "segment": "c94984b9-0261-4cdc-9e95-7b1bf7482ab0",
                "userTimes": userTimes
            }
        };

        fullResponse = {
            "responseType": "card",
            "response": CreateThumbnailCards(session, userTimes)
        };
    } else {
        newContextState = {
            "queryTime": moment().utc().toISOString(),
            "queryString": query,
            "responseType": "informational",
            "entityType": "text",
            "responseData": "query not undertood"
        };

        fullResponse = {
            "responseType": "plainText",
            "response": "Sorry, I don't understand - you can ask\n\'how many friends have run this segment\' or\n\'who are they\'"
        };
    }

    return {
        "fullResponse": fullResponse,
        "contextState": newContextState
    };

};

function CreateThumbnailCards(session, userTimes) {

    var cards = [];

    userTimes.forEach(function (element) {
        cards.push(CreateThumbnailCard(session, element));
    }, this);

    return cards;
}

function CreateThumbnailCard(session, details) {

    return new builder.HeroCard(session)
        .title(GetUsername(details.person))
        .subtitle(details.time)
        .text(GetUserMotto(details.person))
        .images([
            builder.CardImage.create(session, 'https://botstatetest.blob.core.windows.net/images/' + details.person + '.png')
        ])
        .buttons([]);
}

function GetUsername(personId) {
    // look up the person in the datbase or whatever
    switch (personId) {
        case "fdf13948-37ab-43f6-b336-27cddb00dc5c":
            return "Jimmy McKewen";
        case "c4524afb-9576-4885-9c54-b4e64eb4f98c":
            return "Sandy Vincentia";
        case "9f96c9fc-c700-41c4-b0c2-8a2a567c5fcd":
            return "Anita Johannsen";
        case "1f2f002c-ea40-402f-abbc-a21cea5d89e4":
            return "Margaret Harris";
        default:
            return "Unknown User";
    };
}

function GetUserMotto(personId) {
    // look up the person in the datbase or whatever
    switch (personId) {
        case "fdf13948-37ab-43f6-b336-27cddb00dc5c":
            return "Run Forrest, Run!";
        case "c4524afb-9576-4885-9c54-b4e64eb4f98c":
            return "Chasing my dreams ...";
        case "9f96c9fc-c700-41c4-b0c2-8a2a567c5fcd":
            return "Just one more hill";
        case "1f2f002c-ea40-402f-abbc-a21cea5d89e4":
            return "I love a sunburnt country";
        default:
            return "Insert motivational message here...";
    };
}