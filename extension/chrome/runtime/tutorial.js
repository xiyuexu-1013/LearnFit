// src/ui/tutorial.js
var TUTORIAL_KEY = "learnfitTutorialV1";
function tutorialSteps(extension) {
  return [
    {
      title: "Choose your study task",
      text: extension ? "Open your study material first, then open LearnFit and choose \u201CVerify this page & start\u201D. Chrome webpages, online lessons, and PDFs can be study pages." : "Start a screen-based session here without installing anything. The session clock continues across tab or window changes. To verify which Chrome tabs belong to your task, use the Chrome extension.",
      note: "Independent desktop apps are not recognized. Paper study and long periods looking down are not supported for focus scoring.",
      tiles: ["01 \xB7 Open your material", "02 \xB7 Open LearnFit", "03 \xB7 Choose your task"]
    },
    {
      title: "Set up your camera",
      text: "You do not need to stare at the camera. Look at your study material naturally; just position the camera so it can usually see your eyes. About 30 seconds of usable tracking builds your personal baseline.",
      note: "Blink and glance away naturally. Normal blinking is expected. If your eyes leave the camera view, that is No signal: missing data, not a zero-score penalty.",
      tiles: ["Camera \xB7 on this device", "Study naturally \xB7 do not stare", "30 sec \xB7 personal baseline"]
    },
    {
      title: "Keep your study pages connected",
      text: extension ? "Your starting tab is included automatically. If you open study material in another tab, choose \u201CInclude this tab in my study session\u201D once. Navigation inside an included tab stays connected for the rest of the session." : "The web session clock keeps running when you leave this tab. Your browser may slow or stop camera processing in the background, so those seconds can become No signal instead of a focus score.",
      note: extension ? "LearnFit cannot see what you do inside an included tab. Include only tabs that belong to the task, and start a new session if you later reuse one for entertainment." : "The website cannot identify whether another tab is study or entertainment. Use the extension for task-page confirmation across Chrome tabs.",
      tiles: extension ? ["Starting tab \xB7 included", "New study tab \xB7 include once", "Navigate inside it \xB7 stays included"] : ["Session clock \xB7 continues", "Background camera \xB7 may stop", "Missing signal \xB7 no penalty"]
    },
    {
      title: "Read your results",
      text: "Focus Estimate compares eye signals with your baseline. Verified study time is time in the confirmed study context after calibration, excluding pauses; it can include No signal. Tracking coverage is the share with usable eye signals.",
      note: "Below 60% coverage, no final score is shown. A confirmed page does not prove attention or reveal what happens inside it. Treat study-time suggestions as experiments, not limits. After ending, download your report or CSV and optionally give feedback.",
      tiles: ["Focus Estimate \xB7 \u2014 / 100", "Verified time \xB7 study context", "Coverage \xB7 usable signals"]
    }
  ];
}
function mountTutorial({ extension = false, entry, read, write, isBusy }) {
  let step = 0, dismissed = false, loaded = false, returnFocus;
  const style = document.createElement("style");
  style.textContent = `
  .lf-tutorial{box-sizing:border-box;width:min(560px,calc(100vw - 24px));max-height:calc(100dvh - 24px);padding:24px;margin:auto;overflow:auto;border:1px solid #17362c;border-radius:12px;background:#f2ede3;color:#17362c;font:14px/1.55 Arial,sans-serif;box-shadow:0 16px 70px #0003}
  .lf-tutorial::backdrop{background:#102f27aa}.lf-tutorial h2{font:38px/1.05 'Instrument Serif',Georgia,serif;margin:18px 0}.lf-tutorial p{margin:14px 0}.lf-tutorial small{font:10px/1.5 monospace;text-transform:uppercase;letter-spacing:1px}.lf-tutorial .lf-tiles{display:grid;gap:7px;background:#12382d;padding:14px;border-radius:8px;color:#fffdf8}.lf-tutorial .lf-tile{padding:8px 10px;border:1px solid #638276;border-radius:4px;font:12px/1.4 monospace}.lf-tutorial .lf-note{font-size:12px;color:#435f52}.lf-tutorial .lf-actions{display:flex;gap:8px;margin-top:18px}.lf-tutorial button{font:600 13px Arial;min-height:42px;padding:8px 14px;border:1px solid #17362c;border-radius:5px;background:#fffdf8;color:#17362c;cursor:pointer}.lf-tutorial button:last-child{margin-left:auto;background:#b94b36;border-color:#b94b36;color:white}.lf-tutorial button:disabled{opacity:.4;cursor:default}.lf-tutorial :focus-visible{outline:3px solid #b94b36;outline-offset:3px}.lf-tutorial progress{width:100%;height:5px;accent-color:#17362c}.lf-tutorial-entry{background:transparent;color:inherit;border:0;text-decoration:underline;cursor:pointer;padding:8px;font:inherit}@media(max-width:400px){.lf-tutorial{padding:16px}.lf-tutorial h2{font-size:30px}}@media(prefers-reduced-motion:reduce){.lf-tutorial *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;
  document.head.append(style);
  const dialog = document.createElement("dialog");
  dialog.className = "lf-tutorial";
  dialog.setAttribute("aria-labelledby", "lf-tutorial-title");
  dialog.innerHTML = `<small>LEARNFIT / QUICK START</small><p id="lf-step" role="status" aria-live="polite"></p><progress max="4" aria-label="Tutorial progress"></progress><h2 id="lf-tutorial-title" tabindex="-1"></h2><p class="lf-copy"></p><div class="lf-tiles" aria-label="Illustrative example"></div><small>Illustration only \xB7 not your measurements</small><p class="lf-note"></p><div class="lf-actions"><button type="button" data-back>Back</button><button type="button" data-skip>Skip</button><button type="button" data-next>Next</button></div>`;
  document.body.append(dialog);
  const steps = tutorialSteps(extension);
  const next = dialog.querySelector("[data-next]");
  function render() {
    const data = steps[step];
    dialog.querySelector("#lf-step").textContent = `Step ${step + 1} of 4`;
    dialog.querySelector("progress").value = step + 1;
    dialog.querySelector("h2").textContent = data.title;
    dialog.querySelector(".lf-copy").textContent = data.text;
    dialog.querySelector(".lf-note").textContent = data.note;
    dialog.querySelector(".lf-tiles").replaceChildren(...data.tiles.map((text) => {
      const tile = document.createElement("div");
      tile.className = "lf-tile";
      tile.textContent = text;
      return tile;
    }));
    dialog.querySelector("[data-back]").disabled = step === 0;
    next.textContent = step === 3 ? "Done" : "Next";
    dialog.scrollTop = 0;
    dialog.querySelector("h2").focus();
  }
  function open() {
    if (dialog.open) return;
    returnFocus = document.activeElement;
    step = 0;
    dialog.showModal();
    render();
  }
  function close() {
    dismissed = true;
    Promise.resolve().then(write).catch(() => {
    });
    dialog.close();
    (returnFocus?.isConnected ? returnFocus : entry).focus();
  }
  dialog.querySelector("[data-back]").onclick = () => {
    if (step > 0) {
      step--;
      render();
    }
  };
  next.onclick = () => {
    if (step === 3) close();
    else {
      step++;
      render();
    }
  };
  dialog.querySelector("[data-skip]").onclick = close;
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  entry.addEventListener("click", open);
  function maybeShow() {
    if (loaded && !dismissed && !isBusy() && !document.querySelector("dialog[open]")) open();
  }
  Promise.resolve().then(read).then((value) => {
    dismissed = Boolean(value);
  }).catch(() => {
  }).finally(() => {
    loaded = true;
    maybeShow();
  });
  return { maybeShow };
}
export {
  TUTORIAL_KEY,
  mountTutorial,
  tutorialSteps
};
