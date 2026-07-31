import React from "react";
import {
  render, screen, fireEvent, waitFor, act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Button from "../../pages/admin/ui/Button";
import Modal from "../../pages/admin/ui/Modal";
import ConfirmDialog from "../../pages/admin/ui/ConfirmDialog";
import { ToastProvider, useToast } from "../../pages/admin/ui/ToastContext";

describe("Button", () => {
  it("swaps the icon for a spinner and blocks clicks while loading", () => {
    const onClick = jest.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it cannot submit a form by accident", () => {
    render(<Button>Cancel</Button>);
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("type", "button");
  });
});

describe("Modal", () => {
  const Harness = ({ onClose }) => (
    <Modal open onClose={onClose} title="Edit book">
      <input aria-label="first" />
      <input aria-label="last" />
    </Modal>
  );

  it("closes on Escape", () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("locks page scroll while open and restores it on close", () => {
    const { unmount } = render(<Harness onClose={() => {}} />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("focuses the first body control, not the header close button", () => {
    render(<Harness onClose={() => {}} />);
    expect(document.activeElement).toBe(screen.getByLabelText("first"));
  });

  it("wraps Tab at both ends of the panel", () => {
    render(<Harness onClose={() => {}} />);
    const close = screen.getByRole("button", { name: "Close" });
    const last = screen.getByLabelText("last");
    const dialog = screen.getByRole("dialog");

    // DOM order is [close, first, last]. Shift+Tab off the front wraps to the back…
    close.focus();
    fireEvent.keyDown(dialog, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);

    // …and Tab off the back wraps to the front.
    fireEvent.keyDown(dialog, { key: "Tab" });
    expect(document.activeElement).toBe(close);
  });

  it("renders nothing when closed", () => {
    render(<Modal open={false} onClose={() => {}} title="Hidden" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ConfirmDialog", () => {
  it("runs onConfirm and stays open until an async confirm settles", async () => {
    let resolve;
    const onConfirm = jest.fn(() => new Promise((r) => { resolve = r; }));
    render(
      <ConfirmDialog
        open
        title="Delete this entry?"
        message="Gone for good."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
        onClose={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();

    await act(async () => { resolve(); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Delete" })).not.toBeDisabled());
  });

  it("closes without confirming on cancel", () => {
    const onClose = jest.fn();
    const onConfirm = jest.fn();
    render(<ConfirmDialog open onConfirm={onConfirm} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("ToastProvider", () => {
  const Trigger = () => {
    const toast = useToast();
    return (
      <>
        <button type="button" onClick={() => toast.success("Saved.")}>ok</button>
        <button type="button" onClick={() => toast.error("Boom.")}>fail</button>
      </>
    );
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("auto-dismisses a success toast but keeps an error until dismissed", () => {
    render(<ToastProvider><Trigger /></ToastProvider>);

    fireEvent.click(screen.getByText("ok"));
    fireEvent.click(screen.getByText("fail"));
    expect(screen.getByText("Saved.")).toBeInTheDocument();
    expect(screen.getByText("Boom.")).toBeInTheDocument();

    act(() => { jest.advanceTimersByTime(5000); });
    expect(screen.queryByText("Saved.")).toBeNull();
    // A failed save is not something to blink past.
    expect(screen.getByText("Boom.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Dismiss" })[0]);
    expect(screen.queryByText("Boom.")).toBeNull();
  });

  it("is a no-op outside a provider, so panels can render standalone", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<Trigger />);
    await user.click(screen.getByText("ok"));
    expect(screen.queryByText("Saved.")).toBeNull();
  });
});
