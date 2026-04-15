import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const today = new Date().toISOString().split("T")[0];

    // Find tasks with due_date < today and status not 'done' or 'late'
    const { data: overdueTasks, error } = await supabase
      .from("tasks")
      .select("id, title, due_date, status, owner_name, country_label, assigned_to")
      .not("due_date", "is", null)
      .neq("due_date", "")
      .lt("due_date", today)
      .not("status", "in", '("done","late")');

    if (error) throw error;

    if (!overdueTasks || overdueTasks.length === 0) {
      return new Response(JSON.stringify({ updated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update all overdue tasks to 'late'
    const ids = overdueTasks.map((t) => t.id);
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ status: "late" })
      .in("id", ids);

    if (updateError) throw updateError;

    // Log activity for each
    const logs = overdueTasks.map((t) => ({
      action: `Tâche "${t.title}" marquée en retard automatiquement`,
      entity_type: "task",
      entity_id: t.id,
      user_name: "Système",
      color: "terracotta",
    }));
    await supabase.from("activity_log").insert(logs);

    // Send email notifications for each overdue task with an assignee
    for (const task of overdueTasks) {
      if (!task.assigned_to) continue;
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", task.assigned_to)
        .single();

      // Get assignee email from auth
      const { data: userData } = await supabase.auth.admin.getUserById(task.assigned_to);
      const email = userData?.user?.email;
      if (!email) continue;

      try {
        await supabase.rpc("enqueue_email", {
          queue_name: "transactional_emails",
          payload: {
            to: email,
            template_name: "task-overdue",
            idempotency_key: `task-overdue-${task.id}-${today}`,
            template_data: {
              taskTitle: task.title,
              dueDate: task.due_date,
              ownerName: profile?.full_name || task.owner_name || "",
              countryName: task.country_label || "",
              recipientName: profile?.full_name || "",
            },
          },
        });
      } catch {
        // Continue even if email fails
      }
    }

    return new Response(JSON.stringify({ updated: ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
