import { useCallback } from "react";
import { useGlobal } from "../providers/GlobalContext";
import { useToast } from "../providers/ToastContext";

/**
 * The sign-out gesture, in one place. It is offered from the top bar and from
 * inside the Operator setup gate, which sits above the top bar — the two must
 * not drift apart.
 */
export default function useSignOut() {
  const { logout } = useGlobal();
  const { showToast, clearToasts } = useToast();

  return useCallback(() => {
    logout();
    clearToasts();
    showToast({
      variant: "success",
      title: "Signed Out",
      description: "You have successfully signed out.",
    });
  }, [logout, clearToasts, showToast]);
}
