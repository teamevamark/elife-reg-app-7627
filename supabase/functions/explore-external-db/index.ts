import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EXTERNAL_SUPABASE_URL = "https://atwqmghvpyawsxeykgpb.supabase.co";
    const EXTERNAL_SUPABASE_ANON_KEY = Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY');

    if (!EXTERNAL_SUPABASE_ANON_KEY) {
      throw new Error('External Supabase anon key not found');
    }

    // Create client for external database
    const externalSupabase = createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_ANON_KEY);

    const { action } = await req.json();

    let result;

    switch (action) {
      case 'explore_schema':
        // Try to fetch from common table names to understand structure
        const tableChecks = [
          { name: 'panchayaths', query: externalSupabase.from('panchayaths').select('*').limit(5) },
          { name: 'wards', query: externalSupabase.from('wards').select('*').limit(5) },
          { name: 'agents', query: externalSupabase.from('agents').select('*').limit(5) },
          { name: 'pros', query: externalSupabase.from('pros').select('*').limit(5) },
          { name: 'panchayath', query: externalSupabase.from('panchayath').select('*').limit(5) },
          { name: 'ward', query: externalSupabase.from('ward').select('*').limit(5) },
          { name: 'agent', query: externalSupabase.from('agent').select('*').limit(5) },
          { name: 'pro', query: externalSupabase.from('pro').select('*').limit(5) },
        ];

        const schema: Record<string, any> = {};
        for (const check of tableChecks) {
          try {
            const { data, error } = await check.query;
            if (data && !error) {
              schema[check.name] = {
                sample_data: data,
                count: data.length
              };
            }
          } catch (e) {
            // Table doesn't exist, continue
          }
        }
        result = { schema };
        break;

      case 'fetch_panchayaths':
        const { data: panchayathData, error: panchayathError } = await externalSupabase
          .from('panchayaths')
          .select('*')
          .order('name');
        
        if (panchayathError) throw panchayathError;
        result = { panchayaths: panchayathData };
        break;

      case 'fetch_wards':
        const { panchayath_id } = await req.json();
        const { data: wardData, error: wardError } = await externalSupabase
          .from('wards')
          .select('*')
          .eq('panchayath_id', panchayath_id)
          .order('name');
        
        if (wardError) throw wardError;
        result = { wards: wardData };
        break;

      case 'fetch_agents':
        const { data: agentData, error: agentError } = await externalSupabase
          .from('agents')
          .select('*')
          .order('name');
        
        if (agentError) throw agentError;
        result = { agents: agentData };
        break;

      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});