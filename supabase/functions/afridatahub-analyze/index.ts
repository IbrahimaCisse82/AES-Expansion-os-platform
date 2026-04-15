import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, description, existingData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Tu es un analyste expert en économie africaine et en développement international. 
Tu analyses les projets d'expansion en Afrique et fournis des recommandations stratégiques.

CONTEXTE : L'utilisateur soumet un projet pour un pays africain cible. Tu dois :
1. Analyser la pertinence du projet dans le contexte économique du pays
2. Identifier les accords, programmes et financeurs compatibles parmi les données existantes
3. Générer des recommandations stratégiques personnalisées
4. Identifier les risques et opportunités spécifiques au pays

DONNÉES EXISTANTES (base de matching) :
${existingData ? JSON.stringify(existingData, null, 0) : "Aucune donnée fournie"}

FORMAT DE RÉPONSE : Tu dois répondre UNIQUEMENT en JSON valide avec cette structure exacte :
{
  "summary": "Résumé exécutif de l'analyse (2-3 phrases)",
  "country_context": "Contexte économique actuel du pays cible (3-4 phrases avec données réelles)",
  "matched_items": [
    {
      "id": "ID de l'élément existant matché",
      "relevance_score": 85,
      "relevance_reason": "Explication courte du lien avec le projet"
    }
  ],
  "recommendations": [
    {
      "title": "Titre de la recommandation",
      "description": "Description détaillée",
      "priority": "haute|moyenne|basse",
      "category": "financement|partenariat|réglementation|marché|timing"
    }
  ],
  "risks": [
    {
      "title": "Titre du risque",
      "description": "Description",
      "severity": "élevé|moyen|faible",
      "mitigation": "Stratégie d'atténuation suggérée"
    }
  ],
  "opportunities": [
    {
      "title": "Titre de l'opportunité",
      "description": "Description",
      "potential_impact": "fort|moyen|faible"
    }
  ],
  "next_steps": ["Étape 1", "Étape 2", "Étape 3"]
}`;

    const userPrompt = `Analyse ce projet d'expansion :
- Pays cible : ${country || "Non spécifié"}
- Description du projet : ${description || "Non fournie"}

Fournis une analyse complète avec matching des données existantes, recommandations stratégiques, risques et opportunités. Utilise des données économiques réelles et actuelles pour le contexte pays.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Limite de requêtes atteinte, veuillez réessayer dans quelques instants.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Crédits IA épuisés. Ajoutez des crédits dans Paramètres > Workspace > Usage.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service d'analyse IA" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("afridatahub-analyze error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Erreur inconnue",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
