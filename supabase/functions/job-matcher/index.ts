import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // This function requires the user to be authenticated
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get the application ID and user from the request
    // The user's JWT is automatically passed in the Authorization header
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''))
    if (!user) throw new Error('User not found.')

    const { applicationId } = await req.json()
    if (!applicationId) throw new Error('Application ID is required.')

    // 2. Fetch the user's resume analysis and the specific job application
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('resume_analysis')
      .eq('id', user.id)
      .single()
    if (profileError || !profileData?.resume_analysis) throw new Error('Resume analysis not found. Please upload a resume first.')

    const { data: appData, error: appError } = await supabaseAdmin
      .from('applications')
      .select('position, company') // We'll use position and company for now
      .eq('id', applicationId)
      .single()
    if (appError) throw new Error('Job application not found.')

    const { resume_analysis } = profileData
    const { position, company } = appData

    // 3. Call the Google Gemini API
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!googleApiKey) throw new Error('Google API Key is not set.')

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${googleApiKey}`
    
    const prompt = `You are an expert career coach. A candidate's resume analysis shows these skills and summary: ${JSON.stringify(resume_analysis)}. They are applying for the position of "${position}" at "${company}". 
    
    Based on this, provide the following in a JSON format:
    - a "matchScore" from 0 to 100.
    - a short "summary" explaining why it's a good or bad match.
    - an array of 3 concrete "suggestions" for the candidate to improve their alignment with the job.
    
    Your response MUST be only the JSON object, with no extra text or explanations.`

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })

    if (!geminiResponse.ok) throw new Error(`Google Gemini API request failed: ${await geminiResponse.text()}`)
    
    const geminiResult = await geminiResponse.json()
    const jsonString = geminiResult.candidates[0].content.parts[0].text
    const matchResult = JSON.parse(jsonString)

    // 4. Save the match analysis back to the specific application
    const { error: updateError } = await supabaseAdmin
      .from('applications')
      .update({ match_analysis: matchResult })
      .eq('id', applicationId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, analysis: matchResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Job match analysis failed:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})