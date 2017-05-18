using System;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Host;
using System.Net.Http;
using Newtonsoft.Json;
using FunctionApp1.Models;
using System.Collections.Generic;

namespace FunctionApp1
{
    public static class Function1
    {
        static string authAccessToken = "7c0fdfe0d1039bce4f7400cc9693b910aa6b028f";

        [FunctionName("TimerTriggerCSharp")]
        public static async void Run([TimerTrigger("0 */5 * * * *", RunOnStartup = true)]TimerInfo myTimer, TraceWriter log)
        {
            log.Info($"C# Timer trigger function executed at: {DateTime.Now}");


            var id = "22019203";
            await GetAthleteFriends(log, id);
        }

        private static async System.Threading.Tasks.Task<AthleteSummary> GetAthleteSummary(TraceWriter log, string id)
        {
            AthleteSummary athleteSummary = null;

            var url = $"https://www.strava.com/api/v3/athletes/{id}";

            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {authAccessToken}");

                var response = await client.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var responseString = await response.Content.ReadAsStringAsync();

                // Extract useful info from API response 
                athleteSummary = JsonConvert.DeserializeObject<AthleteSummary>(responseString);

                log.Info($"Retrieved Athlete Summary for: {athleteSummary.username}");
            }

            return athleteSummary;
        }

        private static async System.Threading.Tasks.Task GetAthleteFriends(TraceWriter log, string id)
        {
            List<Friend> athleteFriends = new List<Friend>();

            var url = $"https://www.strava.com/api/v3/athletes/{id}/friends";

            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {authAccessToken}");

                var response = await client.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var responseString = await response.Content.ReadAsStringAsync();

                // Extract useful info from API response 
                athleteFriends = JsonConvert.DeserializeObject<List<Friend>>(responseString);

                foreach (var friend in athleteFriends)
                {
                    log.Info($"Retrieved Athlete friend ID: {friend.id}");
                    await GetAthleteKQOM(log, friend.id.ToString());
                }
            }

            return ;
        }
        private static async System.Threading.Tasks.Task<AthleteSummary> GetAthleteKQOM(TraceWriter log, string id)
        {
            AthleteSummary athleteSummary = null;

            var url = $"https://www.strava.com/api/v3/athletes/{id}/koms";

            using (var client = new HttpClient())
            {
                client.DefaultRequestHeaders.Add("Authorization", $"Bearer {authAccessToken}");

                var response = await client.GetAsync(url);
                response.EnsureSuccessStatusCode();

                var responseString = await response.Content.ReadAsStringAsync();

                // Extract useful info from API response 
                if (!string.IsNullOrEmpty(responseString))
                {
                    var kQOMData = JsonConvert.DeserializeObject<KQOMData>(responseString);

                    log.Info($"Retrieved Athlete KOM list for: {athleteSummary.username}");
                }
            }

            return athleteSummary;
        }
    }
}