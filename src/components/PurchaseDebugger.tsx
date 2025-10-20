import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function PurchaseDebugger() {
  const [loading, setLoading] = useState(false);
  const [purchases, setPurchases] = useState<string[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const refreshPurchases = async () => {
    setLoading(true);
    try {
      const { projectId } = await import('../utils/supabase/info');
      const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session.data.session?.access_token) {
        toast.error('Not authenticated');
        return;
      }

      const accessToken = session.data.session.access_token;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/purchases`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPurchases(result.purchases || []);
        setLastChecked(new Date().toLocaleString());
        toast.success(`Found ${result.purchases?.length || 0} purchased tracks`);
        console.log('Purchase debugger: Current purchases:', result.purchases);
      } else {
        const errorResult = await response.json();
        toast.error(`Error: ${errorResult.error || 'Failed to fetch purchases'}`);
        console.error('Purchase debugger error:', errorResult);
      }
    } catch (error) {
      console.error('Purchase debugger error:', error);
      toast.error('Failed to check purchases');
    } finally {
      setLoading(false);
    }
  };

  const grantAllTracks = async () => {
    setLoading(true);
    try {
      const { projectId } = await import('../utils/supabase/info');
      const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session.data.session?.access_token) {
        toast.error('Not authenticated');
        return;
      }

      const accessToken = session.data.session.access_token;
      const trackNames = ['Money', 'Relationships', 'Discipline', 'Ego'];
      
      let granted = 0;
      for (const trackName of trackNames) {
        try {
          const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/dev/grant-track`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ trackName }),
          });

          if (response.ok) {
            granted++;
            console.log(`✅ Granted ${trackName} track`);
          } else {
            const error = await response.json();
            console.log(`⚠️ ${trackName}: ${error.error || 'Failed'}`);
          }
        } catch (error) {
          console.error(`Error granting ${trackName}:`, error);
        }
      }

      // Refresh purchases to show the new tracks
      await refreshPurchases();
      toast.success(`✅ Granted ${granted} tracks! Refresh complete.`);
    } catch (error) {
      console.error('Error granting tracks:', error);
      toast.error('Failed to grant tracks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Purchase Debugger
        </CardTitle>
        <CardDescription>
          Check your current purchased tracks and troubleshoot issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={refreshPurchases} 
            disabled={loading}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Check Purchases
          </Button>
        </div>

        {lastChecked && (
          <div className="text-sm text-muted-foreground">
            Last checked: {lastChecked}
          </div>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">Current Purchases:</h4>
          {purchases.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {purchases.map((track) => (
                <Badge key={track} variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {track}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded">
              No purchases found
            </div>
          )}
        </div>

        <div className="pt-4 border-t">
          <div className="text-sm text-muted-foreground mb-2">
            Development Only:
          </div>
          <Button 
            onClick={grantAllTracks} 
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            Grant All Tracks (Dev)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}