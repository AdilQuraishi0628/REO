import React from "react";
import { Icon, type IconProps, type IconName } from "./Icon";
import { ICON_REGISTRY, type RegistryIconName } from "./registry";
import { ICON_ALIASES, resolveIconName, type IconAliasName } from "./aliases";

export { Icon, ICON_REGISTRY, ICON_ALIASES, resolveIconName };
export type { IconProps, IconName, RegistryIconName, IconAliasName };

/**
 * Maps a category title or slug to a canonical category icon registry name
 */
export function getCategoryIconName(categoryName: string): RegistryIconName {
  const lower = (categoryName || "").toLowerCase();
  if (lower.includes("coffee") || lower.includes("espresso") || lower.includes("brew") || lower.includes("latte") || lower.includes("cappuccino")) {
    return "coffee";
  }
  if (lower.includes("tea") || lower.includes("chai") || lower.includes("matcha")) {
    return "tea";
  }
  if (lower.includes("bakery") || lower.includes("croissant") || lower.includes("bread") || lower.includes("pastry") || lower.includes("toast")) {
    return "bakery";
  }
  if (lower.includes("cake") || lower.includes("dessert") || lower.includes("sweet") || lower.includes("tart") || lower.includes("ice cream")) {
    return "cakes";
  }
  if (lower.includes("bite") || lower.includes("sandwich") || lower.includes("burger") || lower.includes("snack") || lower.includes("fries") || lower.includes("starter")) {
    return "light-bites";
  }
  if (lower.includes("cold") || lower.includes("drink") || lower.includes("beverage") || lower.includes("juice") || lower.includes("shake") || lower.includes("cooler")) {
    return "cold";
  }
  if (lower.includes("bowl") || lower.includes("soup") || lower.includes("salad") || lower.includes("pasta") || lower.includes("noodles") || lower.includes("rice")) {
    return "bowls";
  }
  return "plates";
}

/**
 * Category Icon Resolver Component
 */
export function CategoryIcon({
  name,
  size = 28,
  className = "",
  ...props
}: {
  name: string;
  size?: number;
  className?: string;
  animate?: "draw" | "swap";
} & Omit<React.SVGProps<SVGSVGElement>, "name">) {
  const iconName = getCategoryIconName(name);
  return <Icon name={iconName} size={size} className={className} {...props} />;
}

/* =========================================================================
   Backward Compatibility Helpers (All route to the single registry)
   ========================================================================= */
export function IconCoffee(props: Omit<IconProps, "name">) {
  return <Icon name="coffee" {...props} />;
}
export function IconTea(props: Omit<IconProps, "name">) {
  return <Icon name="tea" {...props} />;
}
export function IconBakery(props: Omit<IconProps, "name">) {
  return <Icon name="bakery" {...props} />;
}
export function IconCakes(props: Omit<IconProps, "name">) {
  return <Icon name="cakes" {...props} />;
}
export function IconLightBites(props: Omit<IconProps, "name">) {
  return <Icon name="light-bites" {...props} />;
}
export function IconPlates(props: Omit<IconProps, "name">) {
  return <Icon name="plates" {...props} />;
}
export function IconCold(props: Omit<IconProps, "name">) {
  return <Icon name="cold" {...props} />;
}
export function IconBowls(props: Omit<IconProps, "name">) {
  return <Icon name="bowls" {...props} />;
}
export function IconBag(props: Omit<IconProps, "name">) {
  return <Icon name="bag" {...props} />;
}
export function IconAdd(props: Omit<IconProps, "name">) {
  return <Icon name="add" {...props} />;
}
export function IconRemove(props: Omit<IconProps, "name">) {
  return <Icon name="remove" {...props} />;
}
export function IconTable(props: Omit<IconProps, "name">) {
  return <Icon name="table" {...props} />;
}
export function IconOrder(props: Omit<IconProps, "name">) {
  return <Icon name="order" {...props} />;
}
export function IconClock(props: Omit<IconProps, "name">) {
  return <Icon name="clock" {...props} />;
}
export function IconServed(props: Omit<IconProps, "name">) {
  return <Icon name="check-circle" {...props} />;
}
export function IconBell(props: Omit<IconProps, "name">) {
  return <Icon name="bell" {...props} />;
}
export function IconSearch(props: Omit<IconProps, "name">) {
  return <Icon name="search" {...props} />;
}
export function IconFilter(props: Omit<IconProps, "name">) {
  return <Icon name="filter" {...props} />;
}
export function IconSettings(props: Omit<IconProps, "name">) {
  return <Icon name="settings" {...props} />;
}
export function IconMenu(props: Omit<IconProps, "name">) {
  return <Icon name="menu" {...props} />;
}
export function IconClose(props: Omit<IconProps, "name">) {
  return <Icon name="close" {...props} />;
}
export function IconBack(props: Omit<IconProps, "name">) {
  return <Icon name="back" {...props} />;
}
export function IconEdit(props: Omit<IconProps, "name">) {
  return <Icon name="edit" {...props} />;
}
export function IconDelete(props: Omit<IconProps, "name">) {
  return <Icon name="delete" {...props} />;
}
export function IconQrCode(props: Omit<IconProps, "name">) {
  return <Icon name="qr" {...props} />;
}
export { IconQrCode as IconQrcode, IconQrCode as IconQR };

export function IconStaff(props: Omit<IconProps, "name">) {
  return <Icon name="staff" {...props} />;
}
export function IconWifi(props: Omit<IconProps, "name">) {
  return <Icon name="wifi" {...props} />;
}
export function IconStar(props: Omit<IconProps, "name">) {
  return <Icon name="star" {...props} />;
}
export function IconVeg({ size = 15, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Vegetarian"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="3.5" stroke="#166534" strokeWidth="2" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="5" fill="#166534" />
    </svg>
  );
}
export function IconNonVeg({ size = 15, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label="Non-Vegetarian"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="3.5" stroke="#991B1B" strokeWidth="2" fill="#FFFFFF" />
      <circle cx="12" cy="12" r="5" fill="#991B1B" />
    </svg>
  );
}
export function IconMonogramT({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" className={className}>
      <rect width="28" height="28" rx="8" fill="#722F37" />
      <text
        x="50%"
        y="54%"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontSize="18"
        fontWeight="600"
        fill="#F7F1E9"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        T
      </text>
    </svg>
  );
}
export function IconBotanicalSprig(props: Omit<IconProps, "name">) {
  return <Icon name="flourish" size={44} strokeWidth={1.2} {...props} />;
}

export function IconAlert(props: Omit<IconProps, "name">) {
  return <Icon name="alert" {...props} />;
}
