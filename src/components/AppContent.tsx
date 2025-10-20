import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import LandingPage from "./LandingPageUpdated";
import Dashboard from "./Dashboard";
import AdminPanel from "./AdminPanel";
import AdminBootstrap from "./AdminBootstrap";
import LoadingSpinner from "./common/LoadingSpinner";
import { toast } from "sonner@2.0.3";

export default function AppContent() {
  const { user, loading } = useAuth();
  const [appReady, setAppReady] = useState(false);

  // Check if admin mode is requested
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminMode = urlParams.get("admin") === "true";
  const isBootstrapMode = urlParams.get("bootstrap") === "true";

  // Initialize app with proper loading sequence
  useEffect(() => {
    const initializeApp = async () => {
      // Wait a minimum time for smooth loading experience
      await new Promise((resolve) => setTimeout(resolve, 500));
      setAppReady(true);
    };

    initializeApp();
  }, []);

  // Handle Stripe redirect parameters when user is authenticated
  useEffect(() => {
    if (user) {
      const urlParams = new URLSearchParams(
        window.location.search,
      );
      const success = urlParams.get("success");
      const canceled = urlParams.get("canceled");
      const track = urlParams.get("track");
      const sessionId = urlParams.get("session_id");

      console.log("🔍 Payment redirect detected:", {
        success,
        canceled,
        track,
        sessionId,
        fullUrl: window.location.href,
        allParams: Object.fromEntries(urlParams.entries()),
      });

      if (success === "true") {
        const isBundle = urlParams.get("bundle");

        if (isBundle === "true" && sessionId) {
          console.log(
            "✅ Processing bundle purchase with session ID",
          );
          processBundlePurchase(sessionId);
        } else if (track && sessionId) {
          console.log(
            "✅ Processing direct purchase with session ID",
          );
          processDirectPurchase(track, sessionId);
        } else if (track) {
          console.log(
            "⚠️ Payment success but no session ID - trying fallback approach",
          );

          // Check if sessionId might be embedded differently in the URL
          const fullUrl = window.location.href;
          const sessionPattern = /session_id=([^&\s]+)/;
          const sessionIdMatch = fullUrl.match(sessionPattern);
          const extractedSessionId = sessionIdMatch
            ? sessionIdMatch[1]
            : null;

          if (extractedSessionId) {
            console.log(
              "✅ Found session ID in URL:",
              extractedSessionId,
            );
            processDirectPurchase(track, extractedSessionId);
          } else {
            console.log(
              "⚠️ No session ID found anywhere - using webhook fallback",
            );
            toast.success(
              `Payment successful! Checking ${track} track activation...`,
            );

            // Try multiple times to check if webhook processed it
            let attempts = 0;
            const maxAttempts = 6; // Try for 30 seconds

            const checkPurchaseStatus = async () => {
              attempts++;
              console.log(
                `Checking purchase status (attempt ${attempts}/${maxAttempts})`,
              );

              try {
                const { projectId, publicAnonKey } =
                  await import("../utils/supabase/info");
                const { supabase } = await import(
                  "../utils/supabase/client"
                );
                const {
                  data: { session },
                } = await supabase.auth.getSession();
                const accessToken =
                  session?.access_token || publicAnonKey;

                const response = await fetch(
                  `https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/purchases`,
                  {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                    },
                  },
                );

                if (response.ok) {
                  const result = await response.json();
                  const purchases = result.purchases || [];

                  if (purchases.includes(track)) {
                    toast.success(
                      `🎉 ${track} track activated! Refreshing dashboard...`,
                    );
                    window.location.reload();
                    return;
                  }
                }

                if (attempts < maxAttempts) {
                  setTimeout(checkPurchaseStatus, 5000); // Check again in 5 seconds
                } else {
                  toast.error(
                    `Payment completed but ${track} track not activated. Copy the session_id from your URL and use the payment debugger below.`,
                  );
                  // Clear URL
                  window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname,
                  );
                }
              } catch (error) {
                console.error(
                  "Error checking purchase status:",
                  error,
                );
                if (attempts < maxAttempts) {
                  setTimeout(checkPurchaseStatus, 5000);
                } else {
                  toast.error(
                    "Unable to verify purchase status. Please use the payment debugger below.",
                  );
                  window.history.replaceState(
                    {},
                    document.title,
                    window.location.pathname,
                  );
                }
              }
            };

            // Start checking after 3 seconds
            setTimeout(checkPurchaseStatus, 3000);
          }
        } else {
          console.log(
            "⚠️ Payment success but missing track info",
          );
          toast.success(
            "Payment successful! Refreshing your dashboard...",
          );
          setTimeout(() => window.location.reload(), 2000);
        }
      } else if (canceled === "true") {
        toast.info(
          "Payment was canceled. You can try again anytime from the tracks section.",
        );
        // Clear URL parameters
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    }
  }, [user]);

  const processBundlePurchase = async (sessionId: string) => {
    try {
      console.log("🚀 Processing bundle purchase:", {
        sessionId,
      });

      const { projectId, publicAnonKey } = await import(
        "../utils/supabase/info"
      );
      const { supabase } = await import(
        "../utils/supabase/client"
      );

      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken =
        session?.access_token || publicAnonKey;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/payments/process-bundle-purchase`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            sessionId,
          }),
        },
      );

      const result = await response.json();
      console.log("🚀 Bundle purchase result:", result);

      if (response.ok) {
        const addedTracks = result.addedTracks || [];
        toast.success(
          `🎉 Bundle purchase successful! Added ${addedTracks.length} tracks: ${addedTracks.join(", ")}`,
        );
        // Clear URL parameters after successful processing
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );

        // Force a page refresh to update the dashboard with the new purchases
        window.location.reload();
      } else {
        console.error("Bundle purchase failed:", result);
        toast.error(
          `Failed to activate bundle tracks. Please contact support.`,
        );
        // Clear URL parameters even on error
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    } catch (error) {
      console.error("Error processing bundle purchase:", error);
      toast.error(
        `Failed to activate bundle tracks. Please contact support.`,
      );
      // Clear URL parameters even on error
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname,
      );
    }
  };

  const processDirectPurchase = async (
    trackName: string,
    sessionId: string,
  ) => {
    try {
      console.log("🚀 Processing direct purchase:", {
        trackName,
        sessionId,
      });

      const { projectId, publicAnonKey } = await import(
        "../utils/supabase/info"
      );
      const { supabase } = await import(
        "../utils/supabase/client"
      );

      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken =
        session?.access_token || publicAnonKey;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-6d6f37b2/payments/direct-purchase`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            trackName,
            sessionId,
          }),
        },
      );

      const result = await response.json();
      console.log("🚀 Direct purchase result:", result);

      if (response.ok) {
        toast.success(
          `🎉 ${trackName} track successfully added to your account!`,
        );
        // Clear URL parameters after successful processing
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );

        // Force a page refresh to update the dashboard with the new purchase
        window.location.reload();
      } else {
        console.error("Direct purchase failed:", result);
        toast.error(
          `Failed to activate ${trackName} track. Please contact support.`,
        );
        // Clear URL parameters even on error
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname,
        );
      }
    } catch (error) {
      console.error("Error processing direct purchase:", error);
      toast.error(
        `Failed to activate ${trackName} track. Please contact support.`,
      );
      // Clear URL parameters even on error
      window.history.replaceState(
        {},
        document.title,
        window.location.pathname,
      );
    }
  };

  // Show loading screen while app is initializing
  if (!appReady) {
    return <LoadingSpinner message="Loading Stoic AF..." />;
  }

  // Show bootstrap component if requested
  if (isBootstrapMode) {
    return <AdminBootstrap />;
  }

  // If user is authenticated, show appropriate component
  if (user) {
    try {
      // Check if admin mode is requested and user is admin
      if (isAdminMode) {
        return <AdminPanel />;
      }

      return <Dashboard />;
    } catch (error) {
      console.error("Dashboard error:", error);
      // Fallback to landing page if dashboard fails
      return <LandingPage />;
    }
  }

  // Show landing page for unauthenticated users
  try {
    return <LandingPage />;
  } catch (error) {
    console.error("Landing page error:", error);
    // Ultimate fallback
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Stoic AF</h1>
          <p className="text-muted-foreground mb-4">
            Something went wrong
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
}