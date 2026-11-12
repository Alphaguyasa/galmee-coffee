"use client";

import { useTranslations } from "next-intl";
import { Scale, Settings, ShoppingBasket, Users, Warehouse } from "lucide-react";
import { BottomNav } from "@/components/galmee/bottom-nav";

const ITEMS = [
  { href: "/", key: "home", icon: Scale, manager: false },
  { href: "/buy", key: "buy", icon: ShoppingBasket, manager: false },
  { href: "/farmers", key: "farmers", icon: Users, manager: false },
  { href: "/stock", key: "stock", icon: Warehouse, manager: false },
  { href: "/setup", key: "setup", icon: Settings, manager: true },
] as const;

/** Coffee's destinations in the shared Galmee nav; setup only for managers. */
export function AppNav({ variant, canManage }: { variant: "bottom" | "side"; canManage: boolean }) {
  const t = useTranslations("nav");
  return (
    <BottomNav
      variant={variant}
      menuLabel={t("menu")}
      items={ITEMS.filter((item) => canManage || !item.manager).map(({ href, key, icon }) => ({
        href,
        label: t(key),
        icon,
      }))}
    />
  );
}
