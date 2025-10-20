import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';

import { 
  DollarSign, 
  Heart, 
  Target, 
  Brain, 
  Star, 
  Calendar,
  BookOpen,
  Trophy,
  Flame,
  CheckCircle,
  ArrowRight,
  User,
  LogOut,
  CreditCard,
  Loader2
} from 'lucide-react';
import ProfileView from './ProfileView';
import StripePaymentForm from './StripePaymentForm';
import { useScrollToTop } from '../hooks/useScrollToTop';

type NavigationView = 'landing' | 'profile';

const focuses = [
  {
    icon: DollarSign,
    name: "Money",
    title: "Master Your Wealth Mindset", 
    color: "var(--track-money)",
    description: "Stop being broke in your mind before your wallet",
    benefits: [
      "Overcome limiting beliefs about money",
      "Build a wealthy mindset from the ground up",
      "Learn to see opportunities everywhere"
    ]
  },
  {
    icon: Heart,
    name: "Relationships",
    title: "Control Yourself, Not Others",
    color: "var(--track-relationships)", 
    description: "The problem isn't them. It's how you react to them.",
    benefits: [
      "Master emotional reactions in relationships",
      "Set healthy boundaries without guilt",
      "Build deeper, more authentic connections"
    ]
  },
  {
    icon: Target,
    name: "Discipline",
    title: "Build Unbreakable Habits",
    color: "var(--track-discipline)",
    description: "Motivation is trash. Discipline is forever.",
    benefits: [
      "Create systems that work even when you don't feel like it",
      "Break through procrastination and resistance",
      "Build consistency that compounds over time"
    ]
  },
  {
    icon: Brain,
    name: "Ego", 
    title: "Get Out of Your Own Way",
    color: "var(--track-ego)",
    description: "Your biggest enemy looks at you in the mirror",
    benefits: [
      "Identify and overcome self-sabotage patterns",
      "Develop true confidence vs. empty ego",
      "Learn when to be humble and when to be bold"
    ]
  }
];

