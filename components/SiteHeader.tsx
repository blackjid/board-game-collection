"use client";

import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// ============================================================================
// Types
// ============================================================================

export interface BreadcrumbItemData {
  label: string;
  href?: string;
}

export interface SiteHeaderProps {
  /**
   * Array of breadcrumb items. The last item is shown as the current page.
   * Example: [{ label: "Games", href: "/" }, { label: "Catan" }]
   */
  breadcrumbs?: BreadcrumbItemData[];
  /**
   * Optional actions to show on the right side of the header
   */
  actions?: React.ReactNode;
  /**
   * Whether to show the sidebar trigger (hamburger menu). Set to false for standalone pages.
   * Defaults to true.
   */
  showSidebarTrigger?: boolean;
}

// ============================================================================
// SiteHeader Component
// ============================================================================

export function SiteHeader({ breadcrumbs = [], actions, showSidebarTrigger = true }: SiteHeaderProps) {
  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-30 h-14 flex items-center px-4 gap-4">
      {/* Sidebar Trigger (hamburger on mobile) - only shown when inside SidebarProvider */}
      {showSidebarTrigger && (
        <>
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
        </>
      )}

      {/* Breadcrumbs */}
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {/* Home icon (always shown) */}
          <BreadcrumbItem className="hidden sm:block">
            <BreadcrumbLink asChild>
              <Link href="/" className="flex items-center">
                <Home className="size-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {/* Breadcrumb items with separators */}
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;

            return (
              <span key={index} className="contents">
                {/* Separator before each item (after home) */}
                <BreadcrumbSeparator className="hidden sm:block">
                  <ChevronRight className="size-3.5" />
                </BreadcrumbSeparator>

                <BreadcrumbItem>
                  {isLast ? (
                    // Last item is current page
                    <BreadcrumbPage className="font-medium text-foreground max-w-48 truncate">
                      {item.label}
                    </BreadcrumbPage>
                  ) : item.href ? (
                    // Intermediate items with links
                    <BreadcrumbLink asChild>
                      <Link href={item.href} className="max-w-32 truncate">
                        {item.label}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    // Intermediate items without links
                    <span className="text-muted-foreground max-w-32 truncate">
                      {item.label}
                    </span>
                  )}
                </BreadcrumbItem>
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Actions slot */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
