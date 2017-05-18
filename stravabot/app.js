// This loads the environment variables from the .env file
require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');
var locationDialog = require('botbuilder-location');
var strava = require('strava-v3');
var bingAPI = require('./Common/bingAPI.js');
var polyline = require( 'google-polyline' );
var cardlib = require('microsoft-adaptivecards');
var adaptivecard = require('./Common/adaptivecards.js');
var GeoPoint = require('geopoint');



var recognizer = new builder.LuisRecognizer(process.env.LUIS_MODEL);
//var intents = new builder.IntentDialog({ recognizers: [recognizer]});

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});

server.get(/\/public\/?.*/, restify.serveStatic({
   'directory': __dirname,
   'default': 'api_logo_pwrdBy_strava_horiz_light.png'
}));

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

var bot = new builder.UniversalBot(connector);
bot.recognizer(recognizer);
var place;

// Listen for messages from users 
server.post('/api/messages', connector.listen());

bot.library(locationDialog.createLibrary(process.env.BING_MAPS_API_KEY));

bot.dialog('/', [
    function (session, args, next) {
        var minDistance, minDistance, maxDistance, activityType, activityCategory, difficulty;
        minDistance = builder.EntityRecognizer.findEntity(args.intent.entities, 'Distance.MinDistance'); // min max
        maxDistance = builder.EntityRecognizer.findEntity(args.intent.entities, 'Distance.MaxDistance'); // min max
        activityType = builder.EntityRecognizer.findEntity(args.intent.entities, 'ActivityType'); // Run or Bike
        activityCategory = builder.EntityRecognizer.findEntity(args.intent.entities, 'ActivityCategory'); // Hills or Flat
        difficulty = builder.EntityRecognizer.findEntity(args.intent.entities, 'Difficulty');

        if (minDistance == undefined | !minDistance) {
            minDistance = 0 // KM
        } else {
            minDistance = minDistance.entity;
        }
        if (maxDistance == undefined | !maxDistance) {
            maxDistance = 10 // KM
        } else {
            maxDistance = maxDistance.entity;
        }
        if (activityType == undefined | !activityType) 
            {
                activityType = 'running';
            } else {
                switch (activityType.entity) {
                    case 'run':
                        activityType = 'running';
                        break;
                    case 'bike':
                        activityType = 'biking';
                        break;
                    default:
                        activityType = 'running';
                }
               
            }
         if (difficulty == undefined | !difficulty) 
            {
                difficulty = 'flat';
            } else {
                difficulty = difficulty.entity;
            }



        // Calc difficulty
        var minCategoryClimb, maxCategoryClimb;
      
             switch (difficulty) {
                case 'flat':
                    minCategoryClimb = '1';
                    maxCategoryClimb = '2';
                    break;
                case 'hilly':
                    minCategoryClimb = '3';
                    maxCategoryClimb = '5';
                    break;
                default:
                    minCategoryClimb = '1';
                    maxCategoryClimb = '5';
                }
          
         

       var query = session.dialogData.query = {
            'minDistance': minDistance,
            'maxDistance': maxDistance,
            'activityType': activityType,
            'activityCategory': activityCategory,
            'difficulty': difficulty,
            'minCategoryClimb': minCategoryClimb,
            'maxCategoryClimb': maxCategoryClimb
        }
         session.send(`Just a sec. I'll look for a ${activityType} based on your critieria`);

            var place = session.conversationData.place;
        if (!place) 
        {
            session.beginDialog('/getlocation');
        } else
        {
            next();
        }
    },
    function (session, results) {
        var place = session.conversationData.place;
        if (!place) {
             place = results.response;
             session.conversationData.place = place;
        };
        let activityType = session.dialogData.query.activityType;
        let maxDistance = session.dialogData.query.maxDistance;
        let minCategoryClimb = session.dialogData.query.minCategoryClimb;
        let maxCategoryClimb = session.dialogData.query.maxCategoryClimb;
                // Calc bounding box
        let center = new GeoPoint(parseFloat(place.geo.latitude), parseFloat(place.geo.longitude), false);
        let boundingBox = center.boundingCoordinates(maxDistance, null, false);
        let boxSize = 0.1;
        var boundsStr = boundingBox[0]._degLat + ','
            + boundingBox[0]._degLon + ','
            + boundingBox[1]._degLat + ','
            + boundingBox[1]._degLon;
        

        //var boundsStr = (parseFloat(place.geo.latitude)-boxSize)+','+(parseFloat(place.geo.longitude)-boxSize)+','+(parseFloat(place.geo.latitude)+boxSize)+','+(parseFloat(place.geo.longitude)+boxSize);
        strava.segments.explore({'bounds':boundsStr, 'activity_type':activityType, 'min_cat':minCategoryClimb, 'max_cat':maxCategoryClimb},function(err,payload,limits) {
            if(!err) {
                console.log(payload);
                handleSuccessResponse(session, payload);
                session.endDialog();
            }
            else {
                handleErrorResponse(session, err);
                session.endDialog();
            }
        });
        
        var formattedAddress = 
        session.send("Ok I will look for segments by " + getFormattedAddressFromPlace(place, ", "));
        
    }
]).triggerAction({
    matches: 'Route.Find'
});