export default function NoPurchasesLanding() {
  const { user, signOut, refreshProfile } = useAuth();
  const { scrollToTop } = useScrollToTop();
  const [currentView, setCurrentView] = useState<NavigationView>('landing');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedFocus, setSelectedFocus] = useState<any>(null);
  const [isBundle, setIsBundle] = useState(false);

  const handleViewChange = (view: NavigationView) => {
    scrollToTop();
    setCurrentView(view);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handlePurchaseFocus = (focusName: string) => {
    const focus = focuses.find(f => f.name === focusName);
    if (focus) {
      setSelectedFocus(focus);
      setIsBundle(false);
      setShowPaymentForm(true);
    }
  };

  const handleBundlePurchase = () => {
    setSelectedFocus({
      name: 'All Focus Areas',
      title: 'Complete Bundle',
      icon: Star,
      color: 'hsl(204, 70%, 53%)',
      description: 'Transform every area of your life'
    });
    setIsBundle(true);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
    setSelectedFocus(null);
    setIsBundle(false);
    // Refresh the user profile to get updated purchases
    refreshProfile();
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setSelectedFocus(null);
    setIsBundle(false);
  };



  if (currentView === 'profile') {
    return (
      <div className="min-h-screen bg-background">
        {/* Simple top nav for internal navigation */}
        <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto px-6 py-3 w-[90%]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => handleViewChange('landing')}
                  className="text-sm"
                >
                  ← Back to Focus Areas
                </Button>
                <h1 className="text-lg font-medium">Profile</h1>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mx-auto px-6 py-8 w-[90%]">
          <ProfileView />
        </div>
      </div>
    );
  }

  // Main landing view for users with no purchases
  return (
    <div className="min-h-screen bg-background">
      {/* Simple top navigation */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto px-6 py-3 w-[90%]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">Stoic AF</h1>
              <Badge variant="secondary" className="text-xs bg-primary text-primary-foreground">Welcome</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleViewChange('profile')}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                Profile
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleSignOut}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mx-auto px-6 py-12 w-[90%]">
        {/* Welcome Hero */}
        <div className="text-center mb-12">
          <div className="mb-4">
            <h1 className="text-3xl font-bold">30-Day Stoic AF Challenge</h1>
          </div>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
            You're ready to start your transformation. Choose your first 30-day focus and begin building the life you actually want.
          </p>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">30 Days</p>
              <p className="text-xs text-muted-foreground">Proven System</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Daily Wisdom</p>
              <p className="text-xs text-muted-foreground">Stoic + Modern</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Real Results</p>
              <p className="text-xs text-muted-foreground">Transform Daily</p>
            </div>
          </div>
        </div>

        {/* Available Focus Areas */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Choose Your First Focus</h2>
            <p className="text-muted-foreground">Each focus is a complete 30-day system designed to create lasting change</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {focuses.map((focus) => {
              const IconComponent = focus.icon;
              return (
                <Card key={focus.name} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <div 
                        className="p-3 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: `${focus.color}20`, color: focus.color }}
                      >
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-lg">{focus.title}</CardTitle>

                        </div>
                        <CardDescription className="text-sm italic">
                          "{focus.description}"
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3 mb-6">
                      {focus.benefits.map((benefit, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: focus.color }} />
                          <p className="text-sm text-muted-foreground">{benefit}</p>
                        </div>
                      ))}
                    </div>

                    <Button 
                      className="w-full group-hover:shadow-md transition-all duration-300"
                      style={{ backgroundColor: focus.color }}
                      onClick={() => handlePurchaseFocus(focus.name)}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Purchase ${4}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Bundle Offer */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 mb-12">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Bundle & Save</CardTitle>
              <Star className="h-5 w-5 text-primary" />
            </div>
            <CardDescription>
              Get all 4 focus areas and save 38% off individual pricing
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-2xl line-through text-muted-foreground">$16</p>
                <p className="text-xs text-muted-foreground">Individual Price</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-3xl font-bold text-primary">$10</p>
                <p className="text-xs text-muted-foreground">Bundle Price</p>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="w-full max-w-md mx-auto bg-primary hover:bg-primary/90"
              onClick={handleBundlePurchase}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Purchase Bundle $10
            </Button>
            
            <p className="text-xs text-muted-foreground mt-3">
              120 days of content • All 4 focus areas • Lifetime access
            </p>
          </CardContent>
        </Card>

        {/* Why Start Today */}
        <Card className="bg-slate text-slate-foreground mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-xl text-white">Why Start Today?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <Flame className="h-5 w-5 text-orange-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white mb-1">Build Momentum</p>
                  <p className="text-sm text-slate-200">Every day you wait is another day staying stuck in the same patterns.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-blue-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white mb-1">Proven System</p>
                  <p className="text-sm text-slate-200">30 days of structured reflection and action that actually works.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-green-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white mb-1">Ancient Wisdom</p>
                  <p className="text-sm text-slate-200">Stoic philosophy translated into language that hits different.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="h-5 w-5 text-purple-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="font-medium text-white mb-1">Real Change</p>
                  <p className="text-sm text-slate-200">Not just feel-good quotes. Actual tools for actual transformation.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Final CTA */}
        <div className="text-center">
          <h3 className="text-xl font-bold mb-4">Ready to stop being average?</h3>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 px-8"
            onClick={() => scrollToTop()}
          >
            Choose Your Focus Above
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground mt-3">
            Start immediately after purchase
          </p>
        </div>
      </div>

      {/* Payment Modal */}
      <Dialog open={showPaymentForm} onOpenChange={(open) => {
        if (!open) {
          handlePaymentCancel();
        }
      }}>
        <DialogContent className="max-w-lg" aria-describedby="no-purchases-payment-description">
          <DialogHeader>
            <DialogTitle id="no-purchases-payment-title" className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Complete Your Purchase
            </DialogTitle>
            <DialogDescription id="no-purchases-payment-description">
              {isBundle 
                ? 'Enter your payment information to purchase all 4 focus areas for $10.00'
                : selectedFocus ? `Enter your payment information to purchase the ${selectedFocus.name} focus for $4.00` : 'Loading...'
              }
            </DialogDescription>
          </DialogHeader>
          {selectedFocus && (
            <StripePaymentForm
              trackName={selectedFocus.name}
              trackColor={selectedFocus.color}
              trackIcon={selectedFocus.icon}
              bundleInfo={isBundle ? {
                title: 'Complete Bundle',
                price: 10,
                tracks: focuses.map(f => ({ name: f.name }))
              } : undefined}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}