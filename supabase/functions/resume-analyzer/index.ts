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
    // 1. Get user and resume path from the webhook
    const { record } = await req.json()
    const userId = record.id
    const resumePath = record.resume_url
    if (!resumePath) throw new Error('Resume URL is missing.')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Get a temporary public URL for the resume file
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('resumes')
      .createSignedUrl(resumePath, 60) // URL is valid for 60 seconds
    if (urlError) throw urlError

    // 3. Call the PDF.co API to extract text
    const pdfCoApiKey = Deno.env.get('PDF_CO_API_KEY')
    if (!pdfCoApiKey) throw new Error('PDF.co API key is not set.')

    const pdfCoResponse = await fetch('https://api.pdf.co/v1/pdf/convert/to/text-simple', {
      method: 'POST',
      headers: { 'x-api-key': pdfCoApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: urlData.signedUrl, inline: true }),
    })

    if (!pdfCoResponse.ok) throw new Error(`PDF.co API request failed: ${await pdfCoResponse.text()}`)
    
    const pdfCoResult = await pdfCoResponse.json()
    if (pdfCoResult.error) throw new Error(`PDF.co Error: ${pdfCoResult.message}`)
    const resumeText = pdfCoResult.body

    // 4. Call the Google Gemini API with the extracted text
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY')
    if (!googleApiKey) throw new Error('Google API Key is not set.')

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${googleApiKey}`
    
    const prompt = `You are a helpful HR assistant. Analyze the following resume text and extract the following information in a JSON format: 
    - a professional summary (2-3 sentences)
    - a list of key technical skills (e.g., "React", "Node.js", "SQL")
    - years of experience as a number.
    Your response MUST be only the JSON object, with no extra text or explanations. The JSON keys should be "summary", "skills", and "experienceYears". Here is the resume text: ${resumeText}`

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    })

    if (!geminiResponse.ok) throw new Error(`Google Gemini API request failed: ${await geminiResponse.text()}`)
    
    const geminiResult = await geminiResponse.json()
    // Extract the raw JSON string from the response
    const jsonString = geminiResult.candidates[0].content.parts[0].text
    const analysisResult = JSON.parse(jsonString)

    // 5. Save the analysis back to the user's profile
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ resume_analysis: analysisResult })
      .eq('id', userId)
    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, analysis: analysisResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Resume analysis failed:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})