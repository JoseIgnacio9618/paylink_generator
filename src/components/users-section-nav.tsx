"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const USER_SECTION_ITEMS = [
  {
    href: "/usuarios/crear",
    label: "Crear",
  },
  {
    href: "/usuarios/existentes",
    label: "Usuarios existentes",
  },
];

function isItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function UsersSectionNav() {
  const pathname = usePathname();

  return (
    <div className="flex justify-start">
      <div className="inline-flex rounded-full border border-border bg-surface/80 p-1 shadow-[0_10px_30px_rgba(18,34,38,0.05)]">
        {USER_SECTION_ITEMS.map((item) => {
          const active = isItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-accent text-white"
                  : "text-muted hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
