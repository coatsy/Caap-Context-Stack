
    
/// Get a Jpeg image of the calculated route
exports.getRouteImage = function (start, end, waypointArray) {

        var widthMargin = 0.01;
        var heightMargin = 0.01;
         var mapKey = process.env.BING_API_KEY;
        var top = (start[0] > end[0] ? start[0] : end[0]) + heightMargin;
        var left = start[1] < end[1] ? start[1] : end[1] - widthMargin;
        var bottom = start[0] < end[0] ? start[0] : end[0] - heightMargin;
        var right = start[1] > end[1] ? start[1] : end[1] + widthMargin;

        var pointCount = 1;
        var locationUrl = 'http://dev.virtualearth.net/REST/v1/Imagery/Map/CanvasLight/Routes/walking';
        locationUrl += '?waypoint.' + pointCount + '=' + start[0] + ',' + start[1];

        for (var i in waypointArray)
        {
            pointCount++;
            locationUrl += '&waypoint.' + pointCount + '=' + waypointArray[i][0] + ',' + waypointArray[i][1];
        }
        pointCount++;
        locationUrl += '&waypoint.' + pointCount + '=' + end[0] + ',' + end[1];
        
        locationUrl += '&mapSize=400,400';
        locationUrl += '&format=jpeg';
        locationUrl += '&key=' + mapKey;
        return locationUrl;
    }

/// Get the Bing Redirect Url to open route in Bing
exports.getBingSiteRouteUrl = function(start, end, waypointArray) {

        var pointCount = 1;
        var locationUrl = 'http://bing.com/maps/default.aspx'; 
        var rtp = 'rtp="pos.' + start[0] + '_' + start[1] + '"';

        for (var i in waypointArray)
        {    
            rtp +='~pos."' + waypointArray[i][0] + '_' + waypointArray[i][1] + '"';
        }
        rtp += '~pos."' + end[0] + '_' + end[1];
        locationUrl += '?' + rtp;
        locationUrl += '&mode=W';
        return locationUrl;

    }

/// Get Route information via the Bing REST API
exports.getRoute = function (start, end, waypointArray) {
         var mapKey = process.env.BING_API_KEY;
        var widthMargin = 0.01;
        var heightMargin = 0.01;

        var top = (start[0] > end[0] ? start[0] : end[0]) + heightMargin;
        var left = start[1] < end[1] ? start[1] : end[1] - widthMargin;
        var bottom = start[0] < end[0] ? start[0] : end[0] - heightMargin;
        var right = start[1] > end[1] ? start[1] : end[1] + widthMargin;

        var pointCount = 1;
        var locationUrl = 'http://dev.virtualearth.net/REST/v1/Routes/walking';
        locationUrl += '?waypoint.' + pointCount + '=' + start[0] + ',' + start[1];
        for (var i in waypointArray)
        {
            pointCount++;
            locationUrl += '&viaWaypoint.' + pointCount + '=' + waypointArray[i][0] + ',' + waypointArray[i][1];
        }
        pointCount++;
        locationUrl += '&waypoint.' + pointCount + '=' + end[0] + ',' + end[1];
        locationUrl += '&key=' + mapKey;
        return locationUrl;
    }

