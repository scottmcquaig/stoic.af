import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Shield, Key, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

export default function AdminBootstrap() {
  const [email, setEmail] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBootstrap = async () => {
    if (!email || !secretKey) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { projectId } = await import('../utils/supabase/info');
      
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/admin/bootstrap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, secretKey }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setEmail('');
        setSecretKey('');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Bootstrap failed');
      }
    } catch (error) {
      console.error('Bootstrap error:', error);
      toast.error('Bootstrap failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
          <CardTitle>Admin Bootstrap</CardTitle>
          <CardDescription>
            Grant yourself admin access to the Stoic AF admin panel
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Security Notice:</strong> Remove the bootstrap endpoint from the server after use!
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="email">Your Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your-email@example.com"
            />
          </div>

          <div>
            <Label htmlFor="secret">Secret Key</Label>
            <Input
              id="secret"
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Enter the bootstrap secret"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Default: STOIC_ADMIN_SETUP_2024
            </p>
          </div>

          <Button 
            onClick={handleBootstrap}
            disabled={!email || !secretKey || loading}
            className="w-full"
          >
            <Key className="h-4 w-4 mr-2" />
            {loading ? 'Setting up...' : 'Grant Admin Access'}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Instructions:</strong></p>
            <p>1. Enter your email address</p>
            <p>2. Use secret key: STOIC_ADMIN_SETUP_2024</p>
            <p>3. After successful setup, access admin with ?admin=true</p>
            <p>4. <strong>Remove the bootstrap endpoint from server!</strong></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}