import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner@2.0.3';
import { 
  Users, 
  Gift, 
  Ticket, 
  Shield, 
  Eye, 
  Trash2, 
  Plus,
  Download,
  RefreshCw,
  Calendar,
  Hash,
  Check,
  X
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  last_sign_in_at?: string;
  profile?: any;
  purchases?: string[];
}

interface AccessCode {
  code: string;
  trackNames: string[];
  usageLimit: number;
  usageCount: number;
  expiresAt: string;
  createdAt: string;
  active: boolean;
  lastUsedAt?: string;
  lastUsedBy?: string;
}

const TRACKS = ['Money', 'Relationships', 'Discipline', 'Ego'];

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<string[]>([]);
  
  // Code generation state
  const [newCodeTracks, setNewCodeTracks] = useState<string[]>([]);
  const [codeExpiryDays, setCodeExpiryDays] = useState(30);
  const [codeUsageLimit, setCodeUsageLimit] = useState(1);
  
  // Code redemption state
  const [redemptionCode, setRedemptionCode] = useState('');

  // Check if user is admin
  const isAdmin = user?.email && ['admin@stoicaf.com', 'brad@stoicaf.com'].includes(user.email.toLowerCase());

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadUsers(), loadAccessCodes()]);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { projectId } = await import('../utils/supabase/info');
      const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session.data.session?.access_token) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/admin/users`, {
        headers: { 'Authorization': `Bearer ${session.data.session.access_token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setUsers(result.users || []);
      } else {
        throw new Error('Failed to fetch users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      throw error;
    }
  };

  const loadAccessCodes = async () => {
    try {
      const { projectId } = await import('../utils/supabase/info');
      const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session.data.session?.access_token) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/admin/codes`, {
        headers: { 'Authorization': `Bearer ${session.data.session.access_token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setAccessCodes(result.codes || []);
      } else {
        throw new Error('Failed to fetch access codes');
      }
    } catch (error) {
      console.error('Error loading access codes:', error);
      throw error;
    }
  };

  const grantAccess = async () => {
    if (selectedUsers.length === 0 || selectedTracks.length === 0) {
      toast.error('Please select users and tracks');
      return;
    }

    try {
      const { projectId } = await import('../utils/supabase/info');
      const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session.data.session?.access_token) return;

      for (const userId of selectedUsers) {
        const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/admin/grant-access`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.data.session.access_token}`,
          },
          body: JSON.stringify({ userId, trackNames: selectedTracks }),
        });

        if (!response.ok) {
          throw new Error(`Failed to grant access to user ${userId}`);
        }
      }

      toast.success(`Access granted to ${selectedUsers.length} users for ${selectedTracks.length} tracks`);
      setSelectedUsers([]);
      setSelectedTracks([]);
      await loadUsers();
    } catch (error) {
      console.error('Error granting access:', error);
      toast.error('Failed to grant access');
    }
  };

  const generateAccessCode = async () => {
    if (newCodeTracks.length === 0) {
      toast.error('Please select tracks for the access code');
      return;
    }

    try {
      const { projectId } = await import('../utils/supabase/info');
      const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session.data.session?.access_token) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/admin/generate-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({
          trackNames: newCodeTracks,
          expiresInDays: codeExpiryDays,
          usageLimit: codeUsageLimit,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Access code generated: ${result.accessCode.code}`);
        setNewCodeTracks([]);
        setCodeExpiryDays(30);
        setCodeUsageLimit(1);
        await loadAccessCodes();
      } else {
        throw new Error('Failed to generate access code');
      }
    } catch (error) {
      console.error('Error generating access code:', error);
      toast.error('Failed to generate access code');
    }
  };

  const redeemCode = async () => {
    if (!redemptionCode.trim()) {
      toast.error('Please enter an access code');
      return;
    }

    try {
      const { projectId } = await import('../utils/supabase/info');
      const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session.data.session?.access_token) return;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/admin/redeem-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session.access_token}`,
        },
        body: JSON.stringify({ code: redemptionCode.trim() }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setRedemptionCode('');
        await loadUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to redeem access code');
      }
    } catch (error) {
      console.error('Error redeeming code:', error);
      toast.error('Failed to redeem access code');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin panel
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-8 w-8" />
              Stoic AF Admin Panel
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage users, access, and redemption codes
            </p>
          </div>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users ({users.length})
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Grant Access
            </TabsTrigger>
            <TabsTrigger value="codes" className="flex items-center gap-2">
              <Ticket className="h-4 w-4" />
              Access Codes ({accessCodes.length})
            </TabsTrigger>
            <TabsTrigger value="redeem" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Redeem Code
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  View and manage user accounts and their track access
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Purchased Tracks</TableHead>
                        <TableHead>Current Track</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.email}</TableCell>
                          <TableCell>{user.name || '-'}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {user.purchases && user.purchases.length > 0 ? (
                                user.purchases.map((track) => (
                                  <Badge key={track} variant="secondary" className="text-xs">
                                    {track}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.profile?.current_track ? (
                              <Badge variant="outline">{user.profile.current_track}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            {user.profile?.current_track ? (
                              <span className="text-sm">
                                Day {user.profile.current_day || 0}/30
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grant Access Tab */}
          <TabsContent value="access" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Select Users</CardTitle>
                  <CardDescription>
                    Choose users to grant track access to
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={user.id}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedUsers(prev => [...prev, user.id]);
                          } else {
                            setSelectedUsers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                      />
                      <Label htmlFor={user.id} className="flex-1 cursor-pointer">
                        <div>
                          <div className="font-medium">{user.email}</div>
                          <div className="text-sm text-muted-foreground">
                            {user.purchases?.length || 0} tracks owned
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Select Tracks</CardTitle>
                  <CardDescription>
                    Choose which tracks to grant access to
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {TRACKS.map((track) => (
                    <div key={track} className="flex items-center space-x-2">
                      <Checkbox
                        id={track}
                        checked={selectedTracks.includes(track)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTracks(prev => [...prev, track]);
                          } else {
                            setSelectedTracks(prev => prev.filter(t => t !== track));
                          }
                        }}
                      />
                      <Label htmlFor={track} className="cursor-pointer">
                        {track} Track
                      </Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Grant access to {selectedUsers.length} users for {selectedTracks.length} tracks
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This will immediately add the selected tracks to the users' accounts
                    </p>
                  </div>
                  <Button 
                    onClick={grantAccess}
                    disabled={selectedUsers.length === 0 || selectedTracks.length === 0}
                  >
                    <Gift className="h-4 w-4 mr-2" />
                    Grant Access
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access Codes Tab */}
          <TabsContent value="codes" className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Generate New Code</CardTitle>
                  <CardDescription>
                    Create access codes that users can redeem for tracks
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">Select Tracks</Label>
                    <div className="mt-2 space-y-2">
                      {TRACKS.map((track) => (
                        <div key={track} className="flex items-center space-x-2">
                          <Checkbox
                            id={`new-${track}`}
                            checked={newCodeTracks.includes(track)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setNewCodeTracks(prev => [...prev, track]);
                              } else {
                                setNewCodeTracks(prev => prev.filter(t => t !== track));
                              }
                            }}
                          />
                          <Label htmlFor={`new-${track}`} className="cursor-pointer">
                            {track} Track
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="expiry-days">Expires in (days)</Label>
                      <Input
                        id="expiry-days"
                        type="number"
                        value={codeExpiryDays}
                        onChange={(e) => setCodeExpiryDays(Number(e.target.value))}
                        min="1"
                        max="365"
                      />
                    </div>
                    <div>
                      <Label htmlFor="usage-limit">Usage limit</Label>
                      <Input
                        id="usage-limit"
                        type="number"
                        value={codeUsageLimit}
                        onChange={(e) => setCodeUsageLimit(Number(e.target.value))}
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>

                  <Button 
                    onClick={generateAccessCode}
                    disabled={newCodeTracks.length === 0}
                    className="w-full"
                  >
                    <Ticket className="h-4 w-4 mr-2" />
                    Generate Access Code
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Existing Codes</CardTitle>
                  <CardDescription>
                    View and manage generated access codes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {accessCodes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No access codes generated yet
                      </p>
                    ) : (
                      accessCodes.map((code) => (
                        <div key={code.code} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {code.code}
                            </code>
                            <Badge variant={code.active ? "default" : "secondary"}>
                              {code.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {code.trackNames.map((track) => (
                              <Badge key={track} variant="outline" className="text-xs">
                                {track}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div>Usage: {code.usageCount}/{code.usageLimit}</div>
                            <div>Expires: {new Date(code.expiresAt).toLocaleDateString()}</div>
                            <div>Created: {new Date(code.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Redeem Code Tab */}
          <TabsContent value="redeem" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Redeem Access Code</CardTitle>
                <CardDescription>
                  Redeem an access code for your own account (for testing)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="redemption-code">Access Code</Label>
                  <Input
                    id="redemption-code"
                    value={redemptionCode}
                    onChange={(e) => setRedemptionCode(e.target.value)}
                    placeholder="Enter access code (e.g., STOIC-ABCD1234)"
                    className="font-mono"
                  />
                </div>
                <Button 
                  onClick={redeemCode}
                  disabled={!redemptionCode.trim()}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Redeem Code
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}