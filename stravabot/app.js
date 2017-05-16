// This loads the environment variables from the .env file
require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');
var locationDialog = require('botbuilder-location');
var strava = require('strava-v3');
var bingAPI = require('./Common/bingAPI.js');

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

var bot = new builder.UniversalBot(connector);
var place;

// Listen for messages from users 
server.post('/api/messages', connector.listen());

bot.library(locationDialog.createLibrary(process.env.BING_MAPS_API_KEY));

bot.dialog("/", [
    function (session) {
        var options = {
            prompt: "Where would you like to look for a run or a ride?",
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
            place = results.response;
            var boxSize = 0.02;
            var activityType = 'running';  //‘running’ or ‘riding’, default is riding
            var minCategoryClimb = '1'; // segment hills are rated from 0 to 5 depending on how steep they are
            var maxCategoryClimb = '5';
            var boundsStr = (parseFloat(place.geo.latitude)-boxSize)+','+(parseFloat(place.geo.longitude)-boxSize)+','+(parseFloat(place.geo.latitude)+boxSize)+','+(parseFloat(place.geo.longitude)+boxSize);
            strava.segments.explore({'bounds':boundsStr, 'activity_type':activityType, 'min_cat':minCategoryClimb, 'max_cat':maxCategoryClimb},function(err,payload,limits) {
                if(!err) {
                    console.log(payload);
                    handleSuccessResponse(session, payload);
                }
                else {
                    handleErrorResponse(session, err);
                }
            });
            
			var formattedAddress = 
            session.send("Ok I will look for segments by " + getFormattedAddressFromPlace(place, ", "));
        }
    }
]);

function getFormattedAddressFromPlace(place, separator) {
    var addressParts = [place.streetAddress, place.locality, place.region, place.postalCode, place.country];
    return addressParts.filter(i => i).join(separator);
}

//=========================================================
// Response Handling
//=========================================================
function handleSuccessResponse(session, payload) {
    if ((payload)&&(payload.segments)&&(payload.segments.length>0)) {
        console.log(payload);
        session.send('you are at '+place.geo.latitude+','+place.geo.longitude);
        session.send(payload.segments[0].name+' start location: '+payload.segments[0].start_latlng[0]+','+payload.segments[0].start_latlng[1]);
    }
    else {
        session.send('Couldn\'t find any segments near here');
    }

}

function handleErrorResponse(session, error) {
    session.send('Oops! Something went wrong. Try again later.');
    console.error(error);
}

