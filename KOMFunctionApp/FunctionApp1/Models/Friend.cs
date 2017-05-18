using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FunctionApp1.Models
{
    public class Friend
    {
        public int id { get; set; }
        public string username { get; set; }
        public int resource_state { get; set; }
        public string firstname { get; set; }
        public string lastname { get; set; }
        public string city { get; set; }
        public string state { get; set; }
        public string country { get; set; }
        public string sex { get; set; }
        public bool premium { get; set; }
        public string created_at { get; set; }
        public string updated_at { get; set; }
        public int badge_type_id { get; set; }
        public string profile_medium { get; set; }
        public string profile { get; set; }
        public string friend { get; set; }
        public string follower { get; set; }
    }
}
