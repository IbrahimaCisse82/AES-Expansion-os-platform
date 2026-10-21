import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------
// Compte de démonstration.
//
// SÉCURITÉ : cette fonction crée un compte et renvoie ses identifiants à
// n'importe quel visiteur. Elle ne doit donc tourner QUE dans un projet
// Supabase dédié à la démo, jamais à côté de données réelles :
//   - désactivée par défaut (secret DEMO_MODE=true requis) ;
//   - rôle "director" (lecture/écriture métier) et non "admin" (gestion
//     des utilisateurs) ;
//   - mot de passe aléatoire régénéré à chaque connexion, jamais en dur ;
//   - le nettoyage exige la session du compte démo et ne supprime que les
//     données marquées démo (pays demo_*, activité créée par le compte).
// ---------------------------------------------------------------------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEMO_EMAIL = "demo@expansionos.app";
const DEMO_ROLE = "director";

// Prefixed IDs to avoid collision with real user data
const DEMO_COUNTRY_IDS = ["demo_jp", "demo_de", "demo_br", "demo_au", "demo_ng", "demo_sa"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function randomPassword(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return "Demo-" + btoa(String.fromCharCode(...bytes)).replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
}

async function findUserByEmail(admin: ReturnType<typeof createClient>, email: string) {
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u: { email?: string }) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (Deno.env.get("DEMO_MODE") !== "true") {
    return json({ error: "Le mode démonstration est désactivé sur cet environnement." }, 403);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = await req.json().catch(() => ({}));

    // Nettoyage : uniquement par le compte démo lui-même.
    if (body?.action === "cleanup") {
      const caller = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user } } = await caller.auth.getUser();
      if (!user || user.email?.toLowerCase() !== DEMO_EMAIL) {
        return json({ error: "Non autorisé" }, 403);
      }
      await cleanDemoData(admin, user.id);
      return json({ success: true });
    }

    const password = randomPassword();
    let demoUser = await findUserByEmail(admin, DEMO_EMAIL);

    if (!demoUser) {
      const { data, error } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Utilisateur Démo" },
      });
      if (error) throw error;
      demoUser = data.user;
    } else {
      const { error } = await admin.auth.admin.updateUserById(demoUser.id, { password });
      if (error) throw error;
    }
    if (!demoUser) throw new Error("Création du compte démo impossible");

    const { error: roleErr } = await admin.rpc("set_user_role", {
      target_user_id: demoUser.id,
      new_role: DEMO_ROLE,
    });
    if (roleErr) throw roleErr;

    // Clean previous demo data then reseed fresh
    await cleanDemoData(admin, demoUser.id);
    await seedDemoData(admin, demoUser.id);

    return json({ email: DEMO_EMAIL, password });
  } catch (err) {
    console.error("demo-login", err);
    return json({ error: "Impossible de préparer le compte démo" }, 500);
  }
});

async function cleanDemoData(admin: ReturnType<typeof createClient>, demoUserId: string) {
  // L'activité démo est rattachée au compte démo : on ne touche jamais à
  // l'historique réel des pays partageant le même drapeau.
  await admin.from("activity_log").delete().eq("user_id", demoUserId);
  await admin.from("comments").delete().in("market_id", DEMO_COUNTRY_IDS);
  await admin.from("budget_entries").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("milestones").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("roadmap_bars").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("risks").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("tasks").delete().in("country_id", DEMO_COUNTRY_IDS);
  await admin.from("countries").delete().in("id", DEMO_COUNTRY_IDS);
}