bot.dialog("/default", [
    function (session) {
         session.endDialog("I don't understand that. Can you ask again?");
    }
]).triggerAction({
    matches: 'None'
});

bot.dialog("/getlocation", [
    function (session) {
        var options = {
            prompt: "Where would you like to look for a run or a ride?",
            useNativeControl: true,
            reverseGeocode: true,
			skipFavorites: false,
			skipConfirmationAsk: true
            // requiredFields:
            //     locationDialog.LocationRequiredFields.streetAddress |
            //     locationDialog.LocationRequiredFields.locality |
            //     locationDialog.LocationRequiredFields.region |
            //     locationDialog.LocationRequiredFields.postalCode |
            //     locationDialog.LocationRequiredFields.country
        };

        locationDialog.getLocation(session, options);
    },
    function (session, results) {
        if (results.response) {
            session.conversationData.place = results.response;
        }
        session.endDialog();
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
        //session.send('you are at '+place.geo.latitude+','+place.geo.longitude);
        //session.send(payload.segments[0].name+' start location: '+payload.segments[0].start_latlng[0]+','+payload.segments[0].start_latlng[1]);
       var place = session.conversationData.place;
        var startpoint = [place.geo.latitude,place.geo.longitude];
        var cards = [];

        // only get 1 for now
        var showlimit = payload.segments.length<=3 ? payload.segments.length : 3;
        adaptivecard.clearSegments();
        for (var i=0; i < showlimit; i++) {

            var points = polyline.decode(payload.segments[i].points);
            var waypoints = [];
            waypoints.push(payload.segments[i].start_latlng);

            var step = Math.floor(points.length / 10); 
         
            
            for (var j=0; j < points.length; j += step) {
                waypoints.push(points[j]);
            }
            
            waypoints.push(payload.segments[i].end_latlng);


            var locationUrl = bingAPI.getRouteImage(startpoint, startpoint, waypoints);
            var bingUrl = bingAPI.getBingSiteRouteUrl(startpoint, startpoint, waypoints);

           adaptivecard.addSegment(locationUrl, bingUrl, (i+1) + ". " + payload.segments[i].name);

           
        }
        var cardtemplate = adaptivecard.get();
        var msg = new builder.Message(session);
        msg.addAttachment({
            'contentType': 'application/vnd.microsoft.card.adaptive',
            'content': cardtemplate
        });

        session.send(msg);
     }
    else {
        session.send('Couldn\'t find any segments near here');
    }
    

}

function handleErrorResponse(session, error) {
    session.send('Oops! Something went wrong. Try again later.');
    console.error(error);
}

