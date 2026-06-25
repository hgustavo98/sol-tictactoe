/**
 * Mobile layout audit — run in browser console or via CDP Runtime.evaluate.
 * Returns issues per viewport/mode.
 */
export function auditMobileLayout(mode = "browse") {
  const issues = [];
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const landscape = vw > vh;

  const shell = document.querySelector(".game-interface-shell");
  const view = shell?.getAttribute("data-lobby-view") ?? "unknown";

  const box = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      top: Math.round(r.top),
      bottom: Math.round(r.bottom),
      left: Math.round(r.left),
      right: Math.round(r.right),
      height: Math.round(r.height),
      width: Math.round(r.width),
    };
  };

  const rects = {
    profile: box(".game-left-rail"),
    actions: box(".lobby-actions-bar"),
    corners: box(".lobby-corner-actions"),
    sheet: box(".open-tables-sheet"),
    banner: box(".arena-banner"),
    canvas: box(".lobby-scene-root"),
    trainingBack: box(".training-top-back-btn"),
    gameActions: box(".game-bottom-left-actions"),
    clocks: box(".damas3d-clocks-bar"),
  };

  const overlaps = (a, b, pad = 4) => {
    if (!a || !b) return false;
    return !(
      a.bottom <= b.top + pad ||
      a.top >= b.bottom - pad ||
      a.right <= b.left + pad ||
      a.left >= b.right - pad
    );
  };

  for (const [name, r] of Object.entries(rects)) {
    if (!r) continue;
    if (r.bottom > vh + 2) issues.push(`${name}_clips_bottom`);
    if (r.top < -2) issues.push(`${name}_clips_top`);
    if (r.right > vw + 2) issues.push(`${name}_clips_right`);
    if (r.left < -2) issues.push(`${name}_clips_left`);
  }

  if (view === "browse") {
    if (overlaps(rects.corners, rects.actions)) {
      issues.push("corners_overlap_actions_bar");
    }
    if (rects.sheet && rects.profile && rects.sheet.top < rects.profile.bottom - 8) {
      issues.push("open_tables_sheet_under_profile");
    }
    if (rects.sheet && rects.actions && overlaps(rects.sheet, rects.actions)) {
      issues.push("open_tables_sheet_overlaps_actions");
    }
    if (rects.banner && rects.actions && overlaps(rects.banner, rects.actions)) {
      issues.push("banner_overlaps_actions");
    }
    if (rects.canvas && rects.profile && rects.canvas.top < rects.profile.bottom - 4) {
      issues.push("banner_scene_under_profile");
    }
  }

  if (view === "training") {
    if (!rects.trainingBack) issues.push("training_exit_missing");
    if (rects.trainingBack && rects.trainingBack.top > vh * 0.25) {
      issues.push("training_exit_too_low");
    }
  }

  if (view === "game") {
    if (overlaps(rects.profile, rects.clocks)) issues.push("game_profile_overlaps_clocks");
    if (rects.gameActions && rects.gameActions.bottom > vh + 2) {
      issues.push("game_actions_off_screen");
    }
  }

  return {
    mode,
    view,
    vw,
    vh,
    landscape,
    issues,
    rects,
  };
}

export async function runGuestLobbyFlow() {
  sessionStorage.setItem("sol-ttt-devnet-warning-dismissed", "1");
  const dismiss = Array.from(document.querySelectorAll("button")).find((b) =>
    /got it|entendi/i.test(b.textContent || ""),
  );
  dismiss?.click();
  await new Promise((r) => setTimeout(r, 400));

  const guest = Array.from(document.querySelectorAll("button")).find((b) =>
    /guest|convidado/i.test(b.textContent || ""),
  );
  if (guest) {
    guest.click();
    await new Promise((r) => setTimeout(r, 2800));
  }

  return auditMobileLayout("lobby");
}

export async function runOpenTablesFlow() {
  const openBtn = Array.from(document.querySelectorAll("button")).find((b) =>
    /open tables|mesas abertas|browse/i.test(b.textContent || ""),
  );
  openBtn?.click();
  await new Promise((r) => setTimeout(r, 700));
  const audit = auditMobileLayout("open-tables");
  const close = document.querySelector(".open-tables-sheet-close");
  close?.click();
  await new Promise((r) => setTimeout(r, 300));
  return audit;
}

export async function runTrainingFlow() {
  const train = Array.from(document.querySelectorAll("button")).find(
    (b) =>
      /train|treino|trein/i.test(b.getAttribute("aria-label") || "") ||
      /train|treino|trein/i.test(b.textContent || ""),
  );
  train?.click();
  await new Promise((r) => setTimeout(r, 1200));
  const audit = auditMobileLayout("training");
  const back = document.querySelector(".training-top-back-btn");
  back?.click();
  await new Promise((r) => setTimeout(r, 500));
  return audit;
}

export async function runGuestJoinFlow() {
  const join = Array.from(document.querySelectorAll("button")).find((b) =>
    /^join$|entrar/i.test((b.textContent || "").trim()),
  );
  if (!join) return { joined: false, reason: "no_join_button" };
  join.click();
  await new Promise((r) => setTimeout(r, 1500));
  return {
    joined: true,
    audit: auditMobileLayout("guest-join"),
    view: document.querySelector(".game-interface-shell")?.getAttribute("data-lobby-view"),
  };
}
