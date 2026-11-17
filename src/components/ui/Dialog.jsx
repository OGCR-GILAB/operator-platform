import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import { Button, Dialog as DsDialog, FormFooter } from "@majistudio/ogcr-design-system";

/*
  The DS Dialog with what this app needs and the package does not have yet:
  actions that can be disabled, and an `xl` size. Same props as the DS Dialog
  otherwise, so going back to it is an import change once the package catches
  up. Like the DS, an action closes the dialog unless `closeOnClick: false`.
*/

// Wider than the DS's `l` (640px), for content with its own layout: a map, a document.
const XL_WIDTH = "w-[1120px]";

function DialogActionButton({ action, fallbackVariant }) {
  const button = (
    <Button
      variant={action.variant ?? fallbackVariant}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  );

  return action.closeOnClick === false
    ? button
    : <BaseDialog.Close disabled={action.disabled} render={button} />;
}

/**
 * `primaryAction` / `secondaryAction`: { label, onClick, variant, disabled, closeOnClick }.
 * `footerNote` sits beside the actions (DS FormFooter `note`).
 */
function Dialog({ size = "m", primaryAction, secondaryAction, footerNote, className = "", children, ...rest }) {
  const hasActions = Boolean(primaryAction || secondaryAction);

  return (
    <DsDialog
      size={size === "xl" ? "l" : size}
      className={[size === "xl" ? XL_WIDTH : "", className].filter(Boolean).join(" ") || undefined}
      {...rest}
    >
      {children}
      {hasActions && (
        <FormFooter note={footerNote}>
          {primaryAction && <DialogActionButton action={primaryAction} fallbackVariant="filled" />}
          {secondaryAction && <DialogActionButton action={secondaryAction} fallbackVariant="outlined" />}
        </FormFooter>
      )}
    </DsDialog>
  );
}

export default Dialog;
