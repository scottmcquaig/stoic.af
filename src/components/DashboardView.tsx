import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { 
  DollarSign, 
  Heart, 
  Target, 
  Brain, 
  Flame, 
  CheckCircle,
  Calendar,
  ArrowRight,
  Quote,
  Book,
  Clock,
  Moon,
  Sunrise
} from 'lucide-react';

type NavigationView = 'dashboard' | 'daily-entry' | 'progress' | 'challenges' | 'profile';

interface DashboardViewProps {
  onViewChange: (view: NavigationView) => void;
}

interface TrackDay {
  day: number;
  daily_theme: string;
  stoic_quote: string;
  quote_author: string;
  bro_translation: string;
  todays_challenge: string;
  challenge_type: string;
  todays_intention: string;
  evening_reflection_prompts: string[];
}

interface TrackData {
  track_id: string;
  days: TrackDay[];
}

// Journal quotes for daily practice
const dailyQuotes = [
  {
    text: "Every new beginning comes from some other beginning's end.",
    author: "Seneca",
    broTranslation: "Every level up requires leaving your old mindset behind."
  },
  {
    text: "You have power over your mind - not outside events. Realize this, and you will find strength.",
    author: "Marcus Aurelius", 
    broTranslation: "Stop trying to control what you can't. Control your reactions instead."
  },
  {
    text: "The impediment to action advances action. What stands in the way becomes the way.",
    author: "Marcus Aurelius",
    broTranslation: "Every obstacle is just a chance to get stronger. Use it."
  },
  {
    text: "Wealth consists, not in having great possessions, but in having few wants.",
    author: "Epictetus",
    broTranslation: "Stop wanting dumb stuff you don't need. That's real wealth."
  }
];

export default function DashboardView({ onViewChange }: DashboardViewProps) {
  const { user, profile } = useAuth();
  const [trackData, setTrackData] = useState<TrackData | null>(null);
  
  const currentTrack = profile?.current_track;
  const currentDay = profile?.current_day || 1;
  const streak = profile?.streak || 0;
  const totalDaysCompleted = profile?.total_days_completed || 0;
  const daysRemaining = 30 - (currentDay - 1);
  const progressPercentage = currentTrack ? ((currentDay - 1) / 30) * 100 : 0;

  // Get current day's data from track data
  const todayData = trackData?.days?.find(day => day.day === currentDay);
  const currentDayTheme = todayData?.daily_theme || '';

  // Load track data when user has a current track
  useEffect(() => {
    const loadTrackData = async () => {
      if (!user || !currentTrack) return;
      
      try {
        const { projectId } = await import('../utils/supabase/info');
        const session = await import('../utils/supabase/client').then(m => m.supabase.auth.getSession());

        if (!session.data.session?.access_token) {
          return;
        }

        const accessToken = session.data.session.access_token;

        const trackDataResponse = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/prompts/${currentTrack.toUpperCase()}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (trackDataResponse.ok) {
          const trackDataResult = await trackDataResponse.json();
          setTrackData(trackDataResult);
          console.log('✅ Track data loaded successfully for:', currentTrack);
        } else {
          console.error('❌ Failed to load track data:', trackDataResponse.status, trackDataResponse.statusText);
          const errorData = await trackDataResponse.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Track data error details:', errorData);
        }
      } catch (error) {
        console.error('Error loading track data:', error);
      }
    };

    loadTrackData();
  }, [user, currentTrack]);

  // Get today's quote - use track data if available, otherwise fallback to local quotes
  const todayQuote = todayData ? {
    text: todayData.stoic_quote,
    author: todayData.quote_author,
    broTranslation: todayData.bro_translation
  } : dailyQuotes[(currentDay - 1) % dailyQuotes.length];

  const trackIcons = {
    Money: DollarSign,
    Relationships: Heart,
    Discipline: Target,
    Ego: Brain
  };

  const trackColors = {
    Money: 'var(--track-money)',
    Relationships: 'var(--track-relationships)',
    Discipline: 'var(--track-discipline)',
    Ego: 'var(--track-ego)'
  };

  const TrackIcon = currentTrack ? trackIcons[currentTrack as keyof typeof trackIcons] : Target;
  const trackColor = currentTrack ? trackColors[currentTrack as keyof typeof trackColors] : 'var(--accent)';

  const handleContinueJourney = () => {
    onViewChange('daily-entry');
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl text-foreground mb-2">30-Day Stoic Challenge</h1>
        <p className="text-muted-foreground">
          Your daily practice of stoic wisdom. Document growth, build discipline.
        </p>
      </div>

      {/* Progress Overview - Streamlined */}
      <Card className="bg-slate text-slate-foreground">
        <CardContent className="py-4">
          <div className="grid gap-3 grid-cols-3 text-center">
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Flame className="h-4 w-4 text-orange-400" />
              </div>
              <div className="text-lg font-semibold">{streak}</div>
              <div className="text-xs text-slate-foreground/70">Day Streak</div>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-green-400" />
              </div>
              <div className="text-lg font-semibold">{totalDaysCompleted}/30</div>
              <div className="text-xs text-slate-foreground/70">Completed</div>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Calendar className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-lg font-semibold">{currentTrack ? daysRemaining : 30}</div>
              <div className="text-xs text-slate-foreground/70">Remaining</div>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-foreground/70">Progress</span>
              <span className="text-xs font-medium">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-1.5" />
          </div>
        </CardContent>
      </Card>

      {/* Your Daily Practice */}
      {currentTrack && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Book className="h-5 w-5 text-accent" />
              <h3 className="text-xl text-foreground">Your Daily Practice</h3>
            </div>
            <Button 
              onClick={handleContinueJourney}
              className="text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/90 px-4 py-2 rounded-lg"
            >
              <span className="hidden sm:inline">Continue Journey</span>
              <ArrowRight className="h-4 w-4 sm:ml-1" />
            </Button>
          </div>
          
          <Card className="bg-white">
            <CardContent className="p-6">
              <div className="space-y-4">
                {/* Daily Theme and Track Info */}
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{currentDayTheme || "Today's Challenge"}</h3>
                  <p className="text-sm font-medium text-foreground">Day {currentDay} - {currentTrack} Track</p>
                </div>

                {/* Quote and Translation */}
                <div>
                  <blockquote className="border-l-4 border-accent pl-4 mb-4">
                    <p className="text-base italic mb-2">"{todayQuote.text}"</p>
                    <cite className="text-sm text-muted-foreground">— {todayQuote.author}</cite>
                  </blockquote>
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-sm font-medium text-accent mb-1">Translation:</p>
                    <p className="text-sm">{todayQuote.broTranslation}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Track State */}
      {!currentTrack && (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Ready to Start Your Journey?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Choose a track to begin your 30-day transformation
            </p>
            <Button onClick={() => onViewChange('challenges')}>
              Browse Tracks
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Daily Practice Sections */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Sunrise className="h-4 w-4 text-orange-500" />
              </div>
              <h4 className="font-medium">Morning Intention</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Start each day with purpose. Set your stoic intention.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Moon className="h-4 w-4 text-purple-500" />
              </div>
              <h4 className="font-medium">Evening Reflection</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              End with wisdom. Reflect on your growth and control.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Build Your Legacy */}
      <Card className="bg-muted/30">
        <CardContent className="text-center py-8">
          <Book className="h-12 w-12 mx-auto mb-4 text-accent" />
          <h3 className="font-medium mb-2">Build Your Legacy</h3>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            Every entry is a step toward the man you're becoming. Each reflection builds the 
            discipline that will serve you long after these 30 days. Show up. Do the work. Become 
            STOIC AF.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}