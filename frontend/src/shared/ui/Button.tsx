import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { buttonClassName, type ButtonVariant } from "./buttonStyles";

export function Button({
  variant = "primary",
  leftIcon,
  loading,
  className,
  type = "button",
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  leftIcon?: ReactNode;
  loading?: boolean;
}) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      className={buttonClassName(variant, className)}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : leftIcon ? (
        <span className="inline-grid place-items-center transition-transform duration-200 group-hover:scale-110">
          {leftIcon}
        </span>
      ) : null}
      {children != null ? <span>{children}</span> : null}
    </button>
  );
}
