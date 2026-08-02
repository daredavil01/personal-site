import React, { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { mutedText } from "./tokens";

/**
 * Replaces window.confirm across the admin. `onConfirm` may be async — the
 * confirm button shows a spinner until it settles, and the dialog stays open on
 * rejection so the caller can surface the error.
 */
const ConfirmDialog = ({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onClose,
}) => {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={(
        <>
          <Button onClick={onClose} disabled={busy}>{cancelLabel}</Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={confirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      )}
    >
      {message && <p className={`text-sm ${mutedText} mb-0`}>{message}</p>}
    </Modal>
  );
};

export default ConfirmDialog;
