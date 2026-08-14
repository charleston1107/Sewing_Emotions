let sewingEmotionsSupabaseClientPromise;

function getSupabaseClient() {
  if (!sewingEmotionsSupabaseClientPromise) {
    sewingEmotionsSupabaseClientPromise = createSupabaseClient();
  }

  return sewingEmotionsSupabaseClientPromise;
}

async function createSupabaseClient() {
  if (!window.supabase?.createClient) {
    throw new Error("The account service could not load. Check your internet connection and try again.");
  }

  const response = await fetch("/api/public-config", { cache: "no-store" });
  const config = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(config.error || "The account service is not configured.");
  }

  return window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

window.getSupabaseClient = getSupabaseClient;
