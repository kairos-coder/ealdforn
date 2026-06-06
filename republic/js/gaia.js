/**
 * GAIA.JS — The DivineDB Connection
 * Located: /ealdforn/republic/js/gaia.js
 */

const Gaia = (() => {
  const SUPABASE_URL = 'https://kzcucjcyxybypncbdbws.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3VjamN5eHlieXBuY2JkYndzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzIwMTYsImV4cCI6MjA5MjAwODAxNn0.Z8A74B-Rck1POzWkvMXAnfNP6XObJ-MZxLpvOcAC_ig';

  let supabase = null;
  let initialized = false;

  function init() {
    if (initialized && supabase) return supabase;
    
    // Ensure window.supabase is available from the CDN
    if (typeof window.supabase === 'undefined') {
      console.error('❌ Supabase CDN not loaded');
      return null;
    }
    
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    initialized = true;
    console.log('✅ DivineDB connected.');
    return supabase;
  }

  return {
    get supabase() { return init(); },
    
    // Fetch readings for the Ledger of Memory-Events
    async getMemoryEvents(limit = 20) {
      const client = init();
      if (!client) return [];
      
      const { data, error } = await client
        .from('readings')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
        
      if (error) { console.error("Ledger read error:", error); return []; }
      return data || [];
    },

    // Fetch active mandates from the Telos table
    async getActiveMandates() {
      const client = init();
      if (!client) return [];
      
      const { data, error } = await client
        .from('telos')
        .select('*')
        .eq('is_active', true)
        .order('urgency', { ascending: false });
        
      if (error) { console.error("Mandate error:", error); return []; }
      return data || [];
    },

    // Fetch the latest Sky State balance (Olympus vs Underworld)
    async getLatestSkyState() {
      const client = init();
      if (!client) return null;
      
      const { data, error } = await client
        .from('sky_states')
        .select('*')
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();
        
      if (error) { console.warn("Sky State error:", error); return null; }
      return data;
    }
  };
})();
