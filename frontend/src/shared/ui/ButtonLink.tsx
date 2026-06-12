import clsx from "clsx";
import type { ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { buttonClassName, type ButtonVariant } from "./buttonStyles";

export function ButtonLink({
  variant = "primary",
  leftIcon,
  className,
  children,
  ...props
}: LinkProps & {
  variant?: ButtonVariant;
  leftIcon?: ReactNode;
}) {
  return (
    <Link {...props} className={clsx(buttonClassName(variant, className), "no-underline")}>
      {leftIcon ? <span className="inline-grid place-items-center">{leftIcon}</span> : null}
      {children != null ? <span>{children}</span> : null}
    </Link>
  );
}