async function seedDemoData(admin: ReturnType<typeof createClient>, demoUserId: string) {
  const countries = [
    { id: "demo_jp", flag: "🇯🇵", name: "Japon", region: "Asie-Pacifique", phase: 3, pct: 88, status: "active", color: "sky", budget: "2.0M€", team_size: 12, risk_count: 1, population: "125M", gdp: "4,940 Mds$", language: "Japonais", local_contact: "Yuki Tanaka", description: "Marché le plus avancé. Bureau Tokyo opérationnel.", kpi_ca: "284K€", kpi_clients: "1,240", kpi_nps: "72", kpi_retention: "89%" },
    { id: "demo_de", flag: "🇩🇪", name: "Allemagne", region: "Europe", phase: 2, pct: 75, status: "active", color: "sage", budget: "1.8M€", team_size: 8, risk_count: 1, population: "83M", gdp: "4,200 Mds$", language: "Allemand", local_contact: "Marc Richter", description: "Marché prioritaire avec fort potentiel B2B.", kpi_ca: "156K€", kpi_clients: "580", kpi_nps: "68", kpi_retention: "91%" },
    { id: "demo_br", flag: "🇧🇷", name: "Brésil", region: "Amérique Latine", phase: 1, pct: 42, status: "active", color: "gold", budget: "1.2M€", team_size: 5, risk_count: 2, population: "214M", gdp: "1,920 Mds$", language: "Portugais", local_contact: "Carlos Silva", description: "Marché à haut potentiel malgré les défis réglementaires." },
    { id: "demo_au", flag: "🇦🇺", name: "Australie", region: "Asie-Pacifique", phase: 1, pct: 35, status: "active", color: "terracotta", budget: "900K€", team_size: 3, risk_count: 1, population: "26M", gdp: "1,690 Mds$", language: "Anglais", local_contact: "Yuki Tanaka", description: "Extension AU + NZ." },
    { id: "demo_ng", flag: "🇳🇬", name: "Nigeria", region: "Afrique", phase: 0, pct: 15, status: "planning", color: "plum", budget: "600K€", team_size: 2, risk_count: 3, population: "220M", gdp: "440 Mds$", language: "Anglais", local_contact: "Amara Okafor", description: "Phase de prospection initiale." },
    { id: "demo_sa", flag: "🇸🇦", name: "Arabie Saoudite", region: "Moyen-Orient", phase: 0, pct: 10, status: "planning", color: "gold", budget: "500K€", team_size: 1, risk_count: 2, population: "36M", gdp: "1,060 Mds$", language: "Arabe", local_contact: "Alice Dupont", description: "Opportunité Vision 2030." },
  ];
  await admin.from("countries").upsert(countries, { onConflict: "id" });

  await admin.from("tasks").insert([
    { title: "Déposer la marque en Allemagne", country_id: "demo_de", country_label: "🇩🇪 Allemagne", due_date: "30 Juil 2025", priority: "high", status: "done", owner_name: "Marc Richter" },
    { title: "Finaliser contrat partenaire Tokyo", country_id: "demo_jp", country_label: "🇯🇵 Japon", due_date: "5 Août 2025", priority: "high", status: "done", owner_name: "Yuki Tanaka" },
    { title: "Rédiger plan de communication Brésil", country_id: "demo_br", country_label: "🇧🇷 Brésil", due_date: "15 Août 2025", priority: "med", status: "open", owner_name: "Carlos Silva" },
    { title: "Recruter directeur pays Australie", country_id: "demo_au", country_label: "🇦🇺 Australie", due_date: "1 Sep 2025", priority: "high", status: "open", owner_name: "Yuki Tanaka" },
    { title: "Analyser cadre réglementaire Nigeria", country_id: "demo_ng", country_label: "🇳🇬 Nigeria", due_date: "20 Juil 2025", priority: "high", status: "late", owner_name: "Amara Okafor" },
  ]);

  await admin.from("risks").insert([
    { title: "Instabilité réglementaire", country_id: "demo_ng", country_label: "🇳🇬 Nigeria", category: "Juridique", level: "high" },
    { title: "Inflation monnaie locale +18%", country_id: "demo_br", country_label: "🇧🇷 Brésil", category: "Financier", level: "high" },
    { title: "Délai certification produit", country_id: "demo_jp", country_label: "🇯🇵 Japon", category: "Opérationnel", level: "medium" },
    { title: "Pénurie de talents locaux", country_id: "demo_de", country_label: "🇩🇪 Allemagne", category: "RH", level: "medium" },
  ]);

  await admin.from("budget_entries").insert([
    { country_id: "demo_de", country_label: "🇩🇪 Allemagne", allocated_k: 1800, spent_k: 1240, color: "sage" },
    { country_id: "demo_jp", country_label: "🇯🇵 Japon", allocated_k: 2000, spent_k: 1850, color: "sky" },
    { country_id: "demo_br", country_label: "🇧🇷 Brésil", allocated_k: 1200, spent_k: 560, color: "gold" },
    { country_id: "demo_au", country_label: "🇦🇺 Australie", allocated_k: 900, spent_k: 420, color: "terracotta" },
  ]);

  await admin.from("milestones").insert([
    { country_id: "demo_de", icon: "📋", title: "Étude de marché complète", target_date: "Mars 2025", is_done: true, sort_order: 0 },
    { country_id: "demo_de", icon: "⚖️", title: "Dépôt de marque", target_date: "Mai 2025", is_done: true, sort_order: 1 },
    { country_id: "demo_de", icon: "🏢", title: "Ouverture bureau Berlin", target_date: "Juil 2025", is_done: false, sort_order: 2 },
    { country_id: "demo_jp", icon: "🤝", title: "Contrat partenaire Tokyo", target_date: "Fév 2025", is_done: true, sort_order: 0 },
    { country_id: "demo_jp", icon: "🏢", title: "Bureau Tokyo opérationnel", target_date: "Avr 2025", is_done: true, sort_order: 1 },
    { country_id: "demo_jp", icon: "🚀", title: "Lancement grand public", target_date: "Sep 2025", is_done: false, sort_order: 2 },
  ]);

  await admin.from("comments").insert([
    { author_name: "Alice Dupont", author_initials: "AD", author_color: "#1C2B3A", market_id: "demo_jp", market_label: "Japon", content: "Super nouvelles du Japon ! Le contrat avec Tokyo Distribution est signé.", tags: ["Japon", "Lancement"] },
    { author_name: "Yuki Tanaka", author_initials: "YT", author_color: "#7C8B6E", market_id: "demo_jp", market_label: "Japon", content: "Je prépare le deck pour le lancement de septembre.", tags: ["Japon"] },
    { author_name: "Marc Richter", author_initials: "MR", author_color: "#8B7355", market_id: "demo_de", market_label: "Allemagne", content: "La visite du bureau à Berlin s'est très bien passée. Espace parfait, 350m².", tags: ["Allemagne", "Bureau"] },
    { author_name: "Amara Okafor", author_initials: "AO", author_color: "#6B7B8D", market_id: "demo_ng", market_label: "Nigeria", content: "⚠️ Nouvelles réglementations sur les opérateurs étrangers au Nigeria.", tags: ["Nigeria", "Risque"] },
  ]);

  await admin.from("activity_log").insert([
    { user_id: demoUserId, user_name: "Marc Richter", action: "a mis à jour l'avancement Allemagne à 75%", entity_type: "country", market_flag: "🇩🇪", color: "sage" },
    { user_id: demoUserId, user_name: "Yuki Tanaka", action: "a terminé \"Finaliser contrat Tokyo\"", entity_type: "task", market_flag: "🇯🇵", color: "sky" },
    { user_id: demoUserId, user_name: "Alice Dupont", action: "a commenté le marché Japon", entity_type: "comment", market_flag: "🇯🇵", color: "navy" },
    { user_id: demoUserId, user_name: "Amara Okafor", action: "a créé une alerte risque Nigeria", entity_type: "risk", market_flag: "🇳🇬", color: "terracotta" },
    { user_id: demoUserId, user_name: "Carlos Silva", action: "a fait passer le Brésil en Phase 1", entity_type: "country", market_flag: "🇧🇷", color: "gold" },
    { user_id: demoUserId, user_name: "Alice Dupont", action: "a approuvé le budget Q3 Australie", entity_type: "budget", market_flag: "🇦🇺", color: "plum" },
  ]);
}
