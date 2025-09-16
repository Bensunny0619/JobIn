// supabase/functions/check-reminders/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Setup Supabase client with service role key (for full DB access)
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  const now = new Date().toISOString();

  // 1. Find notes where reminder_date <= now
  const { data: reminders, error } = await supabase
    .from("notes")
    .select("*")
    .not("reminder_date", "is", null)
    .lte("reminder_date", now);

  if (error) {
    console.error("Error fetching reminders:", error);
    return new Response("Error fetching reminders", { status: 500 });
  }

  if (!reminders || reminders.length === 0) {
    return new Response("No reminders due");
  }

  // 2. (Future) You could send emails, push notifications, etc.
  // For now, just log them:
  console.log("Due reminders:", reminders);

  return new Response(
    JSON.stringify({ message: "Reminders checked", reminders }),
    { headers: { "Content-Type": "application/json" } }
  );
});
