import { useCallback, useEffect, useMemo, useRef } from "react";
import { ToastProvider as DsToastProvider, useToast as useDsToast } from "@majistudio/ogcr-design-system";
import { ToastContext } from "./ToastContext";

const DEFAULT_TOAST_AUTO_CLOSE = 5000;

/**
 * The app's `showToast({ variant, title, description, duration })` API on top
 * of the DS toast manager. The callbacks stay stable: callers list them as
 * effect dependencies.
 */
function ToastBridge({ children }) {
  const manager = useDsToast();
  const managerRef = useRef(manager);

  useEffect(() => {
    managerRef.current = manager;
  }, [manager]);

  const showToast = useCallback(({ variant, title, description, autoClose, duration }) => {
    const timeout = autoClose ?? duration ?? DEFAULT_TOAST_AUTO_CLOSE;

    return managerRef.current.add({
      type: variant,
      title,
      description,
      // `autoClose: false` keeps a toast until it is closed; 0 means the same to the DS.
      timeout: typeof timeout === "number" ? timeout : 0,
    });
  }, []);

  const removeToast = useCallback((id) => managerRef.current.close(id), []);

  const clearToasts = useCallback(() => {
    managerRef.current.toasts.forEach((toast) => managerRef.current.close(toast.id));
  }, []);

  const value = useMemo(
    () => ({ showToast, removeToast, clearToasts }),
    [showToast, removeToast, clearToasts],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export const ToastProvider = ({ children }) => (
  <DsToastProvider timeout={DEFAULT_TOAST_AUTO_CLOSE}>
    <ToastBridge>{children}</ToastBridge>
  </DsToastProvider>
);
