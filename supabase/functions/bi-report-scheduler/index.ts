import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { requireServiceCaller } from '../_shared/service-auth.ts'

// Planificateur de diffusion BI : appelé chaque heure par pg_cron.
// Envoie par email les rapports planifiés échus (quotidien / hebdo / mensuel).

const TEMPLATE_NAMES: Record<string, string> = {
  A1: 'Flash hebdomadaire', A2: 'Rapport mensuel Commercial', A3: 'Rapport mensuel Technique',
  A4: 'Rapport mensuel Administratif', A5: 'Rapport mensuel RH', A6: 'Évaluation individuelle',
  A7: 'PPI 90 jours', A8: 'Rapport de formation', A9: 'Compte rendu Task Force',
  A10: 'Rapport trimestriel DG', A11: 'Fiche de poste', A12: "Fiche d'intervention",
}

function isDue(frequency: string, lastSent: string | null, now: Date): boolean {
  if (!lastSent) return true
  const last = new Date(lastSent)
  const diffH = (now.getTime() - last.getTime()) / 3_600_000
  if (frequency === 'daily') return diffH >= 20
  if (frequency === 'weekly') return diffH >= 6 * 24
  if (frequency === 'monthly') return diffH >= 27 * 24
  return false
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const denied = requireServiceCaller(req, corsHeaders)
  if (denied) return denied

  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const sb = createClient(url, serviceKey)

    const now = new Date()
    const { data: schedules, error } = await sb
      .from('bi_report_schedules')
      .select('id, report_id, template_code, frequency, hour, recipients, last_sent_at, is_active')
      .eq('is_active', true)
    if (error) throw error

    let sent = 0
    for (const s of schedules ?? []) {
      if (s.hour !== now.getUTCHours()) continue
      if (!isDue(s.frequency, s.last_sent_at, now)) continue

      const label = s.template_code
        ? `${s.template_code} — ${TEMPLATE_NAMES[s.template_code] ?? 'Rapport'}`
        : 'Rapport BI personnalisé'

      for (const email of (s.recipients as string[]) ?? []) {
        const { error: sendErr } = await sb.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'notification',
            recipientEmail: email,
            idempotencyKey: `bi-sched-${s.id}-${now.toISOString().slice(0, 13)}-${email}`,
            templateData: {
              title: `📊 Rapport BI : ${label}`,
              message: `Le rapport planifié « ${label} » (${s.frequency}) est disponible sur ExpansionOS. Connectez-vous à la plateforme pour consulter les données à jour.`,
              link: '/bi',
              type: 'bi_report',
            },
          },
        })
        if (sendErr) throw sendErr
      }

      await sb.from('bi_report_schedules').update({ last_sent_at: now.toISOString() }).eq('id', s.id)
      sent++
    }

    return new Response(JSON.stringify({ sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
