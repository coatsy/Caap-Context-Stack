using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace FunctionApp1.Models
{
    public class Activity
    {
        public int id { get; set; }
        public int resource_state { get; set; }
    }

    public class Athlete
    {
        public int id { get; set; }
        public int resource_state { get; set; }
    }

    public class Segment
    {
        public int id { get; set; }
        public int resource_state { get; set; }
        public string name { get; set; }
        public string activity_type { get; set; }
        public double distance { get; set; }
        public double average_grade { get; set; }
        public double maximum_grade { get; set; }
        public double elevation_high { get; set; }
        public double elevation_low { get; set; }
        public List<double> start_latlng { get; set; }
        public List<double> end_latlng { get; set; }
        public double start_latitude { get; set; }
        public double start_longitude { get; set; }
        public double end_latitude { get; set; }
        public double end_longitude { get; set; }
        public int climb_category { get; set; }
        public string city { get; set; }
        public string state { get; set; }
        public string country { get; set; }
        public bool @private { get; set; }
        public bool hazardous { get; set; }
        public bool starred { get; set; }
    }

    public class Achievement
    {
        public int type_id { get; set; }
        public string type { get; set; }
        public int rank { get; set; }
    }

    public class KQOMData
    {
        public long id { get; set; }
        public int resource_state { get; set; }
        public string name { get; set; }
        public Activity activity { get; set; }
        public Athlete athlete { get; set; }
        public int elapsed_time { get; set; }
        public int moving_time { get; set; }
        public string start_date { get; set; }
        public string start_date_local { get; set; }
        public double distance { get; set; }
        public int start_index { get; set; }
        public int end_index { get; set; }
        public double average_heartrate { get; set; }
        public double max_heartrate { get; set; }
        public Segment segment { get; set; }
        public int kom_rank { get; set; }
        public object pr_rank { get; set; }
        public List<Achievement> achievements { get; set; }
    }
}
