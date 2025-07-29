"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
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
} from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: "/", label: "Record Deposit", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/pending", label: "Pending", icon: ListTodo },
    { href: "/collections", label: "Collections", icon: HandCoins },
    { href: "/deposits", label: "Deposits", icon: Banknote },
    { href: "/import", label: "Import Data", icon: Upload },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="p-1.5 bg-sidebar-primary rounded-lg">
             <svg
              width="24"
              height="24"
              viewBox="0 0 410 410"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-sidebar-primary-foreground"
            >
              <path
                d="M265.518 102.775L228.691 65.948L191.864 102.775L155.037 65.948L118.21 102.775L81.3828 65.948L44.5557 102.775L7.72852 65.948V344.051H402.271V65.948L376.544 91.6748L339.717 54.8478L302.89 91.6748L265.518 54.8478L228.691 91.6748L191.864 54.8478L155.037 91.6748L118.21 54.8478L81.3828 91.6748L44.5557 54.8478"
                stroke="currentColor"
                strokeWidth="15"
                strokeMiterlimit="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
          </div>
          <h1 className="text-xl font-bold font-headline text-sidebar-foreground">
            KashFlow
          </h1>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))}
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
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}
