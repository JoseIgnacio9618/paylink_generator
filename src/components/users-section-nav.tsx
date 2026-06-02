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
      <div className="inline-flex rounded-[1.5rem] border border-border/70 bg-surface/88 p-1.5 shadow-[0_16px_30px_rgba(58,44,34,0.07)]">
        {USER_SECTION_ITEMS.map((item) => {
          const active = isItemActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-[1.15rem] px-4 py-2.5 text-sm font-semibold transition-all",
                active
                  ? "bg-accent text-white shadow-[0_16px_24px_rgba(154,79,36,0.18)]"
                  : "text-muted hover:bg-background/45 hover:text-foreground",
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
