import { createClient } from 'npm:@supabase/supabase-js@2'
import { requireServiceCaller } from '../_shared/service-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const METRICS = [
  { key: 'ca', targetKey: 'target_ca', label: 'CA Mensuel', isCurrency: true },
  { key: 'clients', targetKey: 'target_clients', label: 'Clients Actifs', isCurrency: false },
  { key: 'nps', targetKey: 'target_nps', label: 'NPS Score', isCurrency: false },
  { key: 'retention', targetKey: 'target_retention', label: 'Rétention', isCurrency: false },
] as const

const MIN_CONSECUTIVE = 2

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  const denied = requireServiceCaller(req, corsHeaders)
  if (denied) return denied


  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Read alert threshold from app_settings
  const { data: settingsRows } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'kpi_alert_threshold')
    .maybeSingle()

  const thresholdPct = parseInt(settingsRows?.value || '80')
  const threshold = thresholdPct / 100

  // 2. Get all countries
  const { data: countries } = await supabase
    .from('countries')
    .select('id, name, flag')

  if (!countries?.length) {
    return new Response(JSON.stringify({ checked: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Get all kpi_history ordered by month desc
  const { data: allHistory } = await supabase
    .from('kpi_history')
    .select('*')
    .order('month', { ascending: false })

  if (!allHistory?.length) {
    return new Response(JSON.stringify({ checked: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let alertsSent = 0

  for (const country of countries) {
    const countryHistory = (allHistory as Array<Record<string, unknown>>)
      .filter((h) => h.country_id === country.id)
      .sort((a, b) => String(b.month).localeCompare(String(a.month)))

    if (countryHistory.length < MIN_CONSECUTIVE) continue

    for (const metric of METRICS) {
      // Count consecutive months (from most recent) where actual < target * threshold
      let consecutive = 0
      const underMonths: string[] = []
      let latestPct = 0

      for (const row of countryHistory) {
        const actual = Number((row as Record<string, unknown>)[metric.key])
        const target = Number((row as Record<string, unknown>)[metric.targetKey])
        
        if (target <= 0) break
        
        const pct = Math.round((actual / target) * 100)
        
        if (actual < target * threshold) {
          consecutive++
          underMonths.push(String(row.month))
          if (consecutive === 1) latestPct = pct
        } else {
          break // streak broken
        }
      }

      if (consecutive >= MIN_CONSECUTIVE) {
        // Send recurring alert
        const latestMonth = underMonths[0]
        const idempotencyKey = `kpi-recurring-${country.id}-${metric.key}-${latestMonth}-${consecutive}`

        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'kpi-recurring-alert',
            recipientEmail: '__admins__',
            idempotencyKey,
            templateData: {
              countryName: country.name,
              metric: metric.label,
              consecutiveMonths: String(consecutive),
              months: underMonths.reverse().join(', '),
              threshold: String(thresholdPct),
              latestPercentage: String(latestPct),
            },
          },
        })

        alertsSent++
        console.log(`Recurring alert: ${country.name} - ${metric.label} under ${thresholdPct}% for ${consecutive} months`)
      }
    }
  }

  return new Response(
    JSON.stringify({ success: true, checked: countries.length, alertsSent }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
