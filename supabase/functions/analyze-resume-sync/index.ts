import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { delay } from 'https://deno.land/std@0.168.0/async/delay.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// This function uses the correct, model-specific URL and handles the cold start.
async function queryHuggingFace(apiKey: string, payload: any) {
  // THIS IS THE ORIGINAL, CORRECT URL.
  const hfUrl = `https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2`

  const response = await fetch(hfUrl, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  // We must get the body to check for the "loading" error.
  const body = await response.json()

  // This is the crucial logic to handle the "cold start".
  if (response.status === 503 && body.error?.includes('is currently loading')) {
    const waitTime = body.estimated_time || 20; // Default to 20 seconds if no estimate
    console.log(`Model is loading. Waiting for ${waitTime} seconds...`)
    await delay(waitTime * 1000)
    
    // Retry the request one more time after waiting.
    const retryResponse = await fetch(hfUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!retryResponse.ok) {
      throw new Error(`Hugging Face retry request failed: ${await retryResponse.text()}`)
    }
    return retryResponse.json()
  }
  
  // If there was any other error, throw it.
  if (!response.ok) {
    throw new Error(`Hugging Face API request failed: ${JSON.stringify(body)}`)
  }

  // If the first request worked, return the body.
  return body
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''))
    if (!user) throw new Error('User not found.')

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('resume_url')
      .eq('id', user.id)
      .single()
    if (profileError || !profileData?.resume_url) {
      throw new Error('No resume found. Please upload one first.')
    }
    
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('resumes')
      .createSignedUrl(profileData.resume_url, 60)
    if (urlError) throw urlError

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
    const resumeText = pdfCoResult.body.substring(0, 15000)

    const hfApiKey = Deno.env.get('HUGGINGFACE_API_KEY')
    if (!hfApiKey) throw new Error('Hugging Face API Key is not set.')
    
    const prompt = `[INST] You are an expert HR analyst. Analyze the following resume text and extract the information in a valid JSON format. Your response MUST be only the JSON object. The JSON keys must be "summary" (string), "skills" (array of strings), and "experienceYears" (number). Resume text: ${resumeText} [/INST]`
    
    const hfResult = await queryHuggingFace(hfApiKey, {
      inputs: prompt,
      parameters: { max_new_tokens: 512, return_full_text: false }
    })

    const rawText = hfResult[0].generated_text
    const jsonString = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1)
    const analysisResult = JSON.parse(jsonString)

    console.log("Successfully parsed analysis from Hugging Face.")
    
    return new Response(JSON.stringify({ success: true, analysis: analysisResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Sync resume analysis failed:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})