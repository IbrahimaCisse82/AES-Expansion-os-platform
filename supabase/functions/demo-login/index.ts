import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@expansionos.app";
const DEMO_PASSWORD = "demo1234";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if demo user already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const demoUser = existingUsers?.users?.find((u) => u.email === DEMO_EMAIL);

    if (!demoUser) {
      // Create demo user
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Utilisateur Démo" },
      });
      if (createErr) throw createErr;

      const userId = newUser.user.id;

      // Set admin role for demo user
      await admin.from("user_roles").update({ role: "admin" }).eq("user_id", userId);

      // Seed test data
      await seedDemoData(admin);
    } else {
      // Ensure data exists
      const { count } = await admin.from("countries").select("*", { count: "exact", head: true });
      if (!count || count === 0) {
        await seedDemoData(admin);
      }
    }

    return new Response(
      JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function seedDemoData(admin: any) {
  // Countries
  const countries = [
    { id: "de", flag: "🇩🇪", name: "Allemagne", region: "Europe", phase: 2, pct: 75, status: "active", color: "sage", budget: "1.8M€", team_size: 8, risk_count: 1, population: "83M", gdp: "4,200 Mds$", language: "Allemand", local_contact: "Marc Richter", description: "Marché prioritaire avec fort potentiel B2B. Bureau à Berlin en préparation.", kpi_ca: "156K€", kpi_clients: "580", kpi_nps: "68", kpi_retention: "91%" },
    { id: "jp", flag: "🇯🇵", name: "Japon", region: "Asie-Pacifique", phase: 3, pct: 88, status: "active", color: "sky", budget: "2.0M€", team_size: 12, risk_count: 1, population: "125M", gdp: "4,940 Mds$", language: "Japonais", local_contact: "Yuki Tanaka", description: "Marché le plus avancé. Bureau Tokyo opérationnel.", kpi_ca: "284K€", kpi_clients: "1,240", kpi_nps: "72", kpi_retention: "89%" },
    { id: "br", flag: "🇧🇷", name: "Brésil", region: "Amérique Latine", phase: 1, pct: 42, status: "active", color: "gold", budget: "1.2M€", team_size: 5, risk_count: 2, population: "214M", gdp: "1,920 Mds$", language: "Portugais", local_contact: "Carlos Silva", description: "Marché à haut potentiel malgré les défis réglementaires.", kpi_ca: "N/A", kpi_clients: "N/A", kpi_nps: "N/A", kpi_retention: "N/A" },
    { id: "au", flag: "🇦🇺", name: "Australie", region: "Asie-Pacifique", phase: 1, pct: 35, status: "active", color: "terracotta", budget: "900K€", team_size: 3, risk_count: 1, population: "26M", gdp: "1,690 Mds$", language: "Anglais", local_contact: "Yuki Tanaka", description: "Extension AU + NZ. Prospection de 3 distributeurs en cours.", kpi_ca: "N/A", kpi_clients: "N/A", kpi_nps: "N/A", kpi_retention: "N/A" },
    { id: "ng", flag: "🇳🇬", name: "Nigeria", region: "Afrique", phase: 0, pct: 15, status: "planning", color: "plum", budget: "600K€", team_size: 2, risk_count: 3, population: "220M", gdp: "440 Mds$", language: "Anglais", local_contact: "Amara Okafor", description: "Phase de prospection initiale. Focus Lagos et Abuja." },
  ];
  await admin.from("countries").upsert(countries, { onConflict: "id" });

  // Tasks
  const tasks = [
    { title: "Déposer la marque en Allemagne", country_id: "de", country_label: "🇩🇪 Allemagne", due_date: "30 Juil 2025", priority: "high", status: "done", owner_name: "Marc Richter" },
    { title: "Finaliser contrat partenaire Tokyo", country_id: "jp", country_label: "🇯🇵 Japon", due_date: "5 Août 2025", priority: "high", status: "done", owner_name: "Yuki Tanaka" },
    { title: "Rédiger plan de communication Brésil", country_id: "br", country_label: "🇧🇷 Brésil", due_date: "15 Août 2025", priority: "med", status: "open", owner_name: "Carlos Silva" },
    { title: "Recruter directeur pays Australie", country_id: "au", country_label: "🇦🇺 Australie", due_date: "1 Sep 2025", priority: "high", status: "open", owner_name: "Yuki Tanaka" },
    { title: "Analyser cadre réglementaire Nigeria", country_id: "ng", country_label: "🇳🇬 Nigeria", due_date: "20 Juil 2025", priority: "high", status: "late", owner_name: "Amara Okafor" },
  ];
  await admin.from("tasks").insert(tasks);

  // Risks
  const risks = [
    { title: "Instabilité réglementaire", country_id: "ng", country_label: "🇳🇬 Nigeria", category: "Juridique", level: "high" },
    { title: "Inflation monnaie locale +18%", country_id: "br", country_label: "🇧🇷 Brésil", category: "Financier", level: "high" },
    { title: "Délai certification produit", country_id: "jp", country_label: "🇯🇵 Japon", category: "Opérationnel", level: "medium" },
    { title: "Pénurie de talents locaux", country_id: "de", country_label: "🇩🇪 Allemagne", category: "RH", level: "medium" },
  ];
  await admin.from("risks").insert(risks);

  // Budget
  const budget = [
    { country_id: "de", country_label: "🇩🇪 Allemagne", allocated_k: 1800, spent_k: 1240, color: "sage" },
    { country_id: "jp", country_label: "🇯🇵 Japon", allocated_k: 2000, spent_k: 1850, color: "sky" },
    { country_id: "br", country_label: "🇧🇷 Brésil", allocated_k: 1200, spent_k: 560, color: "gold" },
    { country_id: "au", country_label: "🇦🇺 Australie", allocated_k: 900, spent_k: 420, color: "terracotta" },
  ];
  await admin.from("budget_entries").insert(budget);

  // Milestones
  const milestones = [
    { country_id: "de", icon: "📋", title: "Étude de marché complète", target_date: "Mars 2025", is_done: true, sort_order: 0 },
    { country_id: "de", icon: "⚖️", title: "Dépôt de marque", target_date: "Mai 2025", is_done: true, sort_order: 1 },
    { country_id: "de", icon: "🏢", title: "Ouverture bureau Berlin", target_date: "Juil 2025", is_done: false, sort_order: 2 },
    { country_id: "jp", icon: "🤝", title: "Contrat partenaire Tokyo", target_date: "Fév 2025", is_done: true, sort_order: 0 },
    { country_id: "jp", icon: "🏢", title: "Bureau Tokyo opérationnel", target_date: "Avr 2025", is_done: true, sort_order: 1 },
    { country_id: "jp", icon: "🚀", title: "Lancement grand public", target_date: "Sep 2025", is_done: false, sort_order: 2 },
  ];
  await admin.from("milestones").insert(milestones);
}
