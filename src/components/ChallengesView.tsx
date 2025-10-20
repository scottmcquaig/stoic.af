import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { 
  DollarSign, 
  Heart, 
  Target, 
  Brain,
  ShoppingCart,
  CheckCircle,
  Lock,
  CreditCard,
  Loader2,
  Star,
  Shield,
  Zap,
  Lightbulb,
  Package
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import StripePaymentForm from './StripePaymentForm';


const focuses = [
  {
    icon: DollarSign,
    name: "Money",
    title: "Master Your Wealth Mindset",
    description: "Stop being broke in your mind before your wallet. Build a healthy relationship with money through Stoic principles.",
    color: "var(--track-money)",
    preview: [
      "Identify toxic money beliefs",
      "Build abundance mindset", 
      "Control spending impulses",
      "Develop financial discipline"
    ]
  },
  {
    icon: Heart,
    name: "Relationships", 
    title: "Control Yourself, Not Others",
    description: "The problem isn't them. It's how you react to them. Master your responses and build stronger connections.",
    color: "var(--track-relationships)",
    preview: [
      "Set real boundaries",
      "Stop people-pleasing",
      "Communicate like an adult",
      "Build authentic connections"
    ]
  },
  {
    icon: Target,
    name: "Discipline",
    title: "Build Unbreakable Habits", 
    description: "Motivation is trash. Discipline is forever. Create systems that make success inevitable.",
    color: "var(--track-discipline)",
    preview: [
      "Master your mornings",
      "Defeat procrastination",
      "Build compound habits",
      "Develop mental toughness"
    ]
  },
  {
    icon: Brain,
    name: "Ego",
    title: "Get Out of Your Own Way",
    description: "Your biggest enemy looks at you in the mirror. Overcome self-sabotage and build real confidence.",
    color: "var(--track-ego)", 
    preview: [
      "Identify ego traps",
      "Build real confidence", 
      "Accept harsh truths",
      "Develop humility"
    ]
  }
];

export default function ChallengesView() {
  const { user, profile, refreshProfile } = useAuth();
  const [purchases, setPurchases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingTrack, setStartingTrack] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [selectedBundle, setSelectedBundle] = useState<any>(null);

  // Load user's purchases
  useEffect(() => {
    const loadPurchases = async () => {
      if (!user) return;
      
      try {
        const { projectId } = await import('../utils/supabase/info');
        const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
        
        if (!session.data.session?.access_token) {
          console.log('No valid session found, skipping purchases load');
          setLoading(false);
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
        }
      } catch (error) {
        console.error('Error loading purchases:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPurchases();
  }, [user]);

  const handlePurchaseClick = (track: any) => {
    setSelectedTrack(track);
    setSelectedBundle(null);
    setShowPaymentForm(true);
  };

  const handleBundlePurchaseClick = (bundle: any) => {
    setSelectedBundle(bundle);
    setSelectedTrack(null);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSelectedTrack(null);
    // Reload purchases to reflect the new purchase
    const loadPurchases = async () => {
      try {
        const { projectId } = await import('../utils/supabase/info');
        const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
        
        if (!session.data.session?.access_token) {
          console.log('No valid session found, cannot reload purchases');
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
        }
      } catch (error) {
        console.error('Error reloading purchases:', error);
      }
    };
    loadPurchases();
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setSelectedTrack(null);
    setSelectedBundle(null);
  };

  const startFocus = async (focusName: string) => {
    setStartingTrack(true);
    try {
      const { projectId } = await import('../utils/supabase/info');
      const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());
      
      if (!session.data.session?.access_token) {
        toast.error('Please sign in to start focus areas');
        return;
      }

      const accessToken = session.data.session.access_token;

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/journal/start-track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ trackName: focusName }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Start focus API error:', error);
        throw new Error(error.error || 'Failed to start focus');
      }

      const result = await response.json();
      console.log('✅ Start focus API success:', result);
      
      console.log('🔄 Refreshing profile after starting focus...');
      await refreshProfile();
      console.log('✅ Profile refresh completed');
      
      toast.success(`Started ${focusName} focus! 🚀 Let's begin your 30-day journey!`);
    } catch (error) {
      console.error('Error starting focus:', error);
      toast.error('Failed to start focus. Please try again.');
    } finally {
      setStartingTrack(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const purchasedFocuses = focuses.filter(focus => purchases.includes(focus.name));
  const availableFocuses = focuses.filter(focus => !purchases.includes(focus.name));
  
  // Calculate bundle pricing
  const getBundleInfo = () => {
    const remainingCount = availableFocuses.length;
    const purchasedCount = purchasedFocuses.length;
    
    if (remainingCount === 0) return null;
    
    let bundlePrice: number;
    let savings: number;
    let title: string;
    
    switch (remainingCount) {
      case 4: // No focus areas purchased
        bundlePrice = 10;
        savings = 6; // Save $6 vs $16
        title = "Complete Bundle";
        break;
      case 3: // 1 focus purchased  
        bundlePrice = 8;
        savings = 4; // Save $4 vs $12
        title = "Remaining Focus Bundle";
        break;
      case 2: // 2 focus areas purchased
        bundlePrice = 5;
        savings = 3; // Save $3 vs $8
        title = "Final Focus Bundle";
        break;
      case 1: // 3 focus areas purchased
        bundlePrice = 2;
        savings = 2; // Save $2 vs $4
        title = "Last Focus";
        break;
      default:
        return null;
    }
    
    return {
      price: bundlePrice,
      savings,
      title,
      tracks: availableFocuses,
      remainingCount,
      purchasedCount
    };
  };
  
  const bundleInfo = getBundleInfo();
  
  // Sort purchased focus areas: active first, then by completion date
  const sortedPurchasedFocuses = [...purchasedFocuses].sort((a, b) => {
    const aIsActive = profile?.current_track === a.name;
    const bIsActive = profile?.current_track === b.name;
    
    // Active track comes first
    if (aIsActive && !bIsActive) return -1;
    if (!aIsActive && bIsActive) return 1;
    
    // Then sort by completion date (completed tracks last for now - could be enhanced with completion timestamps)
    const aIsCompleted = profile?.tracks_completed?.some(track => track.track === a.name);
    const bIsCompleted = profile?.tracks_completed?.some(track => track.track === b.name);
    
    if (aIsCompleted && !bIsCompleted) return 1;
    if (!aIsCompleted && bIsCompleted) return -1;
    
    // If both are same status, maintain original order
    return 0;
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Payment Modal */}
      {(selectedTrack || selectedBundle) && (
        <Dialog open={showPaymentForm} onOpenChange={(open) => !open && handlePaymentCancel()}>
          <DialogContent className="max-w-lg" aria-describedby="payment-dialog-description">
            <DialogHeader>
              <DialogTitle id="payment-dialog-title" className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Complete Your Purchase
              </DialogTitle>
              <DialogDescription id="payment-dialog-description">
                {selectedTrack ? (
                  `Enter your payment information to purchase the ${selectedTrack.name} focus for $4.00`
                ) : selectedBundle ? (
                  `Enter your payment information to purchase ${selectedBundle.title} for ${selectedBundle.price}.00`
                ) : ''}
              </DialogDescription>
            </DialogHeader>
            <StripePaymentForm
              trackName={selectedTrack?.name || 'bundle'}
              trackColor={selectedTrack?.color || '#3498DB'}
              trackIcon={selectedTrack?.icon || Package}
              bundleInfo={selectedBundle}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </DialogContent>
        </Dialog>
      )}



      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl text-foreground mb-2">Stoic AF Focus Areas</h1>
        <p className="text-muted-foreground">
          Choose your path to transformation. $4 each, no subscriptions.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{purchasedFocuses.length}</p>
              <p className="text-sm text-muted-foreground">Purchased</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{availableFocuses.length}</p>
              <p className="text-sm text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <Star className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{focuses.length}</p>
              <p className="text-sm text-muted-foreground">Total Focus Areas</p>
            </div>
          </CardContent>
        </Card>
      </div>



      {/* Your Tracks - Show first if any exist */}
      {purchasedFocuses.length > 0 && (
        <div>
          <h2 className="text-xl text-foreground mb-4">Your Focus Areas</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {sortedPurchasedFocuses.map((focus) => {
              const Icon = focus.icon;
              const isCompleted = profile?.tracks_completed?.some(t => t.track === focus.name);
              const isActive = profile?.current_track === focus.name;

              return (
                <Card 
                  key={focus.name} 
                  className="hover:shadow-lg transition-shadow border-2"
                  style={{
                    borderColor: 
                      focus.name === 'Money' ? 'hsl(from var(--track-money) h s 85%)' :
                      focus.name === 'Relationships' ? 'hsl(from var(--track-relationships) h s 85%)' :
                      focus.name === 'Discipline' ? 'hsl(from var(--track-discipline) h s 85%)' :
                      focus.name === 'Ego' ? 'hsl(from var(--track-ego) h s 85%)' :
                      'black'
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            className="text-xs px-2 py-0.5 h-5 leading-none flex items-center text-white border-0"
                            style={{ 
                              backgroundColor: 
                                focus.name === 'Money' ? 'var(--track-money)' :
                                focus.name === 'Relationships' ? 'var(--track-relationships)' :
                                focus.name === 'Discipline' ? 'var(--track-discipline)' :
                                focus.name === 'Ego' ? 'var(--track-ego)' :
                                'black'
                            }}
                          >
                            {focus.name}
                          </Badge>
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          {isActive && (
                            <Badge variant="outline" className="border-black text-black bg-black/5">
                              Active
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge variant="outline" className="border-green-500 text-green-500 bg-green-50">
                              Completed
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg mb-1 leading-tight">{focus.title}</CardTitle>
                        <CardDescription className="text-sm leading-relaxed mb-3">{focus.description}</CardDescription>
                        <div className="space-y-1">
                          {focus.preview.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="w-1 h-1 rounded-full bg-current opacity-60"></div>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `hsl(from ${focus.color} h s l / 0.1)` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: focus.color }} />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <Button 
                      onClick={() => startFocus(focus.name)}
                      disabled={startingTrack || loading}
                      className="w-full text-white"
                      style={{ 
                        backgroundColor: 
                          focus.name === 'Money' ? 'var(--track-money)' :
                          focus.name === 'Relationships' ? 'var(--track-relationships)' :
                          focus.name === 'Discipline' ? 'var(--track-discipline)' :
                          focus.name === 'Ego' ? 'var(--track-ego)' :
                          'black',
                        borderColor: 
                          focus.name === 'Money' ? 'var(--track-money)' :
                          focus.name === 'Relationships' ? 'var(--track-relationships)' :
                          focus.name === 'Discipline' ? 'var(--track-discipline)' :
                          focus.name === 'Ego' ? 'var(--track-ego)' :
                          'black'
                      }}
                      onMouseEnter={(e) => {
                        const color = 
                          focus.name === 'Money' ? 'var(--track-money)' :
                          focus.name === 'Relationships' ? 'var(--track-relationships)' :
                          focus.name === 'Discipline' ? 'var(--track-discipline)' :
                          focus.name === 'Ego' ? 'var(--track-ego)' :
                          'black';
                        e.currentTarget.style.backgroundColor = `color-mix(in srgb, ${color} 90%, black 10%)`;
                      }}
                      onMouseLeave={(e) => {
                        const color = 
                          focus.name === 'Money' ? 'var(--track-money)' :
                          focus.name === 'Relationships' ? 'var(--track-relationships)' :
                          focus.name === 'Discipline' ? 'var(--track-discipline)' :
                          focus.name === 'Ego' ? 'var(--track-ego)' :
                          'black';
                        e.currentTarget.style.backgroundColor = color;
                      }}
                    >
                      {startingTrack ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : isActive ? (
                        'Continue Journey'
                      ) : isCompleted ? (
                        'Restart Journey'
                      ) : (
                        'Switch to this focus'
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available Tracks */}
      {availableFocuses.length > 0 && (
        <div>
          <h2 className="text-xl text-foreground mb-4">Available Tracks</h2>
          
          {/* Benefits Section */}
          <Card className="bg-slate text-slate-foreground mb-6">
            <CardContent className="py-6">
              <div className="grid gap-4 md:grid-cols-3 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Shield className="h-8 w-8" />
                  <h3 className="font-medium">One-Time Payment</h3>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Zap className="h-8 w-8" />
                  <h3 className="font-medium">Instant Access</h3>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Lightbulb className="h-8 w-8" />
                  <h3 className="font-medium">Unique Daily Prompts</h3>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bundle & Save CTA */}
          {bundleInfo && (
            <Card className="border-2 border-dashed border-primary bg-primary/10 mb-6">
              <CardContent className="py-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <Package className="h-6 w-6 text-primary" />
                    <h3 className="text-lg font-bold text-primary">Bundle & Save</h3>
                  </div>
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-primary mb-1">
                      <span className="text-lg line-through text-primary/60 mr-2">$16</span>
                      <span className="text-3xl font-bold text-primary">$10</span>
                    </p>
                    <p className="text-sm text-primary/70">
                      {bundleInfo.remainingCount === 4 
                        ? "Get all 4 tracks instead of buying individually"
                        : bundleInfo.remainingCount === 1
                        ? "Complete your collection with the final track"
                        : `Get the remaining ${bundleInfo.remainingCount} tracks together`
                      }
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 mb-4">
                    {bundleInfo.tracks.map((track) => {
                      const Icon = track.icon;
                      return (
                        <div 
                          key={track.name}
                          className="flex items-center gap-1 px-2 py-1 bg-white rounded-lg border border-primary/30"
                        >
                          <Icon className="h-4 w-4" style={{ color: track.color }} />
                          <span className="text-xs font-medium text-gray-700">{track.name}</span>
                        </div>
                      );
                    })}
                  </div>
                  <Button 
                    onClick={() => handleBundlePurchaseClick(bundleInfo)}
                    className="bg-primary hover:bg-primary/90 text-white border-0 px-8"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    Buy {bundleInfo.title} - ${bundleInfo.price}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            {availableFocuses.map((track) => {
              const Icon = track.icon;

              return (
                <Card key={track.name} className="hover:shadow-lg transition-shadow flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            className="text-xs px-2 py-0.5 h-5 leading-none flex items-center text-white border-0"
                            style={{ backgroundColor: track.color }}
                          >
                            {track.name}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mb-1 leading-tight">{track.title}</CardTitle>
                        <CardDescription className="text-sm leading-relaxed mb-3">{track.description}</CardDescription>
                        <div className="space-y-1">
                          {track.preview.map((item, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <div className="w-1 h-1 rounded-full bg-current opacity-60"></div>
                              {item}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div 
                          className="w-10 h-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `hsl(from ${track.color} h s l / 0.1)` }}
                        >
                          <Icon className="h-5 w-5" style={{ color: track.color }} />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex flex-col flex-1">
                    <div className="space-y-3 mt-auto">
                      <div className="text-center">
                        <p className="text-2xl font-bold mb-1">$4</p>
                        <p className="text-xs text-muted-foreground">One-time payment • No subscription</p>
                      </div>
                      <Button 
                        onClick={() => handlePurchaseClick(track)}
                        disabled={loading}
                        variant="outline" 
                        className="w-full transition-colors"
                        style={{ 
                          borderColor: track.color, 
                          color: track.color,
                          backgroundColor: 'white'
                        }}
                        onMouseEnter={(e) => {
                          if (!loading) {
                            e.currentTarget.style.backgroundColor = track.color;
                            e.currentTarget.style.color = 'white';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!loading) {
                            e.currentTarget.style.backgroundColor = 'white';
                            e.currentTarget.style.color = track.color;
                          }
                        }}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Purchase & Start
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}







      {/* Empty State for no purchases */}
      {purchasedFocuses.length === 0 && availableFocuses.length === focuses.length && (
        <Card>
          <CardContent className="text-center py-8">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Ready to Transform Your Life?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose your first track above and start your 30-day journey to becoming Stoic AF.
            </p>
            <p className="text-xs text-muted-foreground">
              Each track is just $4 • No subscriptions
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}