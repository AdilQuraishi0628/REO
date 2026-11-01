import type { RegistryIconName } from "./registry";

/**
 * TableTap Semantic Icon Aliases
 *
 * Maps semantic feature names to specific registry drawing names.
 * Screens should prefer using semantic names (e.g. `nav.cart`, `action.add`, `service.callWaiter`).
 * To change which drawing a feature uses across the whole app, edit only this alias mapping.
 */
export const ICON_ALIASES: Record<string, RegistryIconName> = {
  /* Navigation */
  "nav.cart": "bag",
  "nav.menu": "menu",
  "nav.table": "table",
  "nav.orders": "order",
  "nav.settings": "settings",
  "nav.admin": "settings",
  "nav.kitchen": "clock",
  "nav.qr": "qr",
  "nav.analytics": "analytics",
  "nav.loyalty": "loyalty",
  "nav.feedback": "star",
  "nav.logout": "logout",

  /* Actions */
  "action.add": "add",
  "action.remove": "remove",
  "action.close": "close",
  "action.back": "back",
  "action.edit": "edit",
  "action.delete": "delete",
  "action.search": "search",
  "action.filter": "filter",
  "action.copy": "copy",
  "action.download": "download",
  "action.upload": "upload",
  "action.print": "print",
  "action.share": "share",
  "action.refresh": "refresh",
  "action.view": "eye",
  "action.save": "check",
  "action.call": "phone",

  /* Statuses */
  "status.pending": "bell",
  "status.preparing": "clock",
  "status.ready": "check-circle",
  "status.served": "check-circle",
  "status.completed": "check-circle",
  "status.success": "check",
  "status.warning": "alert",
  "status.info": "info",
  "status.waiting": "lightning",

  /* Services */
  "service.callWaiter": "bell-service",
  "service.requestBill": "bill",
  "service.wifi": "wifi",
  "service.water": "water",
  "service.note": "note",

  /* Dietary & Special Tags */
  "tag.vegetarian": "leaf",
  "tag.nonVegetarian": "plates",
  "tag.spicy": "chili",
  "tag.bestseller": "flame",
  "tag.chefSpecial": "chef",
  "tag.popular": "flame",
  "tag.new": "sparkle",
  "tag.jain": "leaf",
  "tag.egg": "egg",
  "tag.vegBadge": "veg",

  /* Loyalty & Rewards */
  "loyalty.points": "loyalty",
  "loyalty.reward": "gift",
  "loyalty.star": "star",
  "loyalty.wallet": "wallet",
  "loyalty.card": "card",
  "loyalty.coupon": "tag",

  /* Categories */
  "category.coffee": "coffee",
  "category.tea": "tea",
  "category.bakery": "bakery",
  "category.cakes": "cakes",
  "category.lightBites": "light-bites",
  "category.plates": "plates",
  "category.plate": "plates",
  plate: "plates",
  "category.cold": "cold",
  "category.bowls": "bowls",
};

export type IconAliasName = keyof typeof ICON_ALIASES;

/**
 * Resolves a name (either a direct registry icon name or a semantic alias) to a valid registry key.
 */
export function resolveIconName(name: string): RegistryIconName | undefined {
  if (name in ICON_ALIASES) {
    return ICON_ALIASES[name];
  }
  return undefined;
}
