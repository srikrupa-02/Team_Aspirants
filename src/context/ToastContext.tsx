import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (title: string, message?: string, type?: ToastType) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((title: string, message?: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev.slice(-4), { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((title: string, message?: string) => toast(title, message, "success"), [toast]);
  const error = useCallback((title: string, message?: string) => toast(title, message, "error"), [toast]);
  const info = useCallback((title: string, message?: string) => toast(title, message, "info"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-2xl border backdrop-blur-md transition-all duration-300 transform translate-y-0 ${
              t.type === "success"
                ? "bg-[#0F0F11]/95 border-emerald-500/30 text-emerald-100"
                : t.type === "error"
                ? "bg-[#0F0F11]/95 border-rose-500/30 text-rose-100"
                : "bg-[#0F0F11]/95 border-[#C5A059]/40 text-[#D4D4D8]"
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {t.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {t.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {t.type === "info" && <Info className="w-5 h-5 text-[#C5A059]" />}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="serif-text text-sm font-medium text-white">{t.title}</h4>
              {t.message && <p className="text-xs mt-0.5 text-[#D4D4D8]/70 leading-relaxed break-words font-light">{t.message}</p>}
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-[#D4D4D8]/40 hover:text-white transition-colors shrink-0 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
