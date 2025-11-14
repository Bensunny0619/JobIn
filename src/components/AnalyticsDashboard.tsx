import { useMemo } from "react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { format, startOfWeek } from "date-fns"

// Define the Job type again or import it from a central types file
type Job = {
  id: string
  company: string
  position: string
  status: string
  date_applied: string
}

type Props = {
  jobs: Job[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]; // Blue, Green, Yellow, Red for statuses

export default function AnalyticsDashboard({ jobs }: Props) {
  // Memoize calculations so they only run when jobs change
  const analyticsData = useMemo(() => {
    if (jobs.length === 0) {
      return {
        totalApplications: 0,
        interviewRate: 0,
        offerRate: 0,
        applicationsByStatus: [],
        applicationsOverTime: [],
      }
    }

    const totalApplications = jobs.length
    const interviewsAndOffers = jobs.filter(j => j.status === 'interview' || j.status === 'offer').length
    const offers = jobs.filter(j => j.status === 'offer').length
    

    // --- Data for Pie Chart ---
    const statusCounts = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const applicationsByStatus = Object.entries(statusCounts).map(([name, value]) => ({ name, value, }))

    // --- Data for Bar Chart ---
    const weeklyApplications = jobs.reduce((acc, job) => {
      const weekStart = format(startOfWeek(new Date(job.date_applied)), "MMM d")
      acc[weekStart] = (acc[weekStart] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const applicationsOverTime = Object.entries(weeklyApplications)
      .map(([week, count]) => ({ week, applications: count }))
      .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime()); // Sort by date


    return {
      totalApplications,
      interviewRate: totalApplications > 0 ? (interviewsAndOffers / totalApplications) * 100 : 0,
      offerRate: totalApplications > 0 ? (offers / totalApplications) * 100 : 0,
      applicationsByStatus,
      applicationsOverTime,
    }
  }, [jobs])

  return (
    <div className="space-y-6">
      {/* Section 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow border">
          <h3 className="text-gray-500 text-sm font-medium">Total Applications</h3>
          <p className="text-3xl font-bold">{analyticsData.totalApplications}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border">
          <h3 className="text-gray-500 text-sm font-medium">Interview Rate</h3>
          <p className="text-3xl font-bold">{analyticsData.interviewRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border">
          <h3 className="text-gray-500 text-sm font-medium">Offer Rate</h3>
          <p className="text-3xl font-bold">{analyticsData.offerRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* Section 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pie Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow border">
          <h3 className="font-semibold mb-4">Application Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.applicationsByStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                // --- FIX: This function now safely accesses properties from the props object ---
                // Recharts provides a complex object, so we check for the name and percent
                // in multiple possible locations to avoid runtime errors and fix the TypeScript error.
                label={(props: any) => {
                  const name = props.name ?? props.payload?.name ?? '';
                  const percent = props.percent ?? props.payload?.percent ?? 0;
                  return `${name} ${(percent * 100).toFixed(0)}%`;
                }}
              >
                {analyticsData.applicationsByStatus.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow border">
          <h3 className="font-semibold mb-4">Applications per Week</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.applicationsOverTime}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="applications" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}