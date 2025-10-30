import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { getJson } from 'https://deno.land/x/serpapi@1.0.0/mod.ts'

// Define the structure of the job results we want to return
interface JobResult {
  id: string;
  company: string;
  position: string;
  location: string;
  url: string;
  tags: string[];
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const { searchTerm } = await req.json()
    if (!searchTerm) {
      throw new Error('Search term is required.')
    }

    const apiKey = Deno.env.get('SERPAPI_KEY')
    if (!apiKey) {
      throw new Error('SERPAPI_KEY is not set.')
    }

    // Make the API call to SerpApi's Google Jobs endpoint
    const response = await getJson({
      api_key: apiKey,
      engine: 'google_jobs',
      q: searchTerm,
      location: 'United States', // You can make this dynamic later
    })

    // Format the raw response into our desired structure
    const jobs: JobResult[] = response.jobs_results.map((job: any) => ({
      id: job.job_id,
      company: job.company_name,
      position: job.title,
      location: job.location,
      url: job.related_links?.[0]?.link || `https://www.google.com/search?q=${job.title}+${job.company_name}`,
      tags: job.detected_extensions?.schedule_type ? [job.detected_extensions.schedule_type] : [],
    }));

    return new Response(JSON.stringify({ jobs }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      status: 400,
    })
  }
})