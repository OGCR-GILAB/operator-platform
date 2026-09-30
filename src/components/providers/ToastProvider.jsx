import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Message from "../ui/Message";
import { ToastContext } from "./ToastContext";

const DEFAULT_TOAST_AUTO_CLOSE = 5000;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);
  const timeoutMapRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    const timeoutId = timeoutMapRef.current.get(id);

    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutMapRef.current.delete(id);
    }

    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    timeoutMapRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutMapRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
    ({ autoClose, duration, ...toast }) => {
      const resolvedAutoClose =
        autoClose !== undefined
          ? autoClose
          : duration !== undefined
            ? duration
            : DEFAULT_TOAST_AUTO_CLOSE;

      const id = ++toastIdRef.current;

      setToasts((current) => [...current, { ...toast, id }]);

      if (typeof resolvedAutoClose === "number" && resolvedAutoClose > 0) {
        const timeoutId = window.setTimeout(() => {
          removeToast(id);
        }, resolvedAutoClose);

        timeoutMapRef.current.set(id, timeoutId);
      }

      return id;
    },
    [removeToast],
  );

  useEffect(() => () => {
    timeoutMapRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    timeoutMapRef.current.clear();
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      showToast,
      removeToast,
      clearToasts,
    }),
    [toasts, showToast, removeToast, clearToasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="ogcr-toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <Message
            key={toast.id}
            variant={toast.variant}
            title={toast.title}
            description={toast.description}
            action={toast.action}
            actionLabel={toast.actionLabel}
            onAction={toast.onAction}
            closeLabel={toast.closeLabel}
            floating
            onClose={() => removeToast(toast.id)}
            className="ogcr-toast-viewport__item"
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
