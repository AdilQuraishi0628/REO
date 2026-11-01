import React from "react";
import { ICON_REGISTRY, type RegistryIconName } from "./registry";
import { ICON_ALIASES, resolveIconName, type IconAliasName } from "./aliases";

export type IconName = RegistryIconName | IconAliasName | (string & {});

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number | string;
  title?: string;
  animate?: "draw" | "swap";
}

/**
 * TableTap Central Icon Component
 *
 * Renders fine-line outline icons on a 24x24 grid with:
 * - stroke="currentColor" (inherits theme token colors)
 * - strokeWidth={1.4} default
 * - Accessible title & aria-hidden support
 * - Resolves aliases seamlessly
 * - Optional opt-in animation ("draw" | "swap")
 */
export function Icon({
  name,
  size = 24,
  className = "",
  strokeWidth = 1.4,
  title,
  animate,
  ...restProps
}: IconProps) {
  const motionClass =
    animate === "draw"
      ? "motion-icon-draw"
      : animate === "swap"
      ? "motion-icon-swap"
      : "";
  const combinedClassName = [className, motionClass].filter(Boolean).join(" ");
  // Resolve alias first if present, otherwise direct registry lookup
  const registryKey =
    name in ICON_REGISTRY
      ? (name as RegistryIconName)
      : resolveIconName(name) ?? (name in ICON_ALIASES ? ICON_ALIASES[name as IconAliasName] : undefined);

  if (!registryKey || !(registryKey in ICON_REGISTRY)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[TableTap Icon] Unknown icon name or alias: "${name}". No icon rendered.`);
    }
    return null;
  }

  const svgChildren = ICON_REGISTRY[registryKey];

  return (
    <svg
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      className={combinedClassName}
      fill="none"
      height={size}
      role={title ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      {...restProps}
    >
      {title && <title>{title}</title>}
      {svgChildren}
    </svg>
  );
}
