import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "demo@expansionos.app";
const DEMO_PASSWORD = "demo1234";

// IDs used by demo data so we can clean them up without touching real data
const DEMO_COUNTRY_IDS = ["jp", "de", "br", "au", "ng", "sa"];

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

    // Ensure demo user exists
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    const demoUser = existingUsers?.users?.find((u: any) => u.email === DEMO_EMAIL);

    if (!demoUser) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: "Utilisateur Démo" },
      });
      if (createErr) throw createErr;

      // Wait for trigger to create profile + role, then upgrade to admin
      await new Promise((r) => setTimeout(r, 500));
      const { data: users2 } = await admin.auth.admin.listUsers();
      const newUser = users2?.users?.find((u: any) => u.email === DEMO_EMAIL);
      if (newUser) {
        await admin.from("user_roles").update({ role: "admin" }).eq("user_id", newUser.id);
      }
    }

    // Clean previous demo data then reseed fresh
    await cleanDemoData(admin);
    await seedDemoData(admin);

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

async function cleanDemoData(admin: any) {
  // Delete demo-related data (order matters for foreign keys)
  await admin.from("activity_log").delete().in("market_flag", ["🇯🇵", "🇩🇪", "🇧🇷", "🇦🇺", "🇳🇬", "🇸🇦"]);
  await admin.from("comments").delete().in("market_id", DEMO_COUNTRY_IDS);
  await admin.from("budget_entries").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("milestones").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("roadmap_bars").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("risks").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("tasks").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("countries").delete().in("id", DEMO_COUNTRY_IDS);
}

