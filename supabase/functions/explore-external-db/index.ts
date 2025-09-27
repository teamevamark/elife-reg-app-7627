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

    const { action, panchayath_id } = await req.json().catch(() => ({ action: 'explore_schema' }));

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
        // Try multiple possible table names
        let panchayathData = null;
        let panchayathError = null;
        
        const panchayathTables = ['panchayaths', 'panchayath'];
        for (const tableName of panchayathTables) {
          try {
            const { data, error } = await externalSupabase
              .from(tableName)
              .select('*')
              .order('name');
            
            if (data && !error) {
              panchayathData = data;
              break;
            }
            panchayathError = error;
          } catch (e) {
            panchayathError = e;
          }
        }
        
        if (!panchayathData && panchayathError) throw panchayathError;
        result = { panchayaths: panchayathData || [] };
        break;

      case 'fetch_wards':
        if (!panchayath_id) throw new Error('panchayath_id is required');
        
        // Try multiple possible table names and column names
        let wardData = null;
        let wardError = null;
        
        const wardTables = ['wards', 'ward'];
        const panchayathColumns = ['panchayath_id', 'panchayath', 'panchayath_uuid'];
        
        for (const tableName of wardTables) {
          for (const columnName of panchayathColumns) {
            try {
              const { data, error } = await externalSupabase
                .from(tableName)
                .select('*')
                .eq(columnName, panchayath_id)
                .order('name');
              
              if (data && !error) {
                wardData = data;
                break;
              }
              wardError = error;
            } catch (e) {
              wardError = e;
            }
          }
          if (wardData) break;
        }
        
        if (!wardData && wardError) throw wardError;
        result = { wards: wardData || [] };
        break;

      case 'fetch_agents':
        // Try multiple possible table names
        let agentData = null;
        let agentError = null;
        
        const agentTables = ['agents', 'agent', 'pros', 'pro'];
        for (const tableName of agentTables) {
          try {
            const { data, error } = await externalSupabase
              .from(tableName)
              .select('*')
              .order('name');
            
            if (data && !error) {
              agentData = data;
              break;
            }
            agentError = error;
          } catch (e) {
            agentError = e;
          }
        }
        
        if (!agentData && agentError) throw agentError;
        result = { agents: agentData || [] };
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