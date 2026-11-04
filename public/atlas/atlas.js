"use strict";

// Vibe Atlas reader.
// Each book lives in a <template id="content-NAME">. A book opens in an
// in-room dialog, and its address is the page plus #NAME, so a book can be
// linked from another page (explore.html#compass) and Back closes it.
// The Atlas keeps no visitor record of any kind.

(() => {
  const templates = new Map(
    [...document.querySelectorAll('template[id^="content-"]')]
      .map(template => [template.id.slice("content-".length), template])
  );

  let dialog = null;
  let syncing = false;

  function readerFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    return templates.has(id) ? id : null;
  }

  function ensureDialog() {
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "active-reader-dialog";
    dialog.className = "reader";
    dialog.setAttribute("aria-labelledby", "reader-title");
    dialog.innerHTML = `
      <div class="reader-header">
        <h2 id="reader-title"></h2>
        <button type="button" class="reader-close" aria-label="Close book">Close</button>
      </div>
      <div class="reader-body" id="reader-content"></div>
    `;
    document.body.appendChild(dialog);

    dialog.querySelector(".reader-close").addEventListener("click", closeReader);

    // A click on the backdrop closes the book. Backdrop clicks target the
    // dialog itself; clicks on the book's header and pages target its children.
    dialog.addEventListener("click", event => {
      if (event.target === dialog) closeReader();
    });

    // Escape: close through the same path so the address follows.
    dialog.addEventListener("cancel", event => {
      event.preventDefault();
      closeReader();
    });

    return dialog;
  }

  // Close the open book and take its #NAME out of the address.
  function closeReader() {
    if (!dialog || !dialog.open) return;
    dialog.close();
    if (syncing || !location.hash) return;
    if (history.state && history.state.atlasReader) {
      history.back();
    } else {
      history.replaceState(null, "", location.pathname + location.search);
    }
  }

  function openReader(readerId, { push = false } = {}) {
    const template = templates.get(readerId);
    if (!template) return;

    const box = ensureDialog();
    box.querySelector("#reader-title").textContent =
      template.dataset.title || "Information";
    box.querySelector("#reader-content")
      .replaceChildren(template.content.cloneNode(true));
    box.scrollTop = 0;

    if (push && location.hash !== `#${readerId}`) {
      history.pushState({ atlasReader: true }, "", `#${readerId}`);
    }

    if (!box.open && typeof box.showModal === "function") {
      box.showModal();
    }
  }

  function syncWithAddress() {
    const readerId = readerFromHash();
    if (readerId) {
      openReader(readerId);
    } else if (dialog && dialog.open) {
      syncing = true;
      closeReader();
      syncing = false;
    }
  }

  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-reader]");
    if (!trigger) return;

    const readerId = trigger.dataset.reader;
    if (readerId && templates.has(readerId)) {
      event.preventDefault();
      openReader(readerId, { push: true });
    }
  });

  // Back, Forward, and in-book links such as #first-creation.
  window.addEventListener("hashchange", syncWithAddress);

  // Arriving from another page with a book address opens that book.
  syncWithAddress();
})();
