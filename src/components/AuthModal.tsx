import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { DollarSign, Heart, Target, Brain, User, Mail, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner@2.0.3';
import StripePaymentForm from './StripePaymentForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  prefillEmail?: string;
}

const focuses = [
  {
    icon: DollarSign,
    name: "Money",
    title: "Master Your Wealth Mindset",
    description: "Stop being broke in your mind before your wallet",
    color: "var(--track-money)"
  },
  {
    icon: Heart,
    name: "Relationships",
    title: "Control Yourself, Not Others",
    description: "The problem isn't them. It's how you react to them.",
    color: "var(--track-relationships)"
  },
  {
    icon: Target,
    name: "Discipline",
    title: "Build Unbreakable Habits",
    description: "Motivation is trash. Discipline is forever.",
    color: "var(--track-discipline)"
  },
  {
    icon: Brain,
    name: "Ego",
    title: "Get Out of Your Own Way",
    description: "Your biggest enemy looks at you in the mirror",
    color: "var(--track-ego)"
  }
];

export default function AuthModal({ isOpen, onClose, initialMode = 'login', prefillEmail = '' }: AuthModalProps) {
  const { signIn, signUp, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'purchase' | 'focus-selection'>(initialMode);
  const [formData, setFormData] = useState({
    name: '',
    email: prefillEmail,
    password: ''
  });
  const [selectedFocus, setSelectedFocus] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);

  // Reset modal state when initialMode changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setShowPayment(false);
      // Reset form data when switching modes, but preserve prefilled email
      setFormData({
        name: '',
        email: prefillEmail,
        password: ''
      });
    }
  }, [isOpen, initialMode, prefillEmail]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    const result = await signIn(formData.email, formData.password);
    
    if (!result.success) {
      console.error('Login error:', result.error);
      
      // Provide more helpful error messages for login failures
      let errorMessage = result.error || 'Login failed';
      
      if (errorMessage.includes('Invalid login credentials') || errorMessage.includes('Invalid email or password')) {
        errorMessage = 'Email or password incorrect. Please check your credentials or create a new account if you\'re new here.';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'Please verify your email address before signing in.';
      } else if (errorMessage.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
      }
      
      toast.error(errorMessage);
      return;
    }

    toast.success('Welcome back! 👋');
    onClose();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    const result = await signUp(formData.email, formData.password, formData.name);
    
    if (!result.success) {
      // Check if it's an email already exists error
      if (result.error?.includes('already been registered') || 
          result.error?.includes('already exists') || 
          result.error?.includes('email address has already been registered') ||
          result.error?.includes('User already registered') ||
          result.error?.includes('Account already exists') ||
          result.error?.includes('Please try logging in instead')) {
        toast.error('Account already exists. Please log in with your existing password.');
        setMode('login');
        // Clear the password field since it might be different from their actual password
        setFormData(prev => ({ ...prev, password: '' }));
        return;
      }
      
      // Handle other signup errors
      console.error('Signup error:', result.error);
      toast.error(result.error || 'Failed to create account');
      return;
    }

    // Success case
    toast.success('Account created! 🎉');
    setMode('focus-selection');
  };

  const handleFocusSelect = (focus: any) => {
    setSelectedFocus(focus);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    toast.success('Focus purchased! 🚀 Your journey begins now!');
    onClose();
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
  };

  const handleSkipPurchase = () => {
    toast.success('Account created! You can purchase focus areas anytime from the dashboard.');
    onClose();
  };

  const renderLogin = () => (
    <div className="space-y-6">
      {formData.email && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to your existing account ({formData.email})
          </p>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your@email.com"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Your password"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>



      <div className="text-center">
        <Button variant="ghost" onClick={() => setMode('signup')} className="text-sm">
          New here? Create an account
        </Button>
      </div>
    </div>
  );

  const renderSignup = () => (
    <div className="space-y-6">

      <form onSubmit={handleSignup} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Your name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="your@email.com"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Create a password (min. 6 characters)"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>
      </form>

      <div className="text-center">
        <Button variant="ghost" onClick={() => setMode('login')} className="text-sm">
          Already have an account? Sign in
        </Button>
      </div>
    </div>
  );

  const renderFocusSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={handleSkipPurchase}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          <span className="sr-only">Go back</span>
        </div>
      </div>

      <div className="grid gap-4">
        {focuses.map((focus) => {
          const Icon = focus.icon;
          return (
            <Card 
              key={focus.name}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleFocusSelect(focus)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `hsl(from ${focus.color} h s l / 0.1)` }}
                  >
                    <Icon className="h-5 w-5" style={{ color: focus.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        className="text-xs px-2 py-0.5 h-5 text-white border-0"
                        style={{ backgroundColor: focus.color }}
                      >
                        {focus.name}
                      </Badge>
                      <span className="text-lg font-bold">$4</span>
                    </div>
                    <h3 className="font-medium text-sm mb-1">{focus.title}</h3>
                    <p className="text-xs text-muted-foreground">{focus.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="text-center pt-4 border-t">
        <Button variant="ghost" onClick={handleSkipPurchase} className="text-sm text-muted-foreground">
          Skip for now - I'll choose later
        </Button>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setShowPayment(false)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          <span className="sr-only">Go back</span>
        </div>
      </div>

      {selectedFocus && (
        <StripePaymentForm
          trackName={selectedFocus.name}
          trackColor={selectedFocus.color}
          trackIcon={selectedFocus.icon}
          onSuccess={handlePaymentSuccess}
          onCancel={handlePaymentCancel}
        />
      )}
    </div>
  );

  const getContent = () => {
    if (showPayment) return renderPayment();
    
    switch (mode) {
      case 'login':
        return renderLogin();
      case 'signup':
        return renderSignup();
      case 'focus-selection':
        return renderFocusSelection();
      default:
        return renderLogin();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" aria-describedby="auth-dialog-description">
        <DialogHeader>
          <DialogTitle id="auth-dialog-title">
            {mode === 'login' ? 'Welcome Back, Stoic' :
             mode === 'signup' ? 'Start Your Journey' :
             mode === 'focus-selection' ? 'Choose Your First Focus' :
             showPayment ? 'Complete Purchase' :
             'Authentication'}
          </DialogTitle>
          <DialogDescription id="auth-dialog-description">
            {mode === 'login' ? 'Sign in to continue your journey of self-mastery' :
             mode === 'signup' ? 'Create your account to begin transforming your mindset with ancient wisdom' :
             mode === 'focus-selection' ? 'Start your transformation with one of our powerful 30-day programs' :
             showPayment ? `Purchase ${selectedFocus?.name} focus for $4.00` :
             'Login or create an account to access Stoic AF'}
          </DialogDescription>
        </DialogHeader>
        {getContent()}
      </DialogContent>
    </Dialog>
  );
}