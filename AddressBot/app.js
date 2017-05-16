// This loads the environment variables from the .env file
require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');
var locationDialog = require('botbuilder-location');


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
var venueName;

var bot = new builder.UniversalBot(connector);

// Register BotBuilder-Location dialog
bot.library(locationDialog.createLibrary(process.env.BING_MAPS_API_KEY));

bot.dialog('/', [
    function (session, args, next) {
        if (session.message && session.message.entities) {
            var userInfo = session.message.entities.find((e) => {
                    return e.type === 'UserInfo';
                });

                if (userInfo) {

                    var currentLocation = userInfo['currentLocation'];
                    if (currentLocation)
                    {
                        //Access the latitude and longitude values of the users location.
                        lat = currentLocation.Hub.Latitude;
                        lon = currentLocation.Hub.Longitude;
                        venueName = currentLocation.Hub.Name;    
                    }
                }
        };

        if (!lat && !lon) {
            session.beginDialog('/findLocation');
        } else {
            session.send('Thanks, I will find routes based on your current address %s %s', lat, lon)
        }
    }
]);

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
			session.send('Thanks, I will find routes based on this address %s %s', place.geo.latitude, place.geo.longitude)
        }
    }
]);

function getFormattedAddressFromPlace(place, separator) {
    var addressParts = [place.streetAddress, place.locality, place.region, place.postalCode, place.country];
    return addressParts.filter(i => i).join(separator);
}

