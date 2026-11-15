// Garde d'accès pour les fonctions edge appelées uniquement par le serveur
// (pg_cron, autres fonctions edge). Elles utilisent la clé service_role et
// contournent la RLS : elles ne doivent JAMAIS être déclenchables par un
// utilisateur ou par la clé publique (anon).
//
// Accepté :
//   - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
//     (c'est ce qu'envoient pg_cron via le Vault et supabase.functions.invoke
//      depuis un client service_role)
//   - x-cron-secret: <CRON_SECRET>  (optionnel, si le secret est défini)

function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const x = enc.encode(a)
  const y = enc.encode(b)
  let diff = x.length ^ y.length
  const n = Math.max(x.length, y.length)
  for (let i = 0; i < n; i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0)
  return diff === 0
}

export function isServiceCaller(req: Request): boolean {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const cronSecret = Deno.env.get('CRON_SECRET') ?? ''

  const auth = req.headers.get('Authorization') ?? ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (serviceKey && bearer && safeEqual(bearer, serviceKey)) return true

  const provided = req.headers.get('x-cron-secret') ?? ''
  if (cronSecret && provided && safeEqual(provided, cronSecret)) return true

  return false
}

/** Renvoie une réponse 401 si l'appelant n'est pas le serveur, sinon null. */
export function requireServiceCaller(req: Request, headers: Record<string, string> = {}): Response | null {
  if (isServiceCaller(req)) return null
  return new Response(JSON.stringify({ error: 'Accès réservé aux tâches serveur' }), {
    status: 401,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
