import React, { useState } from "react";
import PassportModal from "./PassportModal";

const PassportButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="atlas-hud-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open your traveler's passport"
        title="Passport"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">📖</span>
      </button>
      {open && <PassportModal onClose={() => setOpen(false)} />}
    </>
  );
};

export default PassportButton;
