import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Standard CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Immediately handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Get and validate the request payload
    const { searchTerm, engine } = await req.json()
    if (!searchTerm) {
      throw new Error('Search term is required.')
    }
    const searchEngine = engine || 'google_jobs' // Default to google_jobs
    console.log(`[SerpApi] Starting search for "${searchTerm}" on engine: "${searchEngine}"`)

    // 2. Get the API key from secrets
    const apiKey = Deno.env.get('SERPAPI_KEY')
    if (!apiKey) {
      console.error("[SerpApi] FATAL ERROR: SERPAPI_KEY secret is not set in Supabase.")
      throw new Error('Server configuration error: API key is missing.')
    }
    console.log("[SerpApi] SERPAPI_KEY found.")

    // 3. Construct the direct API call URL
    const params = new URLSearchParams({
      'api_key': apiKey,
      'engine': searchEngine,
      'q': searchTerm,
      'location': 'United States',
      'gl': 'us',
      'hl': 'en',
    });
    const url = `https://serpapi.com/search.json?${params.toString()}`;

    // 4. Make the request with a timeout to prevent getting stuck
    const serpapiResponse = await fetch(url, { signal: AbortSignal.timeout(15000) }); // 15-second timeout

    if (!serpapiResponse.ok) {
      const errorBody = await serpapiResponse.text()
      console.error(`[SerpApi] API request failed with status: ${serpapiResponse.status}. Body: ${errorBody}`)
      throw new Error(`SerpApi returned a non-200 status.`)
    }

    // 5. Parse the JSON and check for API-specific errors
    const responseJson = await serpapiResponse.json();
    if (responseJson.error) {
      console.error(`[SerpApi] API returned a specific error: ${responseJson.error}`)
      throw new Error(responseJson.error);
    }

    // 6. Resiliently find the job results array
    const jobsData = responseJson.jobs_results || responseJson.organic_results || [];
    console.log(`[SerpApi] Found ${jobsData.length} results.`)

    // 7. Transform data into a consistent format for the frontend
    const jobs = jobsData.map((job: any) => ({
      id: `${searchEngine}-${job.job_id || job.position}`, // Ensure unique ID
      company: job.company_name,
      position: job.title,
      location: job.location,
      url: job.related_links?.[0]?.link || job.link || '#',
      tags: job.detected_extensions?.schedule_type ? [job.detected_extensions.schedule_type] : [],
    }));

    // 8. Send a successful response
    return new Response(JSON.stringify({ jobs }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    // 9. Catch any error and return a formatted 500 response
    console.error("[SerpApi] A critical error occurred in the function:", error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})