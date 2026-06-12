import clsx from "clsx";
import type { InputHTMLAttributes, ReactNode } from "react";

export function Input({
  className,
  leftIcon,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { leftIcon?: ReactNode }) {
  return (
    <div className={clsx("relative", className)}>
      {leftIcon ? (
        <div className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-slate-500">
          {leftIcon}
        </div>
      ) : null}
      <input
        {...props}
        className={clsx(
          "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium tracking-tight text-[#0f172a] shadow-sm outline-none transition-all duration-200 placeholder:text-slate-500 focus:border-green-600 focus:ring-2 focus:ring-green-600/40 focus:ring-offset-1 focus:ring-offset-white",
          leftIcon ? "pl-10" : ""
        )}
      />
    </div>
  );
}
