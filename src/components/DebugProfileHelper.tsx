import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

export default function DebugProfileHelper() {
  const { user, profile, refreshProfile } = useAuth();

  if (!user) return null;

  return (
    <Card className="border-orange-200 bg-orange-50/50 mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          Debug: Profile Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>
          <span className="font-medium">User ID:</span> {user.id.substring(0, 8)}...
        </div>
        <div>
          <span className="font-medium">Current Track:</span>{' '}
          {profile?.current_track ? (
            <Badge variant="outline" className="text-xs">{profile.current_track}</Badge>
          ) : (
            <span className="text-muted-foreground">None</span>
          )}
        </div>
        <div>
          <span className="font-medium">Current Day:</span> {profile?.current_day || 0}
        </div>
        <div>
          <span className="font-medium">Has Active Track:</span>{' '}
          <Badge variant={Boolean(profile?.current_track) ? "default" : "outline"}>
            {Boolean(profile?.current_track) ? "Yes" : "No"}
          </Badge>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={refreshProfile}
          className="mt-2 text-xs"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh Profile
        </Button>
      </CardContent>
    </Card>
  );
}