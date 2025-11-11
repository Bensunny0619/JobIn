// Please save this file for later. Do not work on it now.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { delay } from 'https://deno.land/std@0.168.0/async/delay.ts'

const corsHeaders = { /* ... */ }

async function queryHuggingFace(apiKey: string, payload: any) {
  // THIS IS THE ORIGINAL, CORRECT URL
  const hfUrl = `https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2`

  const response = await fetch(hfUrl, { /* ... */ })
  const body = await response.json()

  // This handles the "cold start" by waiting and retrying
  if (response.status === 503 && body.error?.includes('is currently loading')) {
    console.log(`Model is loading. Waiting ${body.estimated_time} seconds...`)
    await delay((body.estimated_time + 5) * 1000)
    
    const retryResponse = await fetch(hfUrl, { /* ... */ })
    if (!retryResponse.ok) { throw new Error(`Hugging Face retry request failed: ${await retryResponse.text()}`) }
    return retryResponse.json()
  }
  
  if (!response.ok) { throw new Error(`Hugging Face API request failed: ${JSON.stringify(body)}`) }
  return body
}

serve(async (req) => {
  // The rest of the function logic remains the same...
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    const userId = record.id
    const resumePath = record.resume_url
    if (!resumePath) throw new Error('Resume URL is missing.')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from('resumes')
      .createSignedUrl(resumePath, 60)
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