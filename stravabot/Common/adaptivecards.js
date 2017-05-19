exports.get = function () {
    
    return cardtemplate;
}
exports.clearSegments = function() {
      cardtemplate.body[1].columns = [];
}
exports.addSegment = function(imageurl, gotourl, title = "Segment 1") {
    var column = {
                                "type": "Column",
                                "size": "20",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "horizontalAlignment": "center",
                                        "wrap": true,
                                        "text": title,
                                        "maxLines": 2
                                    },
                                    {
                                        "type": "Image",
                                        "size": "auto",
                                        "url": imageurl
                                    }
                                ],
                                "selectAction": {
                                    "type": "Action.OpenUrl",
                                    "url": gotourl
                                }
                            };

    cardtemplate.body[1].columns.push(column);
}

exports.settitlebox = function (title) {

}

 var cardtemplate = {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.0",
                "speak": "<s>Here are your suggested routes.</s>",
                "backgroundImage": "http://messagecardplayground.azurewebsites.net/assets/Mostly Cloudy-Background-Dark.jpg",
                "body": [
                    {
                        "type": "ColumnSet",
                        "columns": [
                            
                            {
                                "type": "Column",
                                "size": "65",
                                "items": [
                                    {
                                        "type": "TextBlock",
                                        "text": "**Here are the routes I've found for you**",
                                        "size": "large",
                                        "wrap": "true",
                                        "maxLines": 2
                                    }
                                ]
                            },
                            {
                                "type": "Column",
                                "size": "50",
                                "items": [
                                    {
                                        "type": "Image",
                                        "url": "http://127.0.0.1:3978/public/api_logo_pwrdBy_strava_horiz_light.png",
                                        "size": "auto"
                                    }
                                ]
                            }
                         
                        ]
                    },
                    {
                        "type": "ColumnSet",
                        "columns": [
                            
                            
                        ]
                    }
                ]
            };


