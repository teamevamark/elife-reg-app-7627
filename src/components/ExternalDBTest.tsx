import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ExternalDBTest = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const exploreSchema = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('explore-external-db', {
        body: { action: 'explore_schema' }
      });
      
      if (error) throw error;
      setResults(data);
    } catch (error) {
      console.error('Error exploring schema:', error);
      setResults({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>External Database Schema Explorer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={exploreSchema} disabled={loading}>
          {loading ? 'Exploring...' : 'Explore External Database Schema'}
        </Button>
        
        {results && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Results:</h3>
            <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExternalDBTest;