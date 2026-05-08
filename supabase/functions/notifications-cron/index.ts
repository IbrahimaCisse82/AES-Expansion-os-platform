// notifications-cron — runs daily. Generates J-7 milestone reminders + monthly KPI/budget summary.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function isoPlusDays(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
  const summary: Record<string, number> = { milestones_j7: 0, monthly_report: 0 }

  try {
    // ── 1. Milestones J-7 ─────────────────────────────────────
    const targetDate = isoPlusDays(7)
    const { data: milestones } = await sb
      .from('milestones')
      .select('id,title,country_id,target_date,is_done')
      .eq('is_done', false)
      .eq('target_date', targetDate)

    if (milestones && milestones.length) {
      const countryIds = [...new Set(milestones.map((m) => m.country_id))]
      const { data: countries } = await sb.from('countries').select('id,name,flag').in('id', countryIds)
      const cMap = new Map((countries ?? []).map((c) => [c.id, c]))
      const { data: members } = await sb
        .from('country_members')
        .select('user_id,country_id')
        .in('country_id', countryIds)

      const rows: Array<Record<string, unknown>> = []
      for (const m of milestones) {
        const country = cMap.get(m.country_id)
        const targets = (members ?? []).filter((x) => x.country_id === m.country_id)
        for (const t of targets) {
          rows.push({
            user_id: t.user_id,
            type: 'milestone_j7',
            title: '⏰ Jalon dans 7 jours',
            message: `${country?.flag ?? ''} ${country?.name ?? m.country_id} — « ${m.title} » est attendu le ${m.target_date}`,
            link: `/pays/${m.country_id}`,
            entity_type: 'milestone',
            entity_id: m.id,
          })
        }
      }
      if (rows.length) {
        await sb.from('notifications').insert(rows)
        summary.milestones_j7 = rows.length
      }
    }

    // ── 2. Rapport mensuel (1er du mois) ─────────────────────
    const today = new Date()
    if (today.getUTCDate() === 1) {
      const { data: countries } = await sb.from('countries').select('id,name,flag,pct,status,risk_count')
      const { data: budget } = await sb.from('budget_entries').select('allocated_k,spent_k')
      const totalAlloc = (budget ?? []).reduce((s, b) => s + (b.allocated_k ?? 0), 0)
      const totalSpent = (budget ?? []).reduce((s, b) => s + (b.spent_k ?? 0), 0)
      const pct = totalAlloc > 0 ? Math.round((totalSpent / totalAlloc) * 100) : 0
      const summaryMsg =
        `${countries?.length ?? 0} marchés suivis · Budget consommé : ${pct} % (${totalSpent.toLocaleString('fr-FR')} / ${totalAlloc.toLocaleString('fr-FR')} K FCFA)`

      const { data: leadership } = await sb
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'director'])
      const rows = (leadership ?? []).map((u) => ({
        user_id: u.user_id,
        type: 'monthly_report',
        title: '📊 Rapport mensuel ExpansionOS',
        message: summaryMsg,
        link: '/tableau-de-bord',
        entity_type: 'report',
        entity_id: today.toISOString().slice(0, 7),
      }))
      if (rows.length) {
        await sb.from('notifications').insert(rows)
        summary.monthly_report = rows.length
      }
    }

    return new Response(JSON.stringify({ ok: true, summary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[notifications-cron]', err)
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