async function seedDemoData(admin: any) {
  // Countries
  const countries = [
    { id: "jp", flag: "🇯🇵", name: "Japon", region: "Asie-Pacifique", phase: 3, pct: 88, status: "active", color: "sky", budget: "2.0M€", team_size: 12, risk_count: 1, population: "125M", gdp: "4,940 Mds$", language: "Japonais", local_contact: "Yuki Tanaka", description: "Marché le plus avancé. Bureau Tokyo opérationnel.", kpi_ca: "284K€", kpi_clients: "1,240", kpi_nps: "72", kpi_retention: "89%" },
    { id: "de", flag: "🇩🇪", name: "Allemagne", region: "Europe", phase: 2, pct: 75, status: "active", color: "sage", budget: "1.8M€", team_size: 8, risk_count: 1, population: "83M", gdp: "4,200 Mds$", language: "Allemand", local_contact: "Marc Richter", description: "Marché prioritaire avec fort potentiel B2B.", kpi_ca: "156K€", kpi_clients: "580", kpi_nps: "68", kpi_retention: "91%" },
    { id: "br", flag: "🇧🇷", name: "Brésil", region: "Amérique Latine", phase: 1, pct: 42, status: "active", color: "gold", budget: "1.2M€", team_size: 5, risk_count: 2, population: "214M", gdp: "1,920 Mds$", language: "Portugais", local_contact: "Carlos Silva", description: "Marché à haut potentiel malgré les défis réglementaires." },
    { id: "au", flag: "🇦🇺", name: "Australie", region: "Asie-Pacifique", phase: 1, pct: 35, status: "active", color: "terracotta", budget: "900K€", team_size: 3, risk_count: 1, population: "26M", gdp: "1,690 Mds$", language: "Anglais", local_contact: "Yuki Tanaka", description: "Extension AU + NZ." },
    { id: "ng", flag: "🇳🇬", name: "Nigeria", region: "Afrique", phase: 0, pct: 15, status: "planning", color: "plum", budget: "600K€", team_size: 2, risk_count: 3, population: "220M", gdp: "440 Mds$", language: "Anglais", local_contact: "Amara Okafor", description: "Phase de prospection initiale." },
    { id: "sa", flag: "🇸🇦", name: "Arabie Saoudite", region: "Moyen-Orient", phase: 0, pct: 10, status: "planning", color: "gold", budget: "500K€", team_size: 1, risk_count: 2, population: "36M", gdp: "1,060 Mds$", language: "Arabe", local_contact: "Alice Dupont", description: "Opportunité Vision 2030." },
  ];
  await admin.from("countries").upsert(countries, { onConflict: "id" });

  // Tasks
  await admin.from("tasks").insert([
    { title: "Déposer la marque en Allemagne", country_id: "de", country_label: "🇩🇪 Allemagne", due_date: "30 Juil 2025", priority: "high", status: "done", owner_name: "Marc Richter" },
    { title: "Finaliser contrat partenaire Tokyo", country_id: "jp", country_label: "🇯🇵 Japon", due_date: "5 Août 2025", priority: "high", status: "done", owner_name: "Yuki Tanaka" },
    { title: "Rédiger plan de communication Brésil", country_id: "br", country_label: "🇧🇷 Brésil", due_date: "15 Août 2025", priority: "med", status: "open", owner_name: "Carlos Silva" },
    { title: "Recruter directeur pays Australie", country_id: "au", country_label: "🇦🇺 Australie", due_date: "1 Sep 2025", priority: "high", status: "open", owner_name: "Yuki Tanaka" },
    { title: "Analyser cadre réglementaire Nigeria", country_id: "ng", country_label: "🇳🇬 Nigeria", due_date: "20 Juil 2025", priority: "high", status: "late", owner_name: "Amara Okafor" },
  ]);

  // Risks
  await admin.from("risks").insert([
    { title: "Instabilité réglementaire", country_id: "ng", country_label: "🇳🇬 Nigeria", category: "Juridique", level: "high" },
    { title: "Inflation monnaie locale +18%", country_id: "br", country_label: "🇧🇷 Brésil", category: "Financier", level: "high" },
    { title: "Délai certification produit", country_id: "jp", country_label: "🇯🇵 Japon", category: "Opérationnel", level: "medium" },
    { title: "Pénurie de talents locaux", country_id: "de", country_label: "🇩🇪 Allemagne", category: "RH", level: "medium" },
  ]);

  // Budget
  await admin.from("budget_entries").insert([
    { country_id: "de", country_label: "🇩🇪 Allemagne", allocated_k: 1800, spent_k: 1240, color: "sage" },
    { country_id: "jp", country_label: "🇯🇵 Japon", allocated_k: 2000, spent_k: 1850, color: "sky" },
    { country_id: "br", country_label: "🇧🇷 Brésil", allocated_k: 1200, spent_k: 560, color: "gold" },
    { country_id: "au", country_label: "🇦🇺 Australie", allocated_k: 900, spent_k: 420, color: "terracotta" },
  ]);

  // Milestones
  await admin.from("milestones").insert([
    { country_id: "de", icon: "📋", title: "Étude de marché complète", target_date: "Mars 2025", is_done: true, sort_order: 0 },
    { country_id: "de", icon: "⚖️", title: "Dépôt de marque", target_date: "Mai 2025", is_done: true, sort_order: 1 },
    { country_id: "de", icon: "🏢", title: "Ouverture bureau Berlin", target_date: "Juil 2025", is_done: false, sort_order: 2 },
    { country_id: "jp", icon: "🤝", title: "Contrat partenaire Tokyo", target_date: "Fév 2025", is_done: true, sort_order: 0 },
    { country_id: "jp", icon: "🏢", title: "Bureau Tokyo opérationnel", target_date: "Avr 2025", is_done: true, sort_order: 1 },
    { country_id: "jp", icon: "🚀", title: "Lancement grand public", target_date: "Sep 2025", is_done: false, sort_order: 2 },
  ]);

  // Comments
  await admin.from("comments").insert([
    { author_name: "Alice Dupont", author_initials: "AD", author_color: "#1C2B3A", market_id: "jp", market_label: "Japon", content: "Super nouvelles du Japon ! Le contrat avec Tokyo Distribution est signé.", tags: ["Japon", "Lancement"] },
    { author_name: "Yuki Tanaka", author_initials: "YT", author_color: "#7C8B6E", market_id: "jp", market_label: "Japon", content: "Je prépare le deck pour le lancement de septembre.", tags: ["Japon"] },
    { author_name: "Marc Richter", author_initials: "MR", author_color: "#8B7355", market_id: "de", market_label: "Allemagne", content: "La visite du bureau à Berlin s'est très bien passée. Espace parfait, 350m².", tags: ["Allemagne", "Bureau"] },
    { author_name: "Amara Okafor", author_initials: "AO", author_color: "#6B7B8D", market_id: "ng", market_label: "Nigeria", content: "⚠️ Nouvelles réglementations sur les opérateurs étrangers au Nigeria.", tags: ["Nigeria", "Risque"] },
  ]);

  // Activity log
  await admin.from("activity_log").insert([
    { user_name: "Marc Richter", action: "a mis à jour l'avancement Allemagne à 75%", entity_type: "country", market_flag: "🇩🇪", color: "sage" },
    { user_name: "Yuki Tanaka", action: "a terminé \"Finaliser contrat Tokyo\"", entity_type: "task", market_flag: "🇯🇵", color: "sky" },
    { user_name: "Alice Dupont", action: "a commenté le marché Japon", entity_type: "comment", market_flag: "🇯🇵", color: "navy" },
    { user_name: "Amara Okafor", action: "a créé une alerte risque Nigeria", entity_type: "risk", market_flag: "🇳🇬", color: "terracotta" },
    { user_name: "Carlos Silva", action: "a fait passer le Brésil en Phase 1", entity_type: "country", market_flag: "🇧🇷", color: "gold" },
    { user_name: "Alice Dupont", action: "a approuvé le budget Q3 Australie", entity_type: "budget", market_flag: "🇦🇺", color: "plum" },
  ]);
}
