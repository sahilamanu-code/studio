"use client";

import { useState, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { AuthDialog } from "./auth-dialog";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  useEffect(() => {
    // Check if user is authenticated from localStorage
    const authStatus = localStorage.getItem('isAuthenticated');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthentication = (success: boolean) => {
    setIsAuthenticated(success);
    setShowAuthDialog(false);
    if (success) {
      localStorage.setItem('isAuthenticated', 'true');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
  };

  return (
    <SidebarProvider>
      <AppSidebar 
        isAuthenticated={isAuthenticated} 
        onAuthRequest={() => setShowAuthDialog(true)}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <div className="flex items-center p-4 border-b md:hidden">
          <SidebarTrigger />
          <h1 className="ml-2 text-lg font-semibold">Trie | Operations</h1>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </SidebarInset>
      <AuthDialog 
        isOpen={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        onAuthenticate={handleAuthentication}
      />
    </SidebarProvider>
  );
}