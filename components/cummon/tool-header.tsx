import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface ToolHeaderProps {
  title: string;
  icon?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  showBreadcrumbs?: boolean;
  privacyBadge?: boolean;
}

export function ToolHeader({
  title,
  icon,
  breadcrumbs = [{ label: "All tools", href: "/" }],
  showBreadcrumbs = false,
}: ToolHeaderProps) {
  // Ensure the current tool title is the last breadcrumb if not already provided
  const items = [...breadcrumbs];
  if (items.length === 1 && items[0].href === "/") {
    items.push({ label: title });
  }

  return (
    <>
      {/* Breadcrumb Navigation */}
      {showBreadcrumbs && (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          {items.map((item, idx) => {
            const isLast = idx === items.length - 1;
            return (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight size={13} />}
                {isLast || !item.href ? (
                  <span>{item.label}</span>
                ) : (
                  <Link href={item.href}>{item.label}</Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      )}

      {/* Heading */}
      <div className="workspace-heading">
        <div>
          <h1>
            {title} {icon && <span className="tool-icon">{icon}</span>}
          </h1>
        </div>
      </div>
    </>
  );
}
