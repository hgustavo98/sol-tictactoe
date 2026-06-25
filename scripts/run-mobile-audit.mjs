/**
 * Mobile viewport audit — run with dev server on localhost:5173.
 * Usage: node scripts/run-mobile-audit.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:5173/";

const DEVICES = [
  { name: "iPhone SE", w: 375, h: 667 },
  { name: "iPhone 12 Pro", w: 390, h: 844 },
  { name: "iPhone 14 Pro Max", w: 430, h: 932 },
  { name: "Pixel 7", w: 412, h: 915 },
  { name: "iPad Mini", w: 768, h: 1024 },
  { name: "iPad Air", w: 820, h: 1180 },
  { name: "iPad Pro 11", w: 834, h: 1194 },
];

const AUDIT_JS = async () => {
  function auditMobileLayout(mode = "browse") {
    const issues = [];
    const vh = window.innerHeight;
    const vw = window.innerWidth;
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
      if (r.bottom > vh + 2) issues.push(name + "_clips_bottom");
      if (r.top < -2) issues.push(name + "_clips_top");
      if (r.right > vw + 2) issues.push(name + "_clips_right");
      if (r.left < -2) issues.push(name + "_clips_left");
    }
    if (view === "browse") {
      if (overlaps(rects.corners, rects.actions)) issues.push("corners_overlap_actions_bar");
      if (rects.sheet && rects.profile && rects.sheet.top < rects.profile.bottom - 8)
        issues.push("open_tables_sheet_under_profile");
      if (rects.sheet && rects.actions && overlaps(rects.sheet, rects.actions))
        issues.push("open_tables_sheet_overlaps_actions");
      if (rects.sheet && rects.sheet.left >= vw - 8) issues.push("sheet_offscreen_right");
    }
    if (view === "training" && !rects.trainingBack) issues.push("training_exit_missing");
    if (view === "game" && overlaps(rects.profile, rects.clocks))
      issues.push("game_profile_overlaps_clocks");
    return { mode, view, vw, vh, issues, rects };
  }

  async function ensureBrowse() {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const view = document.querySelector(".game-interface-shell")?.getAttribute("data-lobby-view");
      if (view === "browse") break;
      if (view === "training") {
        document.querySelector(".training-top-back-btn")?.click();
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      if (view === "game" || view === "waiting") {
        const resign = document.querySelector(
          ".profile-game-hud-resign, .profile-game-rail-resign, .damas3d-resign-btn, .game-bottom-left-btn",
        );
        resign?.click();
        await new Promise((r) => setTimeout(r, 500));
        const confirm = Array.from(document.querySelectorAll("button")).find((b) =>
          /^(resign|desistir)$/i.test((b.textContent || "").trim()),
        );
        confirm?.click();
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }
      break;
    }
    document.querySelector(".open-tables-sheet-close")?.click();
    await new Promise((r) => setTimeout(r, 250));
  }

  function clickOpenTables() {
    const btn = document.querySelector(".lobby-actions-bar button[aria-expanded]");
    btn?.click();
  }

  function clickTraining() {
    const btn = document.querySelector('.lobby-corner-actions button[aria-label*="Train"], .lobby-corner-actions button[aria-label*="Trein"]');
    btn?.click();
  }

  async function runOpenTables() {
    await ensureBrowse();
    clickOpenTables();
    await new Promise((r) => setTimeout(r, 900));
    const audit = auditMobileLayout("open-tables");
    document.querySelector(".open-tables-sheet-close")?.click();
    await new Promise((r) => setTimeout(r, 300));
    return {
      ok: audit.issues.length === 0 && Boolean(audit.rects.sheet),
      audit,
      reason: audit.rects.sheet ? undefined : "sheet_not_visible",
    };
  }

  async function runTraining() {
    await ensureBrowse();
    clickTraining();
    await new Promise((r) => setTimeout(r, 1200));
    const audit = auditMobileLayout("training");
    document.querySelector(".training-top-back-btn")?.click();
    await new Promise((r) => setTimeout(r, 500));
    return { ok: audit.issues.length === 0, audit, reason: audit.issues[0] };
  }

  async function runGuestJoin() {
    await ensureBrowse();
    clickOpenTables();
    await new Promise((r) => setTimeout(r, 900));
    const join = Array.from(document.querySelectorAll("button")).find((b) =>
      /^join$|entrar/i.test((b.textContent || "").trim()),
    );
    if (!join) {
      document.querySelector(".open-tables-sheet-close")?.click();
      return { ok: false, reason: "no_join_button" };
    }
    join.click();
    await new Promise((r) => setTimeout(r, 4000));
    const view = document.querySelector(".game-interface-shell")?.getAttribute("data-lobby-view");
    const audit = auditMobileLayout("guest-join");
    const joined = view === "game" || view === "waiting";
    if (joined) {
      const resign = document.querySelector(
        ".profile-game-hud-resign, .profile-game-rail-resign, .damas3d-resign-btn, .game-bottom-left-btn",
      );
      resign?.click();
      await new Promise((r) => setTimeout(r, 500));
      Array.from(document.querySelectorAll("button"))
        .find((b) => /^(resign|desistir)$/i.test((b.textContent || "").trim()))
        ?.click();
      await new Promise((r) => setTimeout(r, 1200));
    } else {
      document.querySelector(".open-tables-sheet-close")?.click();
    }
    return {
      ok: joined && audit.issues.length === 0,
      view,
      audit,
      reason: joined ? undefined : "join_did_not_start_game",
    };
  }

  const lobby = auditMobileLayout("lobby");
  const openTables = await runOpenTables();
  const training = await runTraining();
  const guestJoin = await runGuestJoin();
  return { lobby, openTables, training, guestJoin };
};

async function loginAsGuest(page) {
  await page.evaluate(() => {
    sessionStorage.setItem("sol-ttt-devnet-warning-dismissed", "1");
  });
  const dismiss = page.getByRole("button", { name: /got it|entendi/i });
  if (await dismiss.count()) await dismiss.first().click();
  const guest = page.getByRole("button", { name: /guest|convidado|play as guest/i });
  if (await guest.count()) {
    await guest.first().click();
    await page.waitForSelector('.game-interface-shell[data-lobby-view="browse"]', {
      timeout: 15000,
    });
    await page.waitForTimeout(800);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const allResults = [];

  for (const device of DEVICES) {
    for (const orient of ["portrait", "landscape"]) {
      const w = orient === "portrait" ? device.w : device.h;
      const h = orient === "portrait" ? device.h : device.w;
      await page.setViewportSize({ width: w, height: h });
      await page.goto(BASE, { waitUntil: "networkidle", timeout: 60000 });
      await loginAsGuest(page);
      await page.waitForTimeout(450);
      const result = await page.evaluate(AUDIT_JS);
      if (!result?.lobby) {
        throw new Error(`Audit failed for ${device.name} ${orient}: ${JSON.stringify(result)}`);
      }
      allResults.push({
        device: device.name,
        orient,
        size: `${w}x${h}`,
        lobbyIssues: result.lobby.issues,
        profileH: result.lobby.rects.profile?.height ?? 0,
        openTablesOk: result.openTables.ok,
        openTablesIssues: result.openTables.audit?.issues ?? [result.openTables.reason],
        sheetLeft: result.openTables.audit?.rects?.sheet?.left,
        trainingOk: result.training.ok,
        trainingIssues: result.training.audit?.issues ?? [result.training.reason],
        guestJoinOk: result.guestJoin.ok,
        guestJoinView: result.guestJoin.view,
        guestJoinIssues: result.guestJoin.audit?.issues ?? [result.guestJoin.reason],
      });
    }
  }

  await browser.close();

  const failures = allResults.filter(
    (r) =>
      r.lobbyIssues.length ||
      !r.openTablesOk ||
      !r.trainingOk ||
      (r.guestJoinIssues?.length && r.guestJoinIssues[0] !== undefined && r.guestJoinIssues.some(Boolean)),
  );

  console.log(JSON.stringify(allResults, null, 2));
  console.log("\n--- SUMMARY ---");
  console.log(`Total viewports: ${allResults.length}`);
  console.log(`Failures: ${failures.length}`);
  for (const r of allResults) {
    const flags = [];
    if (r.lobbyIssues.length) flags.push(`lobby:${r.lobbyIssues.join(",")}`);
    if (!r.openTablesOk) flags.push(`openTables:${(r.openTablesIssues || []).join(",")}`);
    if (!r.trainingOk) flags.push(`training:${(r.trainingIssues || []).join(",")}`);
    if (!r.guestJoinOk) flags.push(`guestJoin:${r.guestJoinView}/${(r.guestJoinIssues || []).join(",")}`);
    console.log(`${r.device} ${r.orient} ${r.size} ${flags.length ? "FAIL " + flags.join(" | ") : "OK"}`);
  }

  process.exit(failures.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
