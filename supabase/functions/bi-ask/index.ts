import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

interface Turn { role: 'user' | 'assistant'; content: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const key = Deno.env.get('LOVABLE_API_KEY')
    if (!key) return json({ error: 'Configuration IA manquante' }, 500)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Non authentifié' }, 401)
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userErr } = await sb.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'Session invalide' }, 401)

    const body = await req.json() as { question?: string; history?: Turn[]; context?: unknown }
    const question = (body.question ?? '').trim()
    if (!question || question.length > 2000) return json({ error: 'Question invalide (1 à 2000 caractères)' }, 400)
    const history = (body.history ?? []).slice(-8).filter(t => (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string')

    const instructions = `Tu es l'assistant BI d'ExpansionOS, plateforme de pilotage de l'expansion en Afrique. Réponds toujours en français, en markdown concis. Tous les montants sont en FCFA.
Réponds uniquement à partir des données BI JSON fournies (déjà limitées au périmètre pays de l'utilisateur). Si une donnée manque, dis-le clairement sans inventer.
Structure : 1) Réponse directe chiffrée, 2) Analyse (écarts, tendances, causes probables), 3) Recommandations exploitables (3 max, concrètes, avec responsable suggéré et échéance).
Données BI : ${JSON.stringify(body.context ?? {}).slice(0, 60000)}`

    const input = [
      ...history.map(t => ({ role: t.role, content: t.content })),
      { role: 'user', content: question },
    ]

    const upstream = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Lovable-API-Key': key,
        'Authorization': `Bearer ${key}`,
        'X-Lovable-AIG-SDK': 'fetch',
      },
      body: JSON.stringify({
        model: 'openai/gpt-6-astra',
        instructions,
        input,
        stream: true,
        store: false,
        reasoning: { effort: 'low' },
      }),
      signal: req.signal,
    })

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text()
      let message = `Erreur IA (${upstream.status})`
      if (upstream.status === 429) message = 'Trop de requêtes, réessayez dans un instant.'
      else if (upstream.status === 402) message = 'Crédits IA épuisés pour l’espace de travail.'
      else { try { message = (JSON.parse(txt) as { error?: { message?: string }; message?: string }).error?.message ?? message } catch { /* noop */ } }
      return json({ error: message }, upstream.status)
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const reader = upstream.body.getReader()
    const stream = new ReadableStream({
      async start(controller) {
        let buf = ''
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            let idx
            while ((idx = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, idx).trim()
              buf = buf.slice(idx + 1)
              if (!line.startsWith('data:')) continue
              const data = line.slice(5).trim()
              if (!data || data === '[DONE]') continue
              try {
                const evt = JSON.parse(data) as { type?: string; delta?: string; response?: { error?: { message?: string } } }
                if (evt.type === 'response.output_text.delta' && evt.delta) controller.enqueue(encoder.encode(evt.delta))
                else if (evt.type === 'response.failed' || evt.type === 'error') controller.enqueue(encoder.encode(`\n\n⚠️ ${evt.response?.error?.message ?? 'Erreur IA'}`))
              } catch { /* ignore partial */ }
            }
          }
        } catch { /* aborted */ }
        controller.close()
      },
      cancel() { reader.cancel() },
    })

    const headers: Record<string, string> = { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' }
    const runId = upstream.headers.get('X-Lovable-AIG-Run-ID')
    if (runId) headers['X-Lovable-AIG-Run-ID'] = runId
    return new Response(stream, { headers })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return json({ error: 'Annulé' }, 499)
    return json({ error: (e as Error).message }, 500)
  }
})
