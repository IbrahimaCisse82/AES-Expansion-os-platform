import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY manquant')

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { context } = await req.json()
    if (!context || typeof context !== 'object') {
      return new Response(JSON.stringify({ error: 'context requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const prompt = `Tu es l'analyste financier d'ExpansionOS, plateforme de pilotage d'expansion en Afrique (montants en FCFA).
Analyse les données BI suivantes (JSON) et produis en français, en markdown concis :
1. Synthèse exécutive (3 lignes)
2. Écarts budget vs réalisé notables (pays/pôles) avec chiffres
3. Tendances mensuelles
4. Top 3 recommandations actionnables

Données : ${JSON.stringify(context)}`

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: 'google/gemini-3.8-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Erreur IA (${res.status}) : ${txt.slice(0, 200)}`)
    }
    const json = await res.json() as { choices?: { message?: { content?: string } }[] }
    const analysis = json.choices?.[0]?.message?.content ?? ''
    return new Response(JSON.stringify({ analysis }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
