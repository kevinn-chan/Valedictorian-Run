"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sidebar / bottom-bar link that knows whether it's the current page.
// `exact` is for "/" — otherwise every route would mark Home active.
export function NavLink({
  href,
  exact,
  className,
  activeClassName,
  idleClassName,
  children,
}: {
  href: string;
  exact?: boolean;
  className: string;
  activeClassName: string;
  idleClassName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`${className} ${active ? activeClassName : idleClassName}`}
    >
      {children}
    </Link>
  );
}
