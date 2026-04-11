import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lines, categories, action } = await req.json();
    if (!lines || !categories || !action) {
      return new Response(JSON.stringify({ error: "Missing lines, categories or action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `Tu es un analyste financier FP&A expert. Tu analyses des données budgétaires mensuelles (m1 à m12) et retournes UNIQUEMENT du JSON valide sans markdown.`;

    let userPrompt = "";

    if (action === "forecast") {
      userPrompt = `Analyse ces lignes budgétaires et génère des prévisions pour les 6 prochains mois (m7-m12) en te basant sur la tendance des mois précédents.
Retourne un JSON: {"forecasts": [{"category": "nom", "m7": number, "m8": number, "m9": number, "m10": number, "m11": number, "m12": number, "confidence": number, "trend": "up"|"down"|"stable"}], "summary": "résumé"}
Données: ${JSON.stringify(lines.slice(0, 50))}
Catégories: ${JSON.stringify(categories.map((c: Record<string, string>) => ({ id: c.id, name: c.name, type: c.type })))}`;
    } else if (action === "anomalies") {
      userPrompt = `Analyse ces lignes budgétaires et détecte les anomalies (écarts inhabituels, pics, chutes).
Retourne un JSON: {"anomalies": [{"line_id": "id", "category": "nom", "month": "m1-m12", "value": number, "expected": number, "severity": "high"|"medium"|"low", "description": "explication"}], "summary": "résumé"}
Données: ${JSON.stringify(lines.slice(0, 50))}
Catégories: ${JSON.stringify(categories.map((c: Record<string, string>) => ({ id: c.id, name: c.name, type: c.type })))}`;
    } else if (action === "recommendations") {
      userPrompt = `Analyse ces données budgétaires et fais des recommandations stratégiques pour optimiser le budget.
Retourne un JSON: {"recommendations": [{"title": "titre", "description": "description détaillée", "impact": "high"|"medium"|"low", "category": "cost_reduction"|"revenue_growth"|"efficiency"|"risk", "estimated_savings": number}], "summary": "résumé"}
Données: ${JSON.stringify(lines.slice(0, 50))}
Catégories: ${JSON.stringify(categories.map((c: Record<string, string>) => ({ id: c.id, name: c.name, type: c.type })))}`;
    } else {
      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("AI Gateway error:", err);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { error: "Failed to parse AI response", raw: content };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
