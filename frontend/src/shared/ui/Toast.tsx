import { createContext, useCallback, useContext, useMemo, useState } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useReducedMotion } from "../motion/presets";

type ToastKind = "error" | "success" | "info";

type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

type ToastContextValue = {
  push: (message: string, kind?: ToastKind) => void;
  error: (message: string) => void;
  success: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const reduced = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, kind: ToastKind = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setItems((prev) => [...prev.slice(-4), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), 6000);
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      error: (message) => push(message, "error"),
      success: (message) => push(message, "success"),
      info: (message) => push(message, "info")
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0"
        aria-live="polite"
      >
        <AnimatePresence mode="popLayout">
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={reduced ? false : { opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, x: 40, scale: 0.95 }}
              transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 28 }}
              className={clsx(
                "pointer-events-auto flex items-start gap-2 rounded-xl border px-4 py-3 text-sm shadow-soft backdrop-blur-xl",
                t.kind === "error" && "border-danger/40 bg-danger/10 text-primary",
                t.kind === "success" && "border-success/40 bg-success/10 text-primary",
                t.kind === "info" && "border-border-subtle/80 bg-surface/90 text-primary"
              )}
              role="alert"
            >
              {t.kind === "error" ? (
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-danger" />
              ) : t.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
              ) : null}
              <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-lg p-1 opacity-60 transition hover:opacity-100"
                aria-label="Fermer"
              >
                <X className="size-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
