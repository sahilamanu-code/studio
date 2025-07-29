"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Banknote,
  Upload,
  HandCoins,
  ListTodo,
  Home,
  LogOut,
  Lock,
} from "lucide-react";
import { Button } from "./ui/button";

type AppSidebarProps = {
  isAuthenticated: boolean;
  onAuthRequest: () => void;
  onLogout: () => void;
};

export function AppSidebar({ isAuthenticated, onAuthRequest, onLogout }: AppSidebarProps) {
  const pathname = usePathname();

  const publicMenuItems = [
    { href: "/", label: "Record Deposit", icon: Home },
  ];

  const protectedMenuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pending", label: "Pending", icon: ListTodo },
    { href: "/collections", label: "Collections", icon: HandCoins },
    { href: "/deposits", label: "Deposits", icon: Banknote },
    { href: "/import", label: "Import Data", icon: Upload },
  ];

  const handleProtectedClick = (e: React.MouseEvent, href: string) => {
    if (!isAuthenticated) {
      e.preventDefault();
      onAuthRequest();
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold font-headline text-sidebar-foreground">
              Trie | Operations
            </h1>
          </Link>
          <div className="md:hidden">
        <SidebarTrigger />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {/* Public menu items */}
          {publicMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                className="justify-start"
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
          
          {/* Protected menu items */}
          {protectedMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild={false}
                isActive={isAuthenticated && (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))}
                className="justify-start"
                tooltip={item.label}
                onClick={isAuthenticated ? undefined : (e) => handleProtectedClick(e, item.href)}
              >
                {isAuthenticated ? (
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <div className="w-full flex items-center gap-2">
                    <item.icon />
                    <span>{item.label}</span>
                    <Lock className="ml-auto h-4 w-4 opacity-50" />
                  </div>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      {isAuthenticated && (
        <SidebarFooter className="p-4">
          <Button variant="outline" onClick={onLogout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}