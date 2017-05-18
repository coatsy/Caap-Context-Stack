#r "Microsoft.WindowsAzure.Storage"
#r "Newtonsoft.Json"
using Microsoft.WindowsAzure.Storage.Table;
using System.Configuration;
using Microsoft.Bot.Connector;
using Newtonsoft.Json;
using System;

public static void Run(LeaderQueueItem myQueueItem, CloudTable stravaPeople, TraceWriter log)
{
    log.Info($"Strava Group is {myQueueItem.StravaGroup}");

    // query which subscriptions need to be notified that the event has happened
    var query = new TableQuery<StravaPeopleItem>().Where(TableQuery.GenerateFilterCondition("StravaGroup", QueryComparisons.Equal, myQueueItem.StravaGroup));
    var results = stravaPeople.ExecuteQuery(query).Select(s => (StravaPeopleItem)s).ToList();

    log.Info($"Table results is {results.Count()}");

    // retrieve the Microsoft AppId and AppPassword from AppSettings 
    var appId = "yourAppId";
    var appPassword = "yourAppPassword";

    // for each subscription use the original conversation info to post back to the channel 
    foreach (StravaPeopleItem item in results)
    {
        var botChannel = new ChannelAccount(item.BotId, item.BotName);

        log.Info($"{item.BotId}");
        log.Info($"{item.BotName}");

        var userChannel = new ChannelAccount() {Id = item.UserId};
        var conversation = new ConversationAccount() {Id = item.ConversationId};
        var messageId = item.MessageId;
        var channelId = item.ChannelId;
        var serviceUrl = item.ServiceUrl;

        var conversationReference = new ConversationReference(messageId, botChannel, userChannel, conversation, channelId, serviceUrl);

        MicrosoftAppCredentials.TrustServiceUrl(serviceUrl);

        var client = new ConnectorClient(new Uri(conversationReference.ServiceUrl), new MicrosoftAppCredentials(appId, appPassword));
        var reply = $"Hey {myQueueItem.NewLeader} is the new {myQueueItem.StravaSegment} leader in your Strava {myQueueItem.StravaGroup} group with the new {myQueueItem.Discipline} time of {myQueueItem.NewTime}";
        var message = conversationReference.GetPostToBotMessage().CreateReply(reply);
        var activity = (Activity)message;
        client.Conversations.ReplyToActivity(activity);
    }   
}

public class LeaderQueueItem
{
    public string StravaGroup {get; set;}
    public string StravaSegment {get; set;}
    public string NewLeader {get; set;}
    public string NewTime {get; set;}
    public string Discipline {get; set;}
}

public class StravaPeopleItem : TableEntity
{
    public string ConversationId {get; set;}
    public string BotId {get; set;}
    public string BotName {get; set;}
    public string UserId {get; set;}
    public string MessageId {get; set;}
    public string ChannelId {get; set;}
    public string ServiceUrl {get; set;}
    public string StravaName {get; set;}
    public string StravaGroup {get; set;}
}
