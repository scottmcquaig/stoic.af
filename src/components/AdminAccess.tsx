import React from 'react';
import { Button } from './ui/button';
import { Shield } from 'lucide-react';

export default function AdminAccess() {
  const handleAdminAccess = () => {
    // Add admin parameter to URL to trigger admin mode
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('admin', 'true');
    window.location.href = currentUrl.toString();
  };

  return (
    <Button
      onClick={handleAdminAccess}
      variant="outline"
      size="sm"
      className="fixed bottom-4 right-4 z-50 bg-background border shadow-lg"
      title="Admin Panel Access"
    >
      <Shield className="h-4 w-4" />
    </Button>
  );
}