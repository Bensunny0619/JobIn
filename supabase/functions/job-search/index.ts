import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { searchTerm } = await req.json()
    if (!searchTerm) throw new Error('Search term is required.')

    const apiKey = Deno.env.get('SERPAPI_KEY')
    if (!apiKey) {
      console.error("CRITICAL: SERPAPI_KEY is missing in environment variables.")
      throw new Error('SERPAPI_KEY is not set on the server.')
    }

    // --- MANUALLY CONSTRUCT AND CALL THE SERPAPI URL ---
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'google_jobs',
      q: searchTerm,
      location: 'United States',
      hl: 'en',
      gl: 'us',
    });

    const url = `https://serpapi.com/search.json?${params.toString()}`;
    
    console.log(`Calling SerpApi URL...`);
    const serpapiResponse = await fetch(url);

    if (!serpapiResponse.ok) {
      throw new Error(`SerpApi request failed with status: ${serpapiResponse.statusText}`);
    }

    const response = await serpapiResponse.json();
    // --- END OF DIRECT API CALL ---

    if (response.error) {
        console.error("SerpApi responded with an error:", response.error)
        throw new Error(`SerpApi Error: ${response.error}`)
    }

    console.log(`SerpApi success! Found ${response.jobs_results?.length || 0} jobs.`)

    const jobs = response.jobs_results?.map((job: any) => ({
      id: job.job_id,
      company: job.company_name,
      position: job.title,
      location: job.location,
      url: job.related_links?.[0]?.link || job.share_link || `https://www.google.com/search?q=${encodeURIComponent(job.title + " " + job.company_name + " job")}`,
      tags: job.detected_extensions?.schedule_type ? [job.detected_extensions.schedule_type] : [],
    })) || [];

    return new Response(JSON.stringify({ jobs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("JOB SEARCH FAILED:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})