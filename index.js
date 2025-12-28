/* SiYuan Lock - SiYuan plugin (no-build single file) */
/* eslint-disable no-console */

const {
  Plugin,
  fetchSyncPost,
  showMessage,
  Dialog,
  Setting,
  getAllEditor,
} = require("siyuan");

let cryptoNode;
try {
  cryptoNode = require("crypto");
} catch {
  // Browser/mobile frontend won't have Node.js crypto.
}

const STORAGE_LOCKS = "locks";
const STORAGE_SETTINGS = "settings";
const LOCK_ICON_ID = "iconUiLockGuard";
const UNLOCK_ICON_ID = "iconUiLockGuardUnlock";
const SEARCH_SHOW_ICON_ID = "iconUiLockGuardEyeOpen";
const SEARCH_HIDE_ICON_ID = "iconUiLockGuardEyeClosed";
const SVG_NS = "http://www.w3.org/2000/svg";
const DEFAULT_SETTINGS = {
  autoLockEnabled: false,
  autoLockMinutes: 10,
  autoLockShowCountdown: false,
  autoLockPosition: "topbar",
  autoLockFloatX: null,
  autoLockFloatY: null,
  autoLockFloatXMobile: null,
  autoLockFloatYMobile: null,
  autoLockFloatByDevice: null,
  treeCountdownEnabled: true,
};
const TOUCH_LISTENER_OPTIONS = {capture: true, passive: false};
const DOC_SOURCE_TTL = 2500;

const LOCK_ICON_SVG = `<symbol id="${LOCK_ICON_ID}" viewBox="0 0 24 24">
  <path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z"/>
</symbol>`;
const UNLOCK_ICON_SVG = `<symbol id="${UNLOCK_ICON_ID}" viewBox="0 0 24 24">
  <path fill="currentColor" d="M18 8h-1V6a4 4 0 0 0-8 0h2a2 2 0 1 1 4 0v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2Zm0 10H6v-8h12v8Z"/>
</symbol>`;
const SEARCH_SHOW_ICON_SVG = `<symbol id="${SEARCH_SHOW_ICON_ID}" viewBox="0 0 24 24">
  <path fill="currentColor" d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"/>
</symbol>`;
const SEARCH_HIDE_ICON_SVG = `<symbol id="${SEARCH_HIDE_ICON_ID}" viewBox="0 0 24 24">
  <path fill="currentColor" d="M2.4 3.8 3.8 2.4 21.6 20.2 20.2 21.6l-3.1-3.1A11.7 11.7 0 0 1 12 19c-7 0-10-7-10-7a17.6 17.6 0 0 1 4.6-5.4L2.4 3.8Zm5.8 5.8a4 4 0 0 0 5.6 5.6L8.2 9.6ZM12 5a11.2 11.2 0 0 1 6.7 2.2l-2.1 2.1A4 4 0 0 0 10 10L7.9 7.9A11.8 11.8 0 0 1 12 5Zm8.9 5a17.6 17.6 0 0 1 1.1 2s-1.2 2.9-3.9 5.1l-2.2-2.2A6 6 0 0 0 18 12a6 6 0 0 0-.2-1.5l3.1-3.1Z"/>
</symbol>`;

function nowTs() {
  return Date.now();
}

function isValidId(id) {
  return typeof id === "string" && /^\d{14}-[a-z0-9]{7}$/i.test(id.trim());
}

function isMobileClient() {
  try {
    const cfg = globalThis?.siyuan?.config;
    if (cfg?.system?.isMobile || cfg?.system?.isTablet) return true;
    if (cfg?.appearance?.device === "mobile") return true;
  } catch {
    // ignore
  }
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
}

function clampInt(input, min, max, fallback) {
  const val = Number.parseInt(input, 10);
  if (Number.isFinite(val)) {
    if (typeof min === "number" && val < min) return min;
    if (typeof max === "number" && val > max) return max;
    return val;
  }
  return fallback;
}

function clampRatio(input) {
  const val = Number.parseFloat(input);
  if (!Number.isFinite(val)) return null;
  return Math.max(0, Math.min(1, val));
}

function normalizeDeviceKey(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function getDeviceKey() {
  const cfg = globalThis?.siyuan?.config;
  const candidates = [
    cfg?.system?.id,
    cfg?.system?.deviceId,
    cfg?.system?.device,
    cfg?.system?.name,
  ];
  let key = "";
  for (const candidate of candidates) {
    const normalized = normalizeDeviceKey(candidate);
    if (normalized) {
      key = normalized;
      break;
    }
  }
  if (!key) {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const platform = typeof navigator !== "undefined" ? navigator.platform : "";
    const screenSize =
      typeof screen !== "undefined" && screen.width && screen.height ? `${screen.width}x${screen.height}` : "";
    const dpr = typeof window !== "undefined" && window.devicePixelRatio ? `dpr${window.devicePixelRatio}` : "";
    const host = typeof location !== "undefined" ? location.host : "";
    key = [host, ua, platform, screenSize, dpr].filter(Boolean).join("|") || "unknown";
  }
  const mode = isMobileClient() ? "mobile" : "desktop";
  return `${mode}:${key}`;
}

function ensureDeviceFloatMap(settings) {
  if (!settings || typeof settings !== "object") return {};
  const map = settings.autoLockFloatByDevice;
  if (!map || typeof map !== "object" || Array.isArray(map)) {
    settings.autoLockFloatByDevice = {};
  }
  return settings.autoLockFloatByDevice;
}

function getFloatingBounds(width, height, margin = 8) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 120;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 32;
  const maxLeft = Math.max(margin, window.innerWidth - safeWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - safeHeight - margin);
  const minLeft = margin;
  const minTop = margin;
  const spanX = Math.max(0, maxLeft - minLeft);
  const spanY = Math.max(0, maxTop - minTop);
  return {minLeft, minTop, maxLeft, maxTop, spanX, spanY};
}

function ratioFromPosition(pos, min, span) {
  if (!Number.isFinite(pos)) return null;
  if (!Number.isFinite(span) || span <= 0) return 0;
  return (pos - min) / span;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/`/g, "&#96;");
}

function formatTime(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function formatDuration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

function getCountdownParts(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return {minutes, seconds};
}

function toBase64(bytes) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(str) {
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(str, "base64"));
  }
  const binary = atob(str);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function utf8Bytes(str) {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  if (typeof Buffer !== "undefined") {
    return Uint8Array.from(Buffer.from(str, "utf8"));
  }
  const out = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xff;
  return out;
}

function randomBytes(len) {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint8Array(len);
    globalThis.crypto.getRandomValues(buf);
    return buf;
  }
  if (cryptoNode?.randomBytes) {
    return Uint8Array.from(cryptoNode.randomBytes(len));
  }
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = Math.floor(Math.random() * 256);
  return out;
}

async function sha256(bytes) {
  if (globalThis.crypto?.subtle) {
    const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return new Uint8Array(hash);
  }
  if (cryptoNode?.createHash) {
    const hash = cryptoNode.createHash("sha256").update(Buffer.from(bytes)).digest();
    return Uint8Array.from(hash);
  }
  throw new Error("Crypto not available");
}

async function hashSecret(secret, saltBase64) {
  const salt = saltBase64 ? fromBase64(saltBase64) : randomBytes(16);
  const secretBytes = utf8Bytes(String(secret || ""));
  const merged = new Uint8Array(salt.length + secretBytes.length);
  merged.set(salt, 0);
  merged.set(secretBytes, salt.length);
  const digest = await sha256(merged);
  return {
    salt: toBase64(salt),
    hash: toBase64(digest),
  };
}

function makeLockKey(type, id) {
  return `${type}:${id}`;
}

function extractDocIdFromPath(path) {
  if (!path) return "";
  const match = String(path).match(/(?:^|[\\/])(\d{14}-[a-z0-9]{7})\.(?:syx|sy)$/i);
  return match ? match[1] : "";
}

function isHistoryPath(path) {
  if (!path) return false;
  return /[\\/]history[\\/]/i.test(String(path));
}

function getDocIdFromSearchItem(item) {
  if (!item) return "";
  const rootId = item.getAttribute?.("data-root-id") || item.dataset?.rootId;
  if (isValidId(rootId)) return rootId.trim();
  const docId = item.getAttribute?.("data-doc-id") || item.dataset?.docId;
  if (isValidId(docId)) return docId.trim();
  const nodeId = item.getAttribute?.("data-node-id") || item.dataset?.nodeId;
  if (isValidId(nodeId)) return nodeId.trim();
  return findAttrId(item);
}

function getDocIdFromHistoryItem(item) {
  if (!item) return "";
  const path = item.getAttribute?.("data-path") || item.dataset?.path;
  const fromPath = extractDocIdFromPath(path);
  if (isValidId(fromPath)) return fromPath.trim();
  const rootId = item.getAttribute?.("data-root-id") || item.dataset?.rootId;
  if (isValidId(rootId)) return rootId.trim();
  const nodeId = item.getAttribute?.("data-node-id") || item.dataset?.nodeId;
  if (isValidId(nodeId)) return nodeId.trim();
  return findAttrId(item);
}

function getNotebookIdFromHistoryItem(item) {
  if (!item) return "";
  const attrs = [
    item.getAttribute?.("data-notebook-id"),
    item.getAttribute?.("data-notebook"),
    item.getAttribute?.("data-box"),
    item.getAttribute?.("data-box-id"),
    item.getAttribute?.("data-boxid"),
  ];
  for (const value of attrs) {
    if (isValidId(value)) return value.trim();
  }
  return "";
}

function pickSearchListContainer() {
  return (
    document.querySelector("#searchList") ||
    document.querySelector(".search__list") ||
    document.querySelector(".search__result") ||
    document.querySelector(".search__panel .b3-list")
  );
}

function pickSearchPreviewHost() {
  return (
    document.querySelector("#searchPreview") ||
    document.querySelector(".search__preview.protyle") ||
    document.querySelector(".search__preview")
  );
}

function getSearchPanelRoot(searchList, searchPreview) {
  const selector =
    ".search__panel, .search__root, .search, #modelMain, .side-panel__all, .side-panel, .b3-dialog, .fn__flex-column";
  return (
    searchList?.closest?.(selector) ||
    searchPreview?.closest?.(selector) ||
    searchList?.parentElement ||
    searchPreview?.parentElement ||
    null
  );
}

function pickSearchToolbar() {
  const searchList = pickSearchListContainer();
  const searchPreview = pickSearchPreviewHost();
  const root = getSearchPanelRoot(searchList, searchPreview);
  const scopes = [root, document].filter(Boolean);
  const desktopSelectors = [
    ".search__header .block__icons",
    ".b3-form__icon.search__header .block__icons",
  ];
  for (const scope of scopes) {
    for (const sel of desktopSelectors) {
      const foundList = Array.from(scope.querySelectorAll(sel));
      const visible = foundList.filter((el) => !isHiddenByClass(el) && isElementVisible(el));
      if (visible.length) return visible[0];
    }
  }
  const mobileSelectors = [".toolbar"];
  for (const scope of scopes) {
    for (const sel of mobileSelectors) {
      const foundList = Array.from(scope.querySelectorAll(sel));
      const candidates = foundList.filter(
        (el) => el.querySelector(".toolbar__icon") && !isHiddenByClass(el) && isElementVisible(el),
      );
      const picked = pickNearestFollowing(candidates, searchList) || candidates[0];
      if (picked) return picked;
    }
  }
  return null;
}

function isHiddenByClass(el) {
  if (!el || !el.classList) return false;
  return el.classList.contains("fn__none") || el.classList.contains("fn__hidden");
}

function findClosestByAttr(target, attr) {
  if (!target) return null;
  if (typeof target.closest === "function") {
    const found = target.closest(`[${attr}]`);
    if (found) return found;
  }
  let node = target;
  while (node) {
    if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute(attr)) return node;
    node = node.parentNode;
  }
  return null;
}

function isElementVisible(el) {
  if (!el) return false;
  if (el.offsetParent !== null) return true;
  if (typeof el.getClientRects === "function") {
    return el.getClientRects().length > 0;
  }
  return false;
}

function pickNearestFollowing(candidates, anchor) {
  if (!candidates.length) return null;
  const ordered = candidates.slice().sort((a, b) => {
    if (a === b) return 0;
    const pos = a.compareDocumentPosition(b);
    if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
    return 0;
  });
  if (!anchor) return ordered[0];
  const after = ordered.filter((node) => anchor.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING);
  return after[0] || ordered[0];
}

function getSearchToolbarMode(toolbar) {
  if (!toolbar) return "block";
  if (toolbar.classList.contains("block__icons")) return "block";
  if (toolbar.classList.contains("toolbar")) return "toolbar";
  if (toolbar.querySelector(".block__icon")) return "block";
  if (toolbar.querySelector(".toolbar__icon")) return "toolbar";
  return "block";
}

function pickSearchToggleSample(toolbar, mode) {
  if (!toolbar) return null;
  if (mode === "toolbar") {
    return toolbar.querySelector("svg.toolbar__icon") || toolbar.querySelector("svg");
  }
  return toolbar.querySelector(".block__icon");
}

function insertSearchToggle(toolbar, btn, mode) {
  if (!toolbar || !btn) return;
  if (mode === "block" && toolbar.querySelector(".fn__space")) {
    let space = btn.__uiLockGuardSpace;
    if (!space || !space.classList?.contains("fn__space")) {
      space = document.createElement("span");
      space.className = "fn__space";
      btn.__uiLockGuardSpace = space;
    }
    toolbar.appendChild(space);
  }
  toolbar.appendChild(btn);
}

function stripSearchToggleAttributes(btn) {
  if (!btn) return;
  const removeAttrs = [
    "id",
    "title",
    "data-type",
    "data-action",
    "data-menu",
    "data-position",
    "data-title",
    "data-target-id",
    "data-node-id",
    "data-doc-id",
    "data-url",
    "data-path",
    "data-href",
    "data-uid",
    "href",
    "disabled",
    "aria-disabled",
    "aria-pressed",
    "aria-selected",
    "aria-expanded",
    "aria-haspopup",
    "aria-current",
    "aria-label",
  ];
  for (const attr of removeAttrs) btn.removeAttribute(attr);
  const datasetKeys = [
    "type",
    "action",
    "menu",
    "position",
    "title",
    "targetId",
    "nodeId",
    "docId",
    "url",
    "path",
    "uid",
    "id",
  ];
  for (const key of datasetKeys) {
    if (btn.dataset && Object.prototype.hasOwnProperty.call(btn.dataset, key)) delete btn.dataset[key];
  }
  btn
    .querySelectorAll("[data-type],[data-action],[data-menu],[data-target-id],[data-node-id],[data-doc-id],[data-url],[data-path],[data-id]")
    .forEach((node) => {
      node.removeAttribute("data-type");
      node.removeAttribute("data-action");
      node.removeAttribute("data-menu");
      node.removeAttribute("data-target-id");
      node.removeAttribute("data-node-id");
      node.removeAttribute("data-doc-id");
      node.removeAttribute("data-url");
      node.removeAttribute("data-path");
      node.removeAttribute("data-id");
    });
}

function syncSearchToggleIcon(btn, iconId) {
  if (!btn) return;
  let svg = null;
  if (btn.tagName && btn.tagName.toLowerCase() === "svg") {
    svg = btn;
  } else {
    svg = btn.querySelector("svg");
  }
  if (!svg) {
    svg = document.createElementNS(SVG_NS, "svg");
    if (btn.__uiLockGuardSvgClass) svg.setAttribute("class", btn.__uiLockGuardSvgClass);
    btn.textContent = "";
    btn.appendChild(svg);
  }
  svg.innerHTML = `<use xlink:href="#${iconId}"></use>`;
}

function pickHistoryListContainer() {
  const item = document.querySelector("li.b3-list-item[data-type='doc'][data-path]");
  const path = item?.getAttribute?.("data-path") || item?.dataset?.path;
  if (item && isHistoryPath(path)) {
    const panel = item.closest(".history__panel, .history, .b3-dialog, .fn__flex");
    const explicit =
      item.closest("ul.history__side") ||
      panel?.querySelector?.("ul.history__side") ||
      panel?.querySelector?.("ul.b3-list.history__side");
    if (explicit) return explicit;
    let current = item.closest("ul");
    let candidate = current;
    while (current) {
      if (current.classList?.contains("history__side")) {
        candidate = current;
        break;
      }
      const docCount = current.querySelectorAll("li.b3-list-item[data-type='doc'][data-path]").length;
      if (docCount > 1 || current.classList?.contains("b3-list")) {
        candidate = current;
      }
      const parentUl = current.parentElement?.closest?.("ul");
      if (!parentUl) break;
      if (panel && !panel.contains(parentUl)) break;
      current = parentUl;
    }
    return candidate || item.closest("ul") || item.parentElement;
  }
  return (
    document.querySelector(".history__side") ||
    document.querySelector(".history__list") ||
    document.querySelector(".history__repo")
  );
}

function pickHistoryPreviewHost() {
  return (
    document.querySelector(".history__text.protyle") ||
    document.querySelector(".history__text [data-type='docPanel']") ||
    document.querySelector("[data-type='docPanel'].history__text")
  );
}

function findFocusedListItem(container, itemSelector) {
  if (!container) return null;
  const selectors = [
    `${itemSelector}.b3-list-item--focus`,
    `${itemSelector}.b3-list-item--selected`,
    `${itemSelector}.b3-list-item--current`,
    `${itemSelector}[aria-current='true']`,
  ];
  for (const sel of selectors) {
    const item = container.querySelector(sel);
    if (item) return item;
  }
  return container.querySelector(itemSelector);
}

function findAttrId(el) {
  if (!el || typeof el.getAttribute !== "function") return "";
  const attrs = [
    "data-node-id",
    "data-id",
    "data-doc-id",
    "data-root-id",
    "data-box",
    "data-url",
    "data-notebook-id",
    "data-notebook",
    "data-box-id",
    "data-boxid",
  ];
  for (const attr of attrs) {
    const v = el.getAttribute(attr);
    if (isValidId(v)) return v.trim();
  }
  if (el.dataset) {
    for (const v of Object.values(el.dataset)) {
      if (isValidId(v)) return v.trim();
    }
  }
  if (isValidId(el.id)) return el.id.trim();
  return "";
}

function findTitleFromTree(el) {
  if (!el) return "";
  const textEl =
    el.querySelector(".b3-list-item__text") ||
    el.querySelector(".b3-list-item__title") ||
    el.querySelector(".b3-list-item__name") ||
    el.querySelector(".b3-list-item__label") ||
    el.querySelector(".b3-list-item__content");
  const title = textEl?.textContent?.trim();
  if (title) return title;
  const fallback = el.textContent?.trim();
  return fallback || "";
}

function resolveTreeItemInfo(item) {
  if (!item) return {id: "", isNotebook: false};
  const dataType = item.getAttribute?.("data-type") || item.dataset?.type || "";
  const typeLower = String(dataType).toLowerCase();
  const notebookTypes = new Set(["notebook", "navigation-root"]);
  const docTypes = new Set(["navigation-file", "navigation-doc", "navigation-folder", "doc", "file"]);
  let isNotebook = notebookTypes.has(typeLower);
  const isDocType = docTypes.has(typeLower);
  const nextSibling = item.nextElementSibling;
  const parentList =
    item.closest?.(
      "ul[data-url], ul[data-box], ul[data-box-id], ul[data-boxid], ul[data-notebook-id], ul[data-notebook]",
    ) || item.parentElement?.closest?.(
      "ul[data-url], ul[data-box], ul[data-box-id], ul[data-boxid], ul[data-notebook-id], ul[data-notebook]",
    );
  const urlFromSelf = item.getAttribute?.("data-url") || item.dataset?.url;
  const urlFromNext = nextSibling?.getAttribute?.("data-url") || nextSibling?.dataset?.url;
  const urlFromParent = parentList?.getAttribute?.("data-url") || parentList?.dataset?.url;
  const docAttrs = ["data-node-id", "data-id", "data-doc-id", "data-root-id"];
  let docAttrValue = "";
  for (const attr of docAttrs) {
    const value = item.getAttribute?.(attr);
    if (isValidId(value)) {
      docAttrValue = value;
      break;
    }
  }
  if (!docAttrValue) {
    const docChild = item.querySelector?.("[data-node-id], [data-id], [data-doc-id], [data-root-id]");
    const childId = findAttrId(docChild);
    if (isValidId(childId)) docAttrValue = childId;
  }
  const hasDocAttr = isValidId(docAttrValue);
  const notebookAttrs = [
    "data-box",
    "data-box-id",
    "data-boxid",
    "data-notebook-id",
    "data-notebook",
  ];
  let notebookAttrValue = "";
  for (const attr of notebookAttrs) {
    const value = item.getAttribute?.(attr);
    if (isValidId(value)) {
      notebookAttrValue = value;
      break;
    }
  }
  if (!notebookAttrValue) {
    const parentValues = [
      urlFromParent,
      parentList?.getAttribute?.("data-box"),
      parentList?.getAttribute?.("data-box-id"),
      parentList?.getAttribute?.("data-boxid"),
      parentList?.getAttribute?.("data-notebook-id"),
      parentList?.getAttribute?.("data-notebook"),
    ];
    for (const value of parentValues) {
      if (isValidId(value)) {
        notebookAttrValue = value;
        break;
      }
    }
  }

  if (isValidId(notebookAttrValue)) {
    isNotebook = true;
  }
  if (
    !isNotebook &&
    !isDocType &&
    !hasDocAttr &&
    (isValidId(urlFromSelf) || isValidId(urlFromNext) || isValidId(urlFromParent))
  ) {
    isNotebook = true;
  }
  if (isDocType || hasDocAttr) isNotebook = false;

  let id = "";
  if (isNotebook) {
    if (isValidId(notebookAttrValue)) id = notebookAttrValue.trim();
    else if (isValidId(urlFromSelf)) id = urlFromSelf.trim();
    else if (isValidId(urlFromNext)) id = urlFromNext.trim();
    else if (isValidId(urlFromParent)) id = urlFromParent.trim();
    else if (isValidId(docAttrValue)) id = docAttrValue.trim();
  } else if (isValidId(docAttrValue)) {
    id = docAttrValue.trim();
  }
  if (!id) id = findAttrId(item);

  return {id, isNotebook};
}

function pickDocTreeContainer() {
  const navItem = document.querySelector(
    ".b3-list-item[data-type^='navigation'], .b3-list-item[data-type*='navigation'], .b3-list-item[data-type='notebook']",
  );
  if (navItem) {
    return (
      navItem.closest(".file-tree") ||
      navItem.closest(".b3-list") ||
      navItem.closest(".b3-list--tree") ||
      navItem.parentElement
    );
  }
  const anyItem = document.querySelector(
    ".b3-list-item[data-node-id], .b3-list-item[data-id], .b3-list-item[data-doc-id], .b3-list-item[data-notebook-id], .b3-list-item[data-url]",
  );
  if (anyItem) {
    return anyItem.closest(".b3-list") || anyItem.parentElement;
  }
  const selectors = [
    "#dockFileTree",
    "#file-tree",
    "#fileTree",
    ".file-tree",
    ".file-tree__list",
    ".b3-list--tree",
    ".b3-list--background",
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function isProbablyDocTreeItem(item) {
  if (!item) return false;
  if (item.closest?.("[data-ui-lock-guard-tree='1']")) return true;
  const dataType = item.getAttribute?.("data-type") || item.dataset?.type || "";
  if (String(dataType).toLowerCase().includes("navigation")) return true;
  const container = item.closest(
    "#dockFileTree, #file-tree, #fileTree, .file-tree, .file-tree__list, .b3-list--tree, .b3-list--background, .b3-list",
  );
  return Boolean(container);
}

function resolveDetailId(detail) {
  const candidates = [
    detail?.id,
    detail?.box,
    detail?.boxId,
    detail?.notebookId,
    detail?.data?.id,
    detail?.data?.box,
    detail?.data?.boxId,
  ];
  for (const value of candidates) {
    if (isValidId(value)) return String(value).trim();
  }
  return "";
}

function createPatternPad(container, options) {
  const {mode, minLen = 0, onComplete, onStatus} = options || {};
  const minRequired = Number.isFinite(minLen) && minLen > 0 ? minLen : 0;
  const dots = Array.from(container.querySelectorAll(".ui-lock-guard__pattern-dot"));
  const svg = container.querySelector(".ui-lock-guard__pattern-line");
  let path = svg?.querySelector("path");
  if (!path && svg) {
    path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--b3-theme-primary)");
    path.setAttribute("stroke-width", "4");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
  }

  let active = false;
  let pointerId = null;
  let firstPattern = "";
  let confirmed = false;
  let selection = [];

  const setStatus = (msg) => {
    if (typeof onStatus === "function") onStatus(msg);
  };

  const resetVisuals = () => {
    selection = [];
    dots.forEach((dot) => dot.classList.remove("is-active"));
    if (path) path.setAttribute("d", "");
  };

  const getRect = () => container.getBoundingClientRect();

  const getDotCenter = (dot, rect) => {
    const r = dot.getBoundingClientRect();
    return {
      x: r.left - rect.left + r.width / 2,
      y: r.top - rect.top + r.height / 2,
    };
  };

  const findDotAt = (clientX, clientY) => {
    for (const dot of dots) {
      const r = dot.getBoundingClientRect();
      const x = clientX - r.left;
      const y = clientY - r.top;
      const radius = r.width * 0.6;
      if (x >= -radius && x <= r.width + radius && y >= -radius && y <= r.height + radius) {
        return dot;
      }
    }
    return null;
  };

  const buildPath = (tailPoint) => {
    if (!path) return;
    const rect = getRect();
    const points = selection.map((dot) => getDotCenter(dot, rect));
    if (tailPoint) points.push(tailPoint);
    if (points.length === 0) {
      path.setAttribute("d", "");
      return;
    }
    const d = points
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(" ");
    path.setAttribute("d", d);
  };

  const addDot = (dot) => {
    if (!dot || selection.includes(dot)) return;
    selection.push(dot);
    dot.classList.add("is-active");
  };

  const releasePointer = () => {
    if (pointerId === null) return;
    container.releasePointerCapture?.(pointerId);
    pointerId = null;
  };

  const resetStroke = () => {
    active = false;
    releasePointer();
    resetVisuals();
  };

  const finalize = () => {
    if (!selection.length) return;
    const pattern = selection.map((dot) => dot.getAttribute("data-index")).join("-");
    if (minRequired > 0 && selection.length < minRequired) {
      setStatus("pattern-too-short");
      resetStroke();
      return;
    }
    if (mode === "set") {
      if (confirmed) return;
      if (!firstPattern) {
        firstPattern = pattern;
        setStatus("draw-again");
        resetStroke();
        return;
      }
      if (firstPattern !== pattern) {
        setStatus("pattern-mismatch");
        firstPattern = "";
        resetStroke();
        return;
      }
      confirmed = true;
      setStatus("pattern-confirmed");
      if (typeof onComplete === "function") onComplete(pattern);
      resetStroke();
      return;
    }
    if (mode === "verify") {
      if (typeof onComplete === "function") onComplete(pattern);
      resetStroke();
    }
  };

  const onPointerDown = (event) => {
    if (confirmed && mode === "set") return;
    if (event.cancelable) event.preventDefault();
    if (active || pointerId !== null) {
      resetStroke();
    }
    active = true;
    pointerId = event.pointerId;
    container.setPointerCapture?.(pointerId);
    resetVisuals();
    if (mode === "set") {
      setStatus(firstPattern ? "draw-again" : "");
    }
    const dot = findDotAt(event.clientX, event.clientY);
    if (dot) addDot(dot);
    buildPath();
  };

  const onPointerMove = (event) => {
    if (!active) return;
    if (pointerId !== null && event.pointerId !== pointerId) return;
    if (event.cancelable) event.preventDefault();
    const dot = findDotAt(event.clientX, event.clientY);
    if (dot) addDot(dot);
    const rect = getRect();
    const tailPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    buildPath(tailPoint);
  };

  const onPointerUp = (event) => {
    if (!active) return;
    if (pointerId !== null && event.pointerId !== pointerId) return;
    active = false;
    releasePointer();
    buildPath();
    finalize();
  };

  const onPointerCancel = (event) => {
    if (!active) return;
    if (pointerId !== null && event.pointerId !== pointerId) return;
    resetStroke();
    buildPath();
  };

  container.addEventListener("pointerdown", onPointerDown);
  container.addEventListener("pointermove", onPointerMove);
  container.addEventListener("pointerup", onPointerUp);
  container.addEventListener("pointercancel", onPointerCancel);
  container.addEventListener("lostpointercapture", onPointerCancel);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);

  return () => {
    container.removeEventListener("pointerdown", onPointerDown);
    container.removeEventListener("pointermove", onPointerMove);
    container.removeEventListener("pointerup", onPointerUp);
    container.removeEventListener("pointercancel", onPointerCancel);
    container.removeEventListener("lostpointercapture", onPointerCancel);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerCancel);
  };
}

class UiLockGuardPlugin extends Plugin {
  constructor(options) {
    super(options);
    this.locks = [];
    this.settings = {...DEFAULT_SETTINGS};
    this.sessionUnlocks = new Set();
    this.trustTimers = new Map();
    this.protyleOverlays = new Map();
    this.docToNotebookCache = new Map();
    this.docTreeContainer = null;
    this.docTreeObserver = null;
    this.docTreeBindTimer = null;
    this.docTreeRefreshTimer = null;
    this.globalTreeListeners = false;
    this.searchListContainer = null;
    this.searchObserver = null;
    this.searchBindTimer = null;
    this.searchRefreshTimer = null;
    this.searchRefreshToken = 0;
    this.searchPanelActive = false;
    this.historyListContainer = null;
    this.historyObserver = null;
    this.historyBindTimer = null;
    this.historyRefreshTimer = null;
    this.docOpenSources = new Map();
    this.searchToggleEl = null;
    this.searchHideLockedEnabled = false;
    this.searchHiddenCount = 0;
    this.searchToggleNoticePending = false;
    this.searchToggleListenerBound = false;
    this.autoLockTimer = null;
    this.autoLockTick = null;
    this.autoLockTriggered = false;
    this.lastActivity = nowTs();
    this.topBarCountdown = null;
    this.topBarCountdownText = null;
    this.countdownFloating = null;
    this.countdownFloatingText = null;
    this.setting = null;
    this.settingLockTick = null;
    this.treeTrustTick = null;
    this.settingEls = {
      autoEnable: null,
      autoMinutes: null,
      autoCountdown: null,
      lockListWrap: null,
    };
    this.patternCleanup = null;
    this.lastNotebookUnlock = {id: "", time: 0};
  }

  t(key, params = {}) {
    const raw = (this.i18n && this.i18n[key]) || key;
    return raw.replace(/\{\{(\w+)\}\}/g, (m, name) => {
      if (Object.prototype.hasOwnProperty.call(params, name)) return String(params[name]);
      return "";
    });
  }

  onload() {
    this.addIcons(LOCK_ICON_SVG + UNLOCK_ICON_SVG + SEARCH_SHOW_ICON_SVG + SEARCH_HIDE_ICON_SVG);
    this.initSettingPanel();
    this.bindDocTreeLater();
    this.bindSearchLater();
    this.bindSearchToggleListener();
    this.bindHistoryLater();

    this.eventBus.on("open-menu-doctree", this.onDocTreeMenu);
    this.eventBus.on("switch-protyle", this.onSwitchProtyle);
    this.eventBus.on("loaded-protyle-static", this.onLoadedProtyle);
    this.eventBus.on("loaded-protyle-dynamic", this.onLoadedProtyle);

    void this.loadState();
  }

  onunload() {
    this.eventBus.off("open-menu-doctree", this.onDocTreeMenu);
    this.eventBus.off("switch-protyle", this.onSwitchProtyle);
    this.eventBus.off("loaded-protyle-static", this.onLoadedProtyle);
    this.eventBus.off("loaded-protyle-dynamic", this.onLoadedProtyle);

    this.stopAutoLock();
    this.stopSettingLockTick();
    this.stopTreeTrustTick();
    if (this.docTreeBindTimer) {
      clearInterval(this.docTreeBindTimer);
      this.docTreeBindTimer = null;
    }
    if (this.docTreeRefreshTimer) {
      clearTimeout(this.docTreeRefreshTimer);
      this.docTreeRefreshTimer = null;
    }
    this.detachDocTree();
    this.unbindGlobalDocTreeListeners();
    if (this.searchBindTimer) {
      clearInterval(this.searchBindTimer);
      this.searchBindTimer = null;
    }
    if (this.searchRefreshTimer) {
      clearTimeout(this.searchRefreshTimer);
      this.searchRefreshTimer = null;
    }
    this.unbindSearchToggleListener();
    if (this.historyBindTimer) {
      clearInterval(this.historyBindTimer);
      this.historyBindTimer = null;
    }
    if (this.historyRefreshTimer) {
      clearTimeout(this.historyRefreshTimer);
      this.historyRefreshTimer = null;
    }
    this.detachSearchList();
    this.detachHistoryList();
    this.docOpenSources.clear();
    this.clearDocTreeMarks();
    this.clearAllOverlays();
    this.clearTrustTimers();

    if (this.topBarCountdown) {
      this.topBarCountdown.remove();
    }
    if (this.countdownFloating) {
      this.countdownFloating.remove();
    }
  }

  async uninstall() {
    await this.removeData(STORAGE_LOCKS);
    await this.removeData(STORAGE_SETTINGS);
  }

  async loadState() {
    const locks = (await this.loadData(STORAGE_LOCKS)) || [];
    const settings = (await this.loadData(STORAGE_SETTINGS)) || {};
    this.locks = Array.isArray(locks) ? locks : [];
    this.settings = {
      ...DEFAULT_SETTINGS,
      autoLockEnabled: !!settings.autoLockEnabled,
      autoLockMinutes: clampInt(settings.autoLockMinutes, 1, 1440, DEFAULT_SETTINGS.autoLockMinutes),
      autoLockShowCountdown: !!settings.autoLockShowCountdown,
      autoLockPosition: settings.autoLockPosition === "floating" ? "floating" : "topbar",
      autoLockFloatX: Number.isFinite(settings.autoLockFloatX) ? settings.autoLockFloatX : DEFAULT_SETTINGS.autoLockFloatX,
      autoLockFloatY: Number.isFinite(settings.autoLockFloatY) ? settings.autoLockFloatY : DEFAULT_SETTINGS.autoLockFloatY,
      autoLockFloatXMobile: Number.isFinite(settings.autoLockFloatXMobile)
        ? settings.autoLockFloatXMobile
        : DEFAULT_SETTINGS.autoLockFloatXMobile,
      autoLockFloatYMobile: Number.isFinite(settings.autoLockFloatYMobile)
        ? settings.autoLockFloatYMobile
        : DEFAULT_SETTINGS.autoLockFloatYMobile,
      autoLockFloatByDevice:
        settings.autoLockFloatByDevice &&
        typeof settings.autoLockFloatByDevice === "object" &&
        !Array.isArray(settings.autoLockFloatByDevice)
          ? settings.autoLockFloatByDevice
          : {},
      treeCountdownEnabled:
        typeof settings.treeCountdownEnabled === "boolean"
          ? settings.treeCountdownEnabled
          : DEFAULT_SETTINGS.treeCountdownEnabled,
    };

    this.normalizeLocks();
    this.scheduleAllTrustTimers();
    this.refreshDocTreeMarks();
    this.collapseLockedNotebooks();
    this.refreshAllProtyles();
    this.applyAutoLockSettings();
    this.renderSettingLockList();
    this.syncSettingInputs();
  }

  normalizeLocks() {
    this.locks = this.locks
      .map((lock) => ({
        id: lock.id || "",
        type: lock.type === "notebook" ? "notebook" : "doc",
        title: lock.title || "",
        lockType: lock.lockType === "pattern" ? "pattern" : "password",
        salt: lock.salt || "",
        hash: lock.hash || "",
        policy: lock.policy === "trust" ? "trust" : "always",
        trustMinutes: clampInt(lock.trustMinutes, 1, 1440, 30),
        trustUntil: clampInt(lock.trustUntil, 0, Number.MAX_SAFE_INTEGER, 0),
        createdAt: clampInt(lock.createdAt, 0, Number.MAX_SAFE_INTEGER, nowTs()),
        updatedAt: clampInt(lock.updatedAt, 0, Number.MAX_SAFE_INTEGER, nowTs()),
      }))
      .filter((lock) => isValidId(lock.id));
  }

  async saveLocks() {
    await this.saveData(STORAGE_LOCKS, this.locks);
  }

  async saveSettings() {
    await this.saveData(STORAGE_SETTINGS, this.settings);
  }

  getLock(type, id) {
    return this.locks.find((lock) => lock.type === type && lock.id === id) || null;
  }

  getLockByKey(key) {
    if (!key) return null;
    const [type, id] = key.split(":");
    if (!type || !id) return null;
    return this.getLock(type, id);
  }

  hasLock(id) {
    return this.locks.some((lock) => lock.id === id);
  }

  isLockedNow(lock) {
    if (!lock) return false;
    if (lock.policy === "trust") {
      return !(lock.trustUntil && lock.trustUntil > nowTs());
    }
    return !this.sessionUnlocks.has(makeLockKey(lock.type, lock.id));
  }

  async resolveDocLockState(docId, options = {}) {
    if (!isValidId(docId)) {
      return {locked: false, lock: null, reason: ""};
    }
    const directLock = this.getLock("doc", docId);
    const hasDirectLock = Boolean(directLock);
    const directLocked = directLock ? this.isLockedNow(directLock) : false;
    const preferNotebook = options.preferNotebook === true || options.source === "tree";

    let notebookId = "";
    let notebookLock = null;
    let notebookTitle = "";
    if (preferNotebook || !hasDirectLock) {
      const notebookHint = options.notebookId;
      if (isValidId(notebookHint)) {
        notebookId = notebookHint.trim();
        this.docToNotebookCache.set(docId, notebookId);
      } else {
        notebookId = await this.getNotebookIdForDoc(docId);
      }
      if (isValidId(notebookId)) {
        const candidate = this.getLock("notebook", notebookId);
        if (candidate && this.isLockedNow(candidate)) {
          notebookLock = candidate;
          notebookTitle = candidate.title || notebookId;
        }
      }
    }

    if (preferNotebook && notebookLock) {
      return {
        locked: true,
        lock: notebookLock,
        reason: "notebook",
        notebookId,
        notebookTitle,
        docLock: directLock,
        notebookLock,
      };
    }
    if (directLocked) {
      return {
        locked: true,
        lock: directLock,
        reason: "doc",
        notebookId,
        notebookTitle,
        docLock: directLock,
        notebookLock,
      };
    }
    if (notebookLock) {
      return {
        locked: true,
        lock: notebookLock,
        reason: "notebook",
        notebookId,
        notebookTitle,
        docLock: directLock,
        notebookLock,
      };
    }
    return {
      locked: false,
      lock: directLock,
      reason: directLock ? "doc" : "",
      notebookId,
      notebookTitle,
      docLock: directLock,
      notebookLock,
    };
  }

  async getNotebookIdForDoc(docId) {
    if (!isValidId(docId)) return "";
    if (this.docToNotebookCache.has(docId)) return this.docToNotebookCache.get(docId);
    try {
      const resp = await fetchSyncPost("/api/query/sql", {
        stmt: `SELECT box FROM blocks WHERE id='${docId}' LIMIT 1`,
      });
      if (resp && resp.code === 0 && Array.isArray(resp.data) && resp.data[0]?.box) {
        const box = resp.data[0].box;
        if (isValidId(box)) {
          this.docToNotebookCache.set(docId, box);
          return box;
        }
      }
    } catch (err) {
      console.error(err);
    }
    return "";
  }

  async getDocTitle(docId) {
    if (!isValidId(docId)) return "";
    try {
      const resp = await fetchSyncPost("/api/query/sql", {
        stmt: `SELECT content FROM blocks WHERE id='${docId}' LIMIT 1`,
      });
      if (resp && resp.code === 0 && Array.isArray(resp.data) && resp.data[0]?.content) {
        return String(resp.data[0].content || "");
      }
    } catch (err) {
      console.error(err);
    }
    return "";
  }

  scheduleAllTrustTimers() {
    this.clearTrustTimers();
    for (const lock of this.locks) {
      this.scheduleTrustTimer(lock);
    }
  }

  scheduleTrustTimer(lock) {
    if (!lock || lock.policy !== "trust") return;
    const key = makeLockKey(lock.type, lock.id);
    const existing = this.trustTimers.get(key);
    if (existing) clearTimeout(existing);
    if (!lock.trustUntil) return;
    const delay = lock.trustUntil - nowTs();
    if (delay <= 0) {
      void this.expireTrust(lock);
      return;
    }
    const timer = setTimeout(() => void this.expireTrust(lock), delay);
    this.trustTimers.set(key, timer);
  }

  clearTrustTimers() {
    for (const timer of this.trustTimers.values()) {
      clearTimeout(timer);
    }
    this.trustTimers.clear();
  }

  async expireTrust(lock) {
    if (!lock || lock.policy !== "trust") return;
    lock.trustUntil = 0;
    lock.updatedAt = nowTs();
    await this.saveLocks();
    this.refreshDocTreeMarks();
    this.refreshAllProtyles();
    this.renderSettingLockList();
    if (lock.type === "notebook") {
      this.collapseNotebookInTree(lock.id);
    }
  }

  bindDocTreeLater() {
    if (this.docTreeBindTimer) clearInterval(this.docTreeBindTimer);
    const keepWatching = !cryptoNode;
    const intervalMs = keepWatching ? 1200 : 800;
    this.docTreeBindTimer = setInterval(() => {
      const attached = this.attachDocTree({skipRefresh: keepWatching});
      if (attached && !keepWatching) {
        clearInterval(this.docTreeBindTimer);
        this.docTreeBindTimer = null;
        this.unbindGlobalDocTreeListeners();
        return;
      }
      if (attached) {
        this.unbindGlobalDocTreeListeners();
      } else {
        this.bindGlobalDocTreeListeners();
      }
      this.refreshDocTreeMarks();
      this.collapseLockedNotebooks();
    }, intervalMs);
  }

  attachDocTree({skipRefresh = false} = {}) {
    const container = pickDocTreeContainer();
    if (!container) return false;
    if (container === this.docTreeContainer && this.docTreeContainer?.isConnected) return false;
    this.detachDocTree();
    this.docTreeContainer = container;
    this.docTreeContainer.setAttribute("data-ui-lock-guard-tree", "1");
    this.docTreeContainer.addEventListener("pointerdown", this.onDocTreePointerDown, true);
    this.docTreeContainer.addEventListener("mousedown", this.onDocTreeMouseDown, true);
    this.docTreeContainer.addEventListener("touchstart", this.onDocTreeTouchStart, TOUCH_LISTENER_OPTIONS);
    this.docTreeContainer.addEventListener("click", this.onDocTreeClick, true);
    this.docTreeObserver = new MutationObserver(() => this.scheduleDocTreeRefresh());
    this.docTreeObserver.observe(this.docTreeContainer, {childList: true, subtree: true});
    if (!skipRefresh) {
      this.refreshDocTreeMarks();
      this.collapseLockedNotebooks();
    }
    return true;
  }

  detachDocTree() {
    if (this.docTreeContainer) {
      this.docTreeContainer.removeAttribute("data-ui-lock-guard-tree");
      this.docTreeContainer.removeEventListener("pointerdown", this.onDocTreePointerDown, true);
      this.docTreeContainer.removeEventListener("mousedown", this.onDocTreeMouseDown, true);
      this.docTreeContainer.removeEventListener("touchstart", this.onDocTreeTouchStart, true);
      this.docTreeContainer.removeEventListener("click", this.onDocTreeClick, true);
    }
    if (this.docTreeObserver) {
      this.docTreeObserver.disconnect();
      this.docTreeObserver = null;
    }
    this.docTreeContainer = null;
  }

  bindGlobalDocTreeListeners() {
    if (this.globalTreeListeners) return;
    this.globalTreeListeners = true;
    document.addEventListener("pointerdown", this.onDocTreePointerDown, true);
    document.addEventListener("mousedown", this.onDocTreeMouseDown, true);
    document.addEventListener("touchstart", this.onDocTreeTouchStart, TOUCH_LISTENER_OPTIONS);
    document.addEventListener("click", this.onDocTreeClick, true);
  }

  unbindGlobalDocTreeListeners() {
    if (!this.globalTreeListeners) return;
    this.globalTreeListeners = false;
    document.removeEventListener("pointerdown", this.onDocTreePointerDown, true);
    document.removeEventListener("mousedown", this.onDocTreeMouseDown, true);
    document.removeEventListener("touchstart", this.onDocTreeTouchStart, true);
    document.removeEventListener("click", this.onDocTreeClick, true);
  }

  bindSearchToggleListener() {
    if (this.searchToggleListenerBound) return;
    this.searchToggleListenerBound = true;
    document.addEventListener("click", this.onSearchToggleClick, true);
  }

  unbindSearchToggleListener() {
    if (!this.searchToggleListenerBound) return;
    this.searchToggleListenerBound = false;
    document.removeEventListener("click", this.onSearchToggleClick, true);
  }

  bindSearchLater() {
    if (this.searchBindTimer) clearInterval(this.searchBindTimer);
    this.searchBindTimer = setInterval(() => {
      const container = pickSearchListContainer();
      const toolbar = pickSearchToolbar();
      const preview = pickSearchPreviewHost();
      const panelActive = Boolean(container || toolbar || preview);
      if (this.searchPanelActive && !panelActive) {
        this.searchPanelActive = false;
        this.detachSearchList({reset: true});
        return;
      }
      if (panelActive && !this.searchPanelActive) {
        this.searchPanelActive = true;
        this.searchHideLockedEnabled = false;
        this.searchHiddenCount = 0;
        this.searchToggleNoticePending = false;
      }
      if (this.searchListContainer && !this.searchListContainer.isConnected) {
        this.detachSearchList({reset: false});
      }
      if (container && container !== this.searchListContainer) {
        this.attachSearchList(container);
        return;
      }
      if (!container && this.searchListContainer) {
        this.detachSearchList({reset: false});
      }
    }, 900);
  }

  attachSearchList(container) {
    if (!container) return;
    this.detachSearchList({reset: false});
    this.searchListContainer = container;
    this.searchListContainer.addEventListener("click", this.onSearchListClick, true);
    this.searchObserver = new MutationObserver(() => this.scheduleSearchRefresh());
    this.searchObserver.observe(this.searchListContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
    this.scheduleSearchRefresh();
  }

  detachSearchList({reset = true} = {}) {
    if (this.searchListContainer) {
      this.searchListContainer.removeEventListener("click", this.onSearchListClick, true);
    }
    if (this.searchObserver) {
      this.searchObserver.disconnect();
      this.searchObserver = null;
    }
    this.searchListContainer = null;
    if (reset) {
      this.searchHideLockedEnabled = false;
      this.searchHiddenCount = 0;
      this.searchToggleNoticePending = false;
      if (this.searchToggleEl && !this.searchToggleEl.isConnected) {
        this.searchToggleEl = null;
      }
    }
    this.updateSearchToggleUI();
  }

  scheduleSearchRefresh() {
    if (this.searchRefreshTimer) return;
    this.searchRefreshTimer = setTimeout(() => {
      this.searchRefreshTimer = null;
      void this.refreshSearchMasks();
    }, 80);
  }

  ensureSearchToggle() {
    const toolbar = pickSearchToolbar();
    if (!toolbar) {
      if (this.searchToggleEl && !this.searchToggleEl.isConnected) {
        this.searchToggleEl = null;
      }
      return;
    }

    const mode = getSearchToolbarMode(toolbar);
    const existing = Array.from(toolbar.querySelectorAll("[data-ui-lock-guard-search-toggle]"));
    if (existing.length > 0) {
      const primary = existing[0];
      for (let i = 1; i < existing.length; i += 1) {
        existing[i].remove();
      }
      this.searchToggleEl = primary;
      this.searchToggleEl.setAttribute("data-ui-lock-guard-mode", mode);
      this.updateSearchToggleUI();
      return;
    }

    if (this.searchToggleEl && this.searchToggleEl.isConnected) {
      if (this.searchToggleEl.parentElement !== toolbar) {
        this.searchToggleEl.setAttribute("data-ui-lock-guard-mode", mode);
        insertSearchToggle(toolbar, this.searchToggleEl, mode);
      }
      this.updateSearchToggleUI();
      return;
    }
    if (this.searchToggleEl && !this.searchToggleEl.isConnected) {
      this.searchToggleEl = null;
    }

    const sampleButton = pickSearchToggleSample(toolbar, mode);
    let btn = null;
    if (sampleButton) {
      btn = sampleButton.cloneNode(true);
      stripSearchToggleAttributes(btn);
      const sampleSvg = sampleButton.querySelector("svg");
      btn.__uiLockGuardSvgClass = sampleSvg?.getAttribute("class") || "";
      btn.__uiLockGuardPosition = sampleButton.getAttribute?.("data-position") || "";
      btn.classList.remove("fn__hidden", "fn__none");
    } else {
      if (mode === "toolbar") {
        btn = document.createElementNS(SVG_NS, "svg");
        btn.setAttribute("class", "toolbar__icon");
        btn.setAttribute("viewBox", "0 0 24 24");
      } else {
        btn = document.createElement("span");
        btn.className = "block__icon ariaLabel";
      }
    }
    if (btn.tagName === "BUTTON") {
      btn.type = "button";
    }
    if (!btn.hasAttribute("tabindex")) {
      btn.setAttribute("tabindex", "0");
    }
    if (btn.style) {
      btn.style.display = "";
      btn.style.visibility = "";
      btn.style.opacity = "";
    }
    btn.setAttribute("data-ui-lock-guard-search-toggle", "1");
    btn.setAttribute("data-ui-lock-guard-mode", mode);
    btn.removeAttribute("title");
    if (mode === "block" && btn.classList) {
      btn.classList.add("ariaLabel");
      if (!btn.getAttribute("data-position")) {
        const position = btn.__uiLockGuardPosition || "9south";
        btn.setAttribute("data-position", position);
      }
    }
    insertSearchToggle(toolbar, btn, mode);
    this.searchToggleEl = btn;

    this.updateSearchToggleUI();
  }

  updateSearchToggleUI() {
    if (!this.searchToggleEl) return;
    const enabled = this.searchHideLockedEnabled;
    const iconId = enabled ? SEARCH_HIDE_ICON_ID : SEARCH_SHOW_ICON_ID;
    syncSearchToggleIcon(this.searchToggleEl, iconId);
    const title = enabled ? this.t("search.toggleShowLocked") : this.t("search.toggleHideLocked");
    this.searchToggleEl.removeAttribute("title");
    this.searchToggleEl.setAttribute("aria-label", title);
    this.searchToggleEl.setAttribute("data-title", title);
    const mode =
      this.searchToggleEl.getAttribute("data-ui-lock-guard-mode") ||
      getSearchToolbarMode(this.searchToggleEl.parentElement);
    if (mode === "block") {
      this.searchToggleEl.classList?.add("ariaLabel");
      if (!this.searchToggleEl.getAttribute("data-position")) {
        const position = this.searchToggleEl.__uiLockGuardPosition || "9south";
        this.searchToggleEl.setAttribute("data-position", position);
      }
    }
  }

  onSearchToggleClick = (event) => {
    const btn = findClosestByAttr(event.target, "data-ui-lock-guard-search-toggle");
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    this.searchToggleEl = btn;
    this.searchHideLockedEnabled = !this.searchHideLockedEnabled;
    this.searchToggleNoticePending = this.searchHideLockedEnabled;
    this.updateSearchToggleUI();
    this.scheduleSearchRefresh();
  };

  maskSearchText(textEl, placeholder) {
    if (!textEl) return;
    if (textEl.textContent !== placeholder) {
      textEl.__uiLockGuardOriginalHtml = textEl.innerHTML;
    }
    textEl.textContent = placeholder;
    textEl.classList.add("ui-lock-guard__search-masked");
  }

  unmaskSearchText(textEl) {
    if (!textEl) return;
    if (textEl.classList.contains("ui-lock-guard__search-masked") && textEl.__uiLockGuardOriginalHtml) {
      textEl.innerHTML = textEl.__uiLockGuardOriginalHtml;
    }
    textEl.__uiLockGuardOriginalHtml = "";
    textEl.classList.remove("ui-lock-guard__search-masked");
  }

  clearOverlayForHost(host) {
    if (!host) return;
    const overlay = this.protyleOverlays.get(host);
    if (!overlay) return;
    overlay.classList.remove("ui-lock-guard__overlay--show");
    overlay.dataset.lockKey = "";
    overlay.dataset.lockReason = "";
    overlay.dataset.lockNotebookTitle = "";
    overlay.dataset.lockNotebookId = "";
  }

  async refreshSearchMasks() {
    const container =
      this.searchListContainer && this.searchListContainer.isConnected ? this.searchListContainer : pickSearchListContainer();
    if (container && container !== this.searchListContainer) {
      this.attachSearchList(container);
    }
    if (!container) return;
    this.ensureSearchToggle();
    const token = ++this.searchRefreshToken;
    const items = Array.from(container.querySelectorAll("[data-type='search-item']"));
    if (!items.length) {
      const host = pickSearchPreviewHost();
      if (host) this.clearOverlayForHost(host);
      this.searchHiddenCount = 0;
      this.updateSearchToggleUI();
      if (this.searchHideLockedEnabled && this.searchToggleNoticePending) {
        this.searchToggleNoticePending = false;
        showMessage(this.t("search.hiddenEmpty"));
      }
      return;
    }

    const hasLockedNotebook = this.locks.some((lock) => lock.type === "notebook" && this.isLockedNow(lock));
    const placeholder = this.t("search.lockedSnippet");
    let focusedItem = null;
    let hiddenCount = 0;

    for (const item of items) {
      if (token !== this.searchRefreshToken) return;
      if (
        !focusedItem &&
        (item.classList.contains("b3-list-item--focus") ||
          item.classList.contains("b3-list-item--selected") ||
          item.classList.contains("b3-list-item--current") ||
          item.getAttribute("aria-current") === "true")
      ) {
        focusedItem = item;
      }
      const textEl = item.querySelector(".b3-list-item__text");
      if (!textEl) continue;
      const docId = getDocIdFromSearchItem(item);
      if (!docId) {
        this.unmaskSearchText(textEl);
        continue;
      }

      let locked = false;
      const docLock = this.getLock("doc", docId);
      if (docLock) {
        locked = this.isLockedNow(docLock);
      } else if (hasLockedNotebook) {
        const notebookId =
          item.getAttribute?.("data-notebook-id") ||
          item.getAttribute?.("data-notebook") ||
          item.dataset?.notebookId ||
          item.dataset?.notebook;
        const state = await this.resolveDocLockState(docId, {source: "search", notebookId});
        if (token !== this.searchRefreshToken) return;
        locked = state.locked;
      }

      if (this.searchHideLockedEnabled) {
        if (locked) {
          item.classList.add("ui-lock-guard__search-hidden");
          hiddenCount += 1;
          this.unmaskSearchText(textEl);
        } else {
          item.classList.remove("ui-lock-guard__search-hidden");
          this.unmaskSearchText(textEl);
        }
      } else {
        item.classList.remove("ui-lock-guard__search-hidden");
        if (locked) this.maskSearchText(textEl, placeholder);
        else this.unmaskSearchText(textEl);
      }
    }

    this.searchHiddenCount = hiddenCount;
    this.updateSearchToggleUI();
    if (this.searchHideLockedEnabled && this.searchToggleNoticePending) {
      this.searchToggleNoticePending = false;
      if (hiddenCount > 0) {
        showMessage(this.t("search.hiddenCount", {count: hiddenCount}));
      } else {
        showMessage(this.t("search.hiddenEmpty"));
      }
    }

    const previewHost = pickSearchPreviewHost();
    if (previewHost) {
      let focused = focusedItem || findFocusedListItem(container, "[data-type='search-item']");
      const docId = getDocIdFromSearchItem(focused);
      if (docId) {
        await this.applyLockOverlay({host: previewHost, docId, source: "search"});
      } else {
        this.clearOverlayForHost(previewHost);
      }
    }
  }

  bindHistoryLater() {
    if (this.historyBindTimer) clearInterval(this.historyBindTimer);
    this.historyBindTimer = setInterval(() => {
      const container = pickHistoryListContainer();
      if (this.historyListContainer && !this.historyListContainer.isConnected) {
        this.detachHistoryList();
      }
      if (container && container !== this.historyListContainer) {
        this.attachHistoryList(container);
        return;
      }
      if (!container && this.historyListContainer) {
        this.detachHistoryList();
      }
    }, 900);
  }

  attachHistoryList(container) {
    if (!container) return;
    this.detachHistoryList();
    this.historyListContainer = container;
    this.historyListContainer.addEventListener("pointerdown", this.onHistoryListPointerDown, true);
    this.historyListContainer.addEventListener("click", this.onHistoryListClick, true);
    this.historyObserver = new MutationObserver(() => this.scheduleHistoryRefresh());
    this.historyObserver.observe(this.historyListContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "aria-current", "aria-selected", "aria-expanded"],
    });
    this.scheduleHistoryRefresh();
  }

  detachHistoryList() {
    if (this.historyListContainer) {
      this.historyListContainer.removeEventListener("pointerdown", this.onHistoryListPointerDown, true);
      this.historyListContainer.removeEventListener("click", this.onHistoryListClick, true);
    }
    if (this.historyObserver) {
      this.historyObserver.disconnect();
      this.historyObserver = null;
    }
    this.historyListContainer = null;
  }

  scheduleHistoryRefresh() {
    if (this.historyRefreshTimer) return;
    this.historyRefreshTimer = setTimeout(() => {
      this.historyRefreshTimer = null;
      void this.refreshHistoryPreview();
    }, 80);
  }

  async refreshHistoryPreview() {
    const host = pickHistoryPreviewHost();
    if (!host) return;
    const candidate = pickHistoryListContainer();
    if (candidate && candidate !== this.historyListContainer) {
      this.attachHistoryList(candidate);
    }
    const listContainer =
      (this.historyListContainer && this.historyListContainer.isConnected ? this.historyListContainer : null) ||
      candidate ||
      document;
    const selector = "li.b3-list-item[data-type='doc'][data-path]";
    let item = findFocusedListItem(listContainer, selector);
    if (item) {
      const path = item.getAttribute?.("data-path") || item.dataset?.path;
      if (!isHistoryPath(path)) {
        item = null;
      }
    }
    if (!item) {
      const candidates = Array.from(listContainer.querySelectorAll("li.b3-list-item[data-type='doc'][data-path]"));
      item = candidates.find((node) => isHistoryPath(node.getAttribute?.("data-path") || node.dataset?.path));
    }
    if (!item) {
      this.clearOverlayForHost(host);
      return;
    }

    const docId = getDocIdFromHistoryItem(item);
    if (!docId) {
      this.clearOverlayForHost(host);
      return;
    }
    const notebookId = getNotebookIdFromHistoryItem(item);
    await this.applyLockOverlay({host, docId, source: "history", notebookId});
  }

  scheduleDocTreeRefresh() {
    if (this.docTreeRefreshTimer) return;
    this.docTreeRefreshTimer = setTimeout(() => {
      this.docTreeRefreshTimer = null;
      this.refreshDocTreeMarks();
      this.collapseLockedNotebooks();
    }, 80);
  }

  clearDocTreeMarks() {
    const clearScope = (scope) => {
      scope.querySelectorAll(".ui-lock-guard__tree-lock").forEach((el) => el.remove());
      scope.querySelectorAll(".ui-lock-guard__tree-countdown").forEach((el) => el.remove());
      scope.querySelectorAll(".ui-lock-guard__tree-item--locked").forEach((el) => {
        el.classList.remove("ui-lock-guard__tree-item--locked");
      });
    };
    const hasTreeRoot = this.docTreeContainer && this.docTreeContainer.isConnected;
    if (hasTreeRoot) {
      clearScope(this.docTreeContainer);
      clearScope(document);
      return;
    }
    clearScope(document);
  }

  refreshDocTreeMarks() {
    if (this.docTreeContainer && !this.docTreeContainer.isConnected) {
      this.detachDocTree();
      this.bindDocTreeLater();
    }
    const hasTreeRoot = this.docTreeContainer && this.docTreeContainer.isConnected;
    const now = nowTs();
    let hasTrustLock = false;
    const applyMarks = (scope, requireFilter) => {
      let items = scope.querySelectorAll(".b3-list-item");
      if (!items.length) {
        items = scope.querySelectorAll("[data-type^='navigation'], [data-type*='navigation'], [data-type='notebook']");
      }
      items.forEach((rawItem) => {
        const item =
          rawItem.classList?.contains("b3-list-item") ? rawItem : rawItem.closest?.(".b3-list-item") || rawItem;
        if (requireFilter && !isProbablyDocTreeItem(item)) return;
        const info = resolveTreeItemInfo(item);
        const docLock = !info.isNotebook && info.id ? this.getLock("doc", info.id) : null;
        const notebookMatch = info.isNotebook ? this.resolveNotebookLockForTreeItem(item) : null;
        const activeLock = docLock || notebookMatch?.lock || null;
        const hasLock = Boolean(activeLock);
        const isLocked = activeLock ? this.isLockedNow(activeLock) : false;
        const titleEl =
          item.querySelector(".b3-list-item__text") ||
          item.querySelector(".b3-list-item__title") ||
          item.querySelector(".b3-list-item__name") ||
          item.querySelector(".b3-list-item__label") ||
          item.querySelector(".b3-list-item__content") ||
          item;
        if (hasLock) {
          if (isLocked) item.classList.add("ui-lock-guard__tree-item--locked");
          else item.classList.remove("ui-lock-guard__tree-item--locked");
          let icon = titleEl.querySelector(".ui-lock-guard__tree-lock");
          if (!icon) {
            icon = document.createElement("span");
            icon.className = "ui-lock-guard__tree-lock";
            titleEl.appendChild(icon);
          }
          const iconState = isLocked ? "lock" : "unlock";
          if (icon.getAttribute("data-ui-lock-guard") !== iconState) {
            const iconId = isLocked ? LOCK_ICON_ID : UNLOCK_ICON_ID;
            icon.setAttribute("data-ui-lock-guard", iconState);
            icon.innerHTML = `<svg><use xlink:href="#${iconId}"></use></svg>`;
          }
          const countdown = titleEl.querySelector(".ui-lock-guard__tree-countdown");
          const text =
            activeLock && activeLock.policy === "trust" && this.settings.treeCountdownEnabled
              ? this.formatTreeTrustCountdown(activeLock, now)
              : "";
          if (text) {
            hasTrustLock = true;
            const lockKey = makeLockKey(activeLock.type, activeLock.id);
            if (countdown) {
              countdown.setAttribute("data-lock-key", lockKey);
              if (countdown.textContent !== text) {
                countdown.textContent = text;
              }
            } else {
              const badge = document.createElement("span");
              badge.className = "ui-lock-guard__tree-countdown";
              badge.setAttribute("data-lock-key", lockKey);
              badge.textContent = text;
              if (icon.nextSibling) {
                icon.insertAdjacentElement("afterend", badge);
              } else {
                titleEl.appendChild(badge);
              }
            }
          } else if (countdown) {
            countdown.remove();
          }
        } else {
          item.classList.remove("ui-lock-guard__tree-item--locked");
          const icon = titleEl.querySelector(".ui-lock-guard__tree-lock");
          if (icon) icon.remove();
          const countdown = titleEl.querySelector(".ui-lock-guard__tree-countdown");
          if (countdown) countdown.remove();
        }
      });
    };

    if (hasTreeRoot) {
      applyMarks(this.docTreeContainer, false);
      applyMarks(document, true);
      if (hasTrustLock) {
        this.startTreeTrustTick();
        this.updateTreeTrustCountdowns();
      } else {
        this.stopTreeTrustTick();
      }
      return;
    }
    applyMarks(document, true);
    if (hasTrustLock) {
      this.startTreeTrustTick();
      this.updateTreeTrustCountdowns();
    } else {
      this.stopTreeTrustTick();
    }
  }

  resolveNotebookLockForTreeItem(item) {
    if (!item) return null;
    const info = resolveTreeItemInfo(item);
    if (!info.isNotebook) return null;
    let lock = null;
    if (info.id) {
      lock = this.getLock("notebook", info.id);
    }
    if (!lock) {
      const parentList = item.closest?.(
        "ul[data-url], ul[data-box], ul[data-box-id], ul[data-boxid], ul[data-notebook-id], ul[data-notebook]",
      );
      const parentValues = [
        parentList?.getAttribute?.("data-url"),
        parentList?.dataset?.url,
        parentList?.getAttribute?.("data-box"),
        parentList?.getAttribute?.("data-box-id"),
        parentList?.getAttribute?.("data-boxid"),
        parentList?.getAttribute?.("data-notebook-id"),
        parentList?.getAttribute?.("data-notebook"),
      ];
      for (const value of parentValues) {
        if (isValidId(value)) {
          lock = this.getLock("notebook", value);
          if (lock) break;
        }
      }
    }
    if (!lock) {
      const title = findTitleFromTree(item);
      if (title) {
        const candidates = this.locks.filter((itemLock) => itemLock.type === "notebook" && itemLock.title === title);
        if (candidates.length === 1) {
          lock = candidates[0];
        }
      }
    }
    return lock ? {lock, info} : null;
  }

  markDocOpenSource(docId, source) {
    if (!isValidId(docId) || !source) return;
    const now = nowTs();
    this.docOpenSources.set(docId, {source, time: now});
    for (const [key, entry] of this.docOpenSources.entries()) {
      if (now - entry.time > DOC_SOURCE_TTL) {
        this.docOpenSources.delete(key);
      }
    }
  }

  getRecentDocOpenSource(docId) {
    if (!isValidId(docId)) return "";
    const entry = this.docOpenSources.get(docId);
    if (!entry) return "";
    if (nowTs() - entry.time > DOC_SOURCE_TTL) {
      this.docOpenSources.delete(docId);
      return "";
    }
    return entry.source || "";
  }

  getDocIdFromProtyle(protyle) {
    const pid = protyle?.id;
    if (isValidId(pid)) return pid.trim();
    const rootID = protyle?.block?.rootID;
    if (isValidId(rootID)) return rootID.trim();
    const id = protyle?.block?.id;
    if (isValidId(id)) return id.trim();
    return "";
  }

  refreshAllProtyles() {
    const protyles = typeof getAllEditor === "function" ? getAllEditor() : [];
    if (!Array.isArray(protyles)) return;
    for (const protyle of protyles) {
      void this.refreshProtyle(protyle);
    }
    void this.refreshSearchMasks();
    void this.refreshHistoryPreview();
  }

  async applyLockOverlay({host, docId, source, notebookId} = {}) {
    if (!docId || !host) return;
    const state = await this.resolveDocLockState(docId, {
      source,
      notebookId,
    });
    const overlay = this.ensureProtyleOverlay(host);
    if (state.locked) {
      overlay.classList.add("ui-lock-guard__overlay--show");
      overlay.dataset.lockKey = makeLockKey(state.lock.type, state.lock.id);
      overlay.dataset.lockReason = state.reason || "";
      overlay.dataset.lockNotebookTitle = state.notebookTitle || "";
      overlay.dataset.lockNotebookId = state.notebookId || "";
      const titleEl = overlay.querySelector("[data-lock-title]");
      const subEl = overlay.querySelector("[data-lock-sub]");
      if (titleEl) titleEl.textContent = this.t("overlay.lockedTitle");
      if (subEl) {
        if (state.reason === "notebook" && state.notebookTitle) {
          subEl.textContent = this.t("overlay.notebookLockedWithName", {name: state.notebookTitle});
        } else {
          subEl.textContent =
            state.reason === "notebook" ? this.t("overlay.notebookLocked") : this.t("overlay.docLocked");
        }
      }
    } else {
      overlay.classList.remove("ui-lock-guard__overlay--show");
      overlay.dataset.lockKey = "";
      overlay.dataset.lockReason = "";
      overlay.dataset.lockNotebookTitle = "";
      overlay.dataset.lockNotebookId = "";
    }
  }

  async refreshProtyle(protyle) {
    const docId = this.getDocIdFromProtyle(protyle);
    if (!docId) return;
    const source = this.getRecentDocOpenSource(docId);
    const host = protyle?.element || protyle?.contentElement || protyle?.container || protyle;
    await this.applyLockOverlay({host, docId, source});
  }

  ensureProtyleOverlay(protyle) {
    const host =
      protyle?.element || protyle?.contentElement || protyle?.container || (protyle?.nodeType === 1 ? protyle : null);
    if (!host) return document.createElement("div");
    if (this.protyleOverlays.has(host)) {
      const cached = this.protyleOverlays.get(host);
      if (cached && cached.isConnected && cached.parentElement === host) return cached;
      if (cached && cached.parentElement && cached.parentElement !== host) {
        cached.remove();
      }
      this.protyleOverlays.delete(host);
    }

    host.classList.add("ui-lock-guard__protyle");
    const overlay = document.createElement("div");
    overlay.className = "ui-lock-guard__overlay";
    overlay.innerHTML = `
      <div class="ui-lock-guard__overlay-card">
        <div class="ui-lock-guard__overlay-icon"><svg><use xlink:href="#${LOCK_ICON_ID}"></use></svg></div>
        <div class="ui-lock-guard__overlay-title" data-lock-title></div>
        <div class="ui-lock-guard__overlay-sub" data-lock-sub></div>
        <div class="ui-lock-guard__overlay-actions">
          <button class="b3-button b3-button--primary" data-action="unlock">${this.t("overlay.unlockAction")}</button>
        </div>
      </div>
    `;
    overlay.addEventListener("click", (event) => {
      const btn = event.target.closest("[data-action='unlock']");
      if (!btn) return;
      const key = overlay.dataset.lockKey;
      const lock = this.getLockByKey(key);
      if (lock) {
        const reason = overlay.dataset.lockReason || "";
        const notebookTitle = overlay.dataset.lockNotebookTitle || lock.title || lock.id;
        const hint =
          reason === "notebook" ? this.t("unlock.hintNotebook", {name: notebookTitle || lock.id}) : "";
        void this.unlockLock(lock, {hint});
      }
    });

    host.appendChild(overlay);
    this.protyleOverlays.set(host, overlay);
    return overlay;
  }

  clearAllOverlays() {
    for (const overlay of this.protyleOverlays.values()) {
      overlay.remove();
    }
    this.protyleOverlays.clear();
  }

  clearOverlaysForLock(lock) {
    if (!lock) return;
    const key = makeLockKey(lock.type, lock.id);
    for (const overlay of this.protyleOverlays.values()) {
      if (overlay.dataset.lockKey === key) {
        overlay.classList.remove("ui-lock-guard__overlay--show");
        overlay.dataset.lockKey = "";
        overlay.dataset.lockReason = "";
        overlay.dataset.lockNotebookTitle = "";
        overlay.dataset.lockNotebookId = "";
      }
    }
  }

  onSwitchProtyle = ({detail}) => {
    void this.refreshProtyle(detail?.protyle);
    this.scheduleDocTreeRefresh();
  };

  onLoadedProtyle = ({detail}) => {
    void this.refreshProtyle(detail?.protyle);
    this.scheduleDocTreeRefresh();
  };

  onSearchListClick = (event) => {
    const item = event.target?.closest?.("[data-type='search-item']");
    if (!item) return;
    const docId = getDocIdFromSearchItem(item);
    if (docId) this.markDocOpenSource(docId, "search");
    this.scheduleSearchRefresh();
  };

  onHistoryListPointerDown = (event) => {
    const item = event.target?.closest?.("li.b3-list-item[data-type='doc'][data-path]");
    if (!item) return;
    const path = item.getAttribute?.("data-path") || item.dataset?.path;
    if (!isHistoryPath(path)) return;
    const docId = getDocIdFromHistoryItem(item);
    if (docId) this.markDocOpenSource(docId, "history");
    this.scheduleHistoryRefresh();
  };

  onHistoryListClick = (event) => {
    const item = event.target?.closest?.("li.b3-list-item[data-type='doc'][data-path]");
    if (!item) return;
    const path = item.getAttribute?.("data-path") || item.dataset?.path;
    if (!isHistoryPath(path)) return;
    const docId = getDocIdFromHistoryItem(item);
    if (docId) this.markDocOpenSource(docId, "history");
    this.scheduleHistoryRefresh();
  };

  trackDocTreeDocOpen(event) {
    if (!event || event.isTrusted === false) return;
    const target = event.target;
    if (!target) return;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const pathItem = path.find((node) => node?.classList?.contains("b3-list-item"));
    const item =
      pathItem ||
      target.closest(".b3-list-item") ||
      (target.closest("ul")?.previousElementSibling?.classList?.contains("b3-list-item")
        ? target.closest("ul").previousElementSibling
        : null);
    if (!item) return;
    const inDocTree = this.docTreeContainer?.isConnected && this.docTreeContainer.contains(item);
    if (!inDocTree && !isProbablyDocTreeItem(item)) return;
    const info = resolveTreeItemInfo(item);
    if (!info?.id || info.isNotebook) return;
    this.markDocOpenSource(info.id, "tree");
  }

  onDocTreeMenu = ({detail}) => {
    try {
      const {menu, elements, type} = detail || {};
      const rawElements = elements ?? detail?.element;
      let elementList = [];
      if (rawElements) {
        if (Array.isArray(rawElements)) {
          elementList = rawElements;
        } else if (typeof rawElements.length === "number") {
          elementList = Array.from(rawElements);
        } else {
          elementList = [rawElements];
        }
      }
      if (!menu || elementList.length === 0) return;

      const targetEl = elementList[0];
      const pickElementWithId = (el) => {
        if (!el) return null;
        if (findAttrId(el)) return el;
        const closestItem = el.closest?.(".b3-list-item");
        if (closestItem && findAttrId(closestItem)) return closestItem;
        const closestWithId = el.closest?.(
          "[data-node-id],[data-id],[data-doc-id],[data-root-id],[data-box],[data-url],[data-notebook-id],[data-notebook],[data-box-id],[data-boxid]",
        );
        if (closestWithId && findAttrId(closestWithId)) return closestWithId;
        const childWithId = el.querySelector?.(
          "[data-node-id],[data-id],[data-doc-id],[data-root-id],[data-box],[data-url],[data-notebook-id],[data-notebook],[data-box-id],[data-boxid]",
        );
        if (childWithId && findAttrId(childWithId)) return childWithId;
        return el;
      };

      let holder = null;
      let id = "";
      for (const el of elementList) {
        const candidate = pickElementWithId(el);
        const candidateId = findAttrId(candidate);
        if (candidateId) {
          holder = candidate;
          id = candidateId;
          break;
        }
      }
      if (!id) {
        const candidate = pickElementWithId(targetEl);
        id = findAttrId(candidate);
        holder = candidate || targetEl;
      }
      if (!id) id = resolveDetailId(detail);

      const dataType =
        holder?.getAttribute("data-type") ||
        holder?.dataset?.type ||
        targetEl?.getAttribute("data-type") ||
        targetEl?.dataset?.type;
      const detailType = detail?.data?.type || type;
      const docAttrCandidates = [
        holder?.getAttribute?.("data-node-id"),
        holder?.getAttribute?.("data-id"),
        holder?.getAttribute?.("data-doc-id"),
        holder?.getAttribute?.("data-root-id"),
      ];
      const docAttrValue = docAttrCandidates.find((val) => isValidId(val));
      let isNotebook =
        detailType === "notebook" ||
        detailType === "navigation-root" ||
        dataType === "notebook" ||
        dataType === "navigation-root";
      const notebookAttrCandidates = [
        holder?.getAttribute?.("data-url"),
        holder?.getAttribute?.("data-box"),
        holder?.getAttribute?.("data-box-id"),
        holder?.getAttribute?.("data-boxid"),
        holder?.getAttribute?.("data-notebook-id"),
        holder?.getAttribute?.("data-notebook"),
      ];
      if (!isNotebook) {
        const urlAttr = notebookAttrCandidates.find((val) => isValidId(val));
        if (docAttrValue) {
          // Explicit doc attributes win over notebook hints.
          isNotebook = false;
        } else if (isValidId(urlAttr)) {
          isNotebook = true;
        }
      }
      if (!id && isNotebook) {
        const notebookEl =
          holder?.closest?.("ul[data-url]") ||
          targetEl?.closest?.("ul[data-url]") ||
          targetEl?.querySelector?.("ul[data-url]");
        const notebookId = notebookEl?.getAttribute?.("data-url") || "";
        if (isValidId(notebookId)) id = notebookId.trim();
        if (!id) {
          const idFromAttr = notebookAttrCandidates.find((val) => isValidId(val));
          if (isValidId(idFromAttr)) id = idFromAttr.trim();
        }
      }
      const treeItem =
        holder?.closest?.(".b3-list-item") ||
        targetEl?.closest?.(".b3-list-item") ||
        holder ||
        targetEl;
      const treeInfo = resolveTreeItemInfo(treeItem);
      if (treeInfo?.id) {
        id = treeInfo.id;
        isNotebook = treeInfo.isNotebook;
      }
      if (!id) return;

      const itemType = isNotebook ? "notebook" : "doc";
      const title = findTitleFromTree(treeItem || holder || targetEl) || id;

      const lock = this.getLock(itemType, id);
      if (!lock) {
        menu.addItem({
          icon: LOCK_ICON_ID,
          label: this.t("menu.lock"),
          click: () => void this.openLockDialog({id, type: itemType, title, element: targetEl}),
        });
      } else {
        menu.addItem({
          icon: "iconUnlock",
          label: this.t("menu.unlock"),
          click: () => void this.unlockLock(lock),
        });
        menu.addItem({
          icon: "iconTrashcan",
          label: this.t("menu.removeLock"),
          click: () => void this.removeLock(lock),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  onDocTreePointerDown = (event) => {
    if (isMobileClient()) return;
    if (event.button !== 0) return;
    void this.handleLockedNotebookInteraction(event);
  };

  onDocTreeMouseDown = (event) => {
    if (isMobileClient()) return;
    if (event.button !== 0) return;
    void this.handleLockedNotebookInteraction(event);
  };

  onDocTreeTouchStart = (event) => {
    this.trackDocTreeDocOpen(event);
    void this.handleLockedNotebookInteraction(event, {deferDialog: true});
  };

  onDocTreeClick = (event) => {
    if (event.button !== undefined && event.button !== 0) return;
    this.trackDocTreeDocOpen(event);
    void this.handleLockedNotebookInteraction(event);
  };

  async handleLockedNotebookInteraction(event, options = {}) {
    if (event && event.isTrusted === false) return false;
    const target = event.target;
    if (!target) return false;
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const pathItem = path.find((node) => node?.classList?.contains("b3-list-item"));
    const item =
      pathItem ||
      target.closest(".b3-list-item") ||
      (target.closest("ul")?.previousElementSibling?.classList?.contains("b3-list-item")
        ? target.closest("ul").previousElementSibling
        : null);
    if (!item) return false;
    const inDocTree = this.docTreeContainer?.isConnected && this.docTreeContainer.contains(item);
    if (!inDocTree && !isProbablyDocTreeItem(item)) return false;
    const info = resolveTreeItemInfo(item);
    if (!info.isNotebook) return false;
    const match = this.resolveNotebookLockForTreeItem(item);
    const lock = match?.lock || null;
    if (!lock || !this.isLockedNow(lock)) return false;

    const now = nowTs();
    const threshold = isMobileClient() ? 800 : 400;
    if (this.lastNotebookUnlock.id === lock.id && now - this.lastNotebookUnlock.time < threshold) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return true;
    }
    this.lastNotebookUnlock = {id: lock.id, time: now};

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.collapseNotebookTreeItem(item);

    const deferDialog = options.deferDialog && isMobileClient();
    if (deferDialog) {
      setTimeout(() => {
        void this.unlockLock(lock).then((ok) => {
          if (ok) this.expandNotebookInTree(item);
        });
      }, 0);
      return true;
    }

    const ok = await this.unlockLock(lock);
    if (ok) {
      this.expandNotebookInTree(item);
    }
    return true;
  }

  collapseNotebookInTree(notebookId) {
    if (!notebookId) return;
    const root = this.docTreeContainer && this.docTreeContainer.isConnected ? this.docTreeContainer : document;
    const safeId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(notebookId) : notebookId;
    const selectors = [
      `[data-node-id="${safeId}"]`,
      `[data-id="${safeId}"]`,
      `[data-doc-id="${safeId}"]`,
      `[data-root-id="${safeId}"]`,
      `[data-url="${safeId}"]`,
      `[data-box="${safeId}"]`,
      `[data-box-id="${safeId}"]`,
      `[data-boxid="${safeId}"]`,
      `[data-notebook-id="${safeId}"]`,
    ];
    const items = root.querySelectorAll(selectors.join(","));
    items.forEach((item) => {
      const treeItem = item.classList.contains("b3-list-item")
        ? item
        : item.previousElementSibling?.classList?.contains("b3-list-item")
          ? item.previousElementSibling
          : item.closest?.(".b3-list-item");
      this.collapseNotebookTreeItem(treeItem);
    });
  }

  collapseNotebookTreeItem(treeItem) {
    if (!treeItem) return;
    const isExpanded = this.isTreeItemExpanded(treeItem);
    if (!isExpanded) {
      const sibling = treeItem.nextElementSibling;
      if (sibling && sibling.tagName === "UL") {
        const style = window.getComputedStyle(sibling);
        if (style.display !== "none") {
          this.tryToggleTree(treeItem);
        }
      }
      return;
    }
    this.tryToggleTree(treeItem);
  }

  expandNotebookInTree(item) {
    const treeItem = item.classList.contains("b3-list-item")
      ? item
      : item.closest?.(".b3-list-item");
    if (!treeItem) return;
    if (!this.isTreeItemExpanded(treeItem)) {
      this.tryToggleTree(treeItem);
    }
  }

  isTreeItemExpanded(treeItem) {
    if (!treeItem) return false;
    return (
      treeItem.getAttribute("aria-expanded") === "true" ||
      treeItem.classList.contains("b3-list-item--expanded") ||
      treeItem.classList.contains("b3-list-item--opened") ||
      treeItem.dataset?.fold === "0"
    );
  }

  collapseLockedNotebooks() {
    const hasTreeRoot = this.docTreeContainer && this.docTreeContainer.isConnected;
    const applyCollapse = (scope, requireFilter) => {
      let items = scope.querySelectorAll(".b3-list-item");
      if (!items.length) {
        items = scope.querySelectorAll("[data-type^='navigation'], [data-type*='navigation'], [data-type='notebook']");
      }
      items.forEach((rawItem) => {
        const item =
          rawItem.classList?.contains("b3-list-item") ? rawItem : rawItem.closest?.(".b3-list-item") || rawItem;
        if (requireFilter && !isProbablyDocTreeItem(item)) return;
        const info = resolveTreeItemInfo(item);
        if (!info.isNotebook) return;
        const match = this.resolveNotebookLockForTreeItem(item);
        if (match?.lock && this.isLockedNow(match.lock)) {
          this.collapseNotebookTreeItem(item);
        }
      });
    };

    if (hasTreeRoot) {
      applyCollapse(this.docTreeContainer, false);
      applyCollapse(document, true);
      return;
    }
    applyCollapse(document, true);
  }

  tryToggleTree(item) {
    const toggle =
      item.querySelector(".b3-list-item__toggle") ||
      item.querySelector(".b3-list-item__arrow") ||
      item.querySelector(".b3-list-item__icon");
    if (toggle) {
      toggle.dispatchEvent(new MouseEvent("click", {bubbles: true}));
    }
  }

  async openLockDialog({id, type, title}) {
    if (!isValidId(id)) return;
    const name = title || (type === "doc" ? await this.getDocTitle(id) : id) || id;
    const dialog = new Dialog({
      title: this.t("lock.dialogTitle", {name}),
      content: `
        <div class="ui-lock-guard__dialog">
          <div class="ui-lock-guard__step" data-step="1">
            <div class="ui-lock-guard__step-title">${this.t("lock.chooseType")}</div>
            <div class="ui-lock-guard__type-grid">
              <div class="ui-lock-guard__type-card" data-type="password">
                <div class="ui-lock-guard__type-card-title">${this.t("lock.typePassword")}</div>
                <div class="ui-lock-guard__hint">${this.t("lock.passwordHint")}</div>
              </div>
              <div class="ui-lock-guard__type-card" data-type="pattern">
                <div class="ui-lock-guard__type-card-title">${this.t("lock.typePattern")}</div>
                <div class="ui-lock-guard__hint">${this.t("lock.drawPattern")}</div>
              </div>
            </div>
          </div>
          <div class="ui-lock-guard__step" data-step="2">
            <div class="ui-lock-guard__step-title" data-secret-title></div>
            <div data-password-wrap>
              <input class="b3-text-field fn__block" type="password" data-password placeholder="${this.t(
                "lock.setPassword",
              )}" />
              <div style="height: 8px;"></div>
              <input class="b3-text-field fn__block" type="password" data-password-confirm placeholder="${this.t(
                "lock.confirmPassword",
              )}" />
              <div class="ui-lock-guard__hint" data-password-hint>${this.t("lock.passwordHint")}</div>
            </div>
            <div data-pattern-wrap style="display:none;">
              <div class="ui-lock-guard__pattern">
                <svg class="ui-lock-guard__pattern-line"></svg>
                <div class="ui-lock-guard__pattern-grid">
                  ${Array.from({length: 9})
                    .map((_, idx) => `<div class="ui-lock-guard__pattern-dot" data-index="${idx + 1}"></div>`)
                    .join("")}
                </div>
              </div>
              <div class="ui-lock-guard__hint" data-pattern-status>${this.t("lock.drawPattern")}</div>
            </div>
          </div>
          <div class="ui-lock-guard__step" data-step="3">
            <div class="ui-lock-guard__step-title">${this.t("lock.choosePolicy")}</div>
            <div class="ui-lock-guard__policy">
              <label class="ui-lock-guard__policy-item">
                <input type="radio" name="ui-lock-guard-policy" value="always" checked />
                <span>${this.t("lock.policyAlways")}</span>
              </label>
              <label class="ui-lock-guard__policy-item">
                <input type="radio" name="ui-lock-guard-policy" value="trust" />
                <span>${this.t("lock.policyTrust")}</span>
              </label>
              <div data-trust-input style="display:none;">
                <input class="b3-text-field fn__block" type="number" min="1" max="1440" step="1" value="30" />
                <div class="ui-lock-guard__hint">${this.t("lock.trustMinutesHint", {min: 30})}</div>
              </div>
            </div>
          </div>
          <div class="ui-lock-guard__dialog-actions">
            <button class="b3-button b3-button--outline" data-action="back">${this.t("lock.stepBack")}</button>
            <button class="b3-button b3-button--outline" data-action="cancel">${this.t("lock.stepCancel")}</button>
            <button class="b3-button b3-button--primary" data-action="next">${this.t("lock.stepNext")}</button>
            <button class="b3-button b3-button--primary" data-action="save">${this.t("lock.stepSave")}</button>
          </div>
        </div>
      `,
      width: "min(520px, 92vw)",
    });

    const root = dialog.element.querySelector(".ui-lock-guard__dialog");
    const steps = Array.from(root.querySelectorAll(".ui-lock-guard__step"));
    const typeCards = Array.from(root.querySelectorAll(".ui-lock-guard__type-card"));
    const passwordWrap = root.querySelector("[data-password-wrap]");
    const patternWrap = root.querySelector("[data-pattern-wrap]");
    const secretTitle = root.querySelector("[data-secret-title]");
    const passwordInput = root.querySelector("[data-password]");
    const passwordConfirm = root.querySelector("[data-password-confirm]");
    const patternStatus = root.querySelector("[data-pattern-status]");
    const policyInputs = Array.from(root.querySelectorAll("input[name='ui-lock-guard-policy']"));
    const trustInputWrap = root.querySelector("[data-trust-input]");
    const trustMinutesInput = trustInputWrap?.querySelector("input");
    const trustHint = trustInputWrap?.querySelector(".ui-lock-guard__hint");
    const btnBack = root.querySelector("[data-action='back']");
    const btnNext = root.querySelector("[data-action='next']");
    const btnSave = root.querySelector("[data-action='save']");
    const btnCancel = root.querySelector("[data-action='cancel']");

    const state = {
      step: 1,
      lockType: "",
      secret: "",
      policy: "always",
      trustMinutes: 30,
    };

    const updateSteps = () => {
      steps.forEach((stepEl) => {
        const isActive = stepEl.getAttribute("data-step") === String(state.step);
        stepEl.classList.toggle("is-active", isActive);
      });
      if (btnBack) btnBack.style.display = state.step === 1 ? "none" : "";
      if (btnNext) btnNext.style.display = state.step >= 3 ? "none" : "";
      if (btnSave) btnSave.style.display = state.step === 3 ? "" : "none";
      if (btnNext) {
        if (state.step === 1) btnNext.disabled = !state.lockType;
        if (state.step === 2) {
          btnNext.disabled = state.lockType === "pattern" && !state.secret;
        }
      }
      if (btnSave) btnSave.disabled = state.step !== 3;
    };

    const updateTypeCards = () => {
      typeCards.forEach((card) => {
        const val = card.getAttribute("data-type");
        card.classList.toggle("is-active", val === state.lockType);
      });
    };

    const showSecretStep = () => {
      secretTitle.textContent =
        state.lockType === "pattern" ? this.t("lock.drawPattern") : this.t("lock.setPassword");
      passwordWrap.style.display = state.lockType === "password" ? "" : "none";
      patternWrap.style.display = state.lockType === "pattern" ? "" : "none";
      if (passwordInput) passwordInput.value = "";
      if (passwordConfirm) passwordConfirm.value = "";
      state.secret = "";
      updateSteps();
    };

    const updatePolicyUI = () => {
      trustInputWrap.style.display = state.policy === "trust" ? "" : "none";
    };

    const setPatternStatus = (code) => {
      if (!patternStatus) return;
      if (code === "pattern-too-short") patternStatus.textContent = this.t("lock.patternTooShort");
      else if (code === "pattern-mismatch") patternStatus.textContent = this.t("lock.patternMismatch");
      else if (code === "draw-again") patternStatus.textContent = this.t("lock.drawAgain");
      else if (code === "pattern-confirmed") patternStatus.textContent = this.t("lock.patternConfirmed");
      else patternStatus.textContent = this.t("lock.drawPattern");
    };

    typeCards.forEach((card) => {
      card.addEventListener("click", () => {
        state.lockType = card.getAttribute("data-type");
        updateTypeCards();
        updateSteps();
      });
    });

    btnCancel?.addEventListener("click", () => dialog.destroy());
    btnBack?.addEventListener("click", () => {
      state.step = Math.max(1, state.step - 1);
      updateSteps();
    });

    btnNext?.addEventListener("click", () => {
      if (state.step === 1) {
        if (!state.lockType) return;
        state.step = 2;
        showSecretStep();
        if (state.lockType === "pattern" && patternStatus) {
          if (this.patternCleanup) this.patternCleanup();
          this.patternCleanup = createPatternPad(patternWrap.querySelector(".ui-lock-guard__pattern"), {
            mode: "set",
            onComplete: (pattern) => {
              state.secret = pattern;
              updateSteps();
            },
            onStatus: (code) => setPatternStatus(code),
          });
          setPatternStatus();
        }
        return;
      }
      if (state.step === 2) {
        if (state.lockType === "password") {
          const pwd = String(passwordInput?.value || "");
          const confirm = String(passwordConfirm?.value || "");
          if (!pwd) {
            showMessage(this.t("lock.secretRequired"));
            return;
          }
          if (pwd !== confirm) {
            showMessage(this.t("lock.passwordMismatch"));
            return;
          }
          state.secret = pwd;
        }
        if (!state.secret) {
          showMessage(this.t("lock.secretRequired"));
          return;
        }
        state.step = 3;
        updateSteps();
      }
    });

    btnSave?.addEventListener("click", async () => {
      const trustVal = clampInt(trustMinutesInput?.value, 1, 1440, 30);
      state.trustMinutes = trustVal;
      if (!state.lockType || !state.secret) {
        showMessage(this.t("lock.secretRequired"));
        return;
      }
      const policy = state.policy;
      await this.createLockRecord({
        id,
        type,
        title: name,
        lockType: state.lockType,
        secret: state.secret,
        policy,
        trustMinutes: trustVal,
      });
      dialog.destroy();
    });

    policyInputs.forEach((input) => {
      input.addEventListener("change", () => {
        state.policy = policyInputs.find((item) => item.checked)?.value || "always";
        updatePolicyUI();
      });
    });

    trustMinutesInput?.addEventListener("input", () => {
      const val = clampInt(trustMinutesInput.value, 1, 1440, 30);
      if (trustHint) trustHint.textContent = this.t("lock.trustMinutesHint", {min: val});
    });

    updateTypeCards();
    updatePolicyUI();
    updateSteps();
  }

  async createLockRecord({id, type, title, lockType, secret, policy, trustMinutes}) {
    const {salt, hash} = await hashSecret(secret);
    const now = nowTs();
    const newLock = {
      id,
      type,
      title: title || "",
      lockType,
      salt,
      hash,
      policy,
      trustMinutes: clampInt(trustMinutes, 1, 1440, 30),
      trustUntil: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.locks = [...this.locks.filter((lock) => !(lock.id === id && lock.type === type)), newLock];
    await this.saveLocks();
    this.scheduleTrustTimer(newLock);
    this.refreshDocTreeMarks();
    this.refreshAllProtyles();
    this.renderSettingLockList();
    if (type === "notebook") {
      this.collapseNotebookInTree(id);
      this.collapseLockedNotebooks();
    }
    showMessage(this.t("lock.lockedSuccess"));
  }

  async verifyLock(lock, {title, hint} = {}) {
    if (!lock) return false;
    return new Promise((resolve) => {
      let resolved = false;
      let cleanupPattern = null;
      const finalize = (value) => {
        if (resolved) return;
        resolved = true;
        resolve(value);
      };
      const dialog = new Dialog({
        title: title || this.t("unlock.dialogTitle", {name: lock.title || lock.id}),
        content: `
          <div class="ui-lock-guard__dialog">
            <div class="ui-lock-guard__step-title">${escapeHtml(hint || "")}</div>
            <div data-verify-password style="display:none;">
              <input class="b3-text-field fn__block" type="password" placeholder="${this.t("unlock.enterPassword")}" />
            </div>
            <div data-verify-pattern style="display:none;">
              <div class="ui-lock-guard__pattern">
                <svg class="ui-lock-guard__pattern-line"></svg>
                <div class="ui-lock-guard__pattern-grid">
                  ${Array.from({length: 9})
                    .map((_, idx) => `<div class="ui-lock-guard__pattern-dot" data-index="${idx + 1}"></div>`)
                    .join("")}
                </div>
              </div>
              <div class="ui-lock-guard__hint" data-verify-status>${this.t("unlock.drawPattern")}</div>
            </div>
            <div class="ui-lock-guard__dialog-actions">
              <button class="b3-button b3-button--outline" data-action="cancel">${this.t(
                "lock.stepCancel",
              )}</button>
              <button class="b3-button b3-button--primary" data-action="verify">${this.t("unlock.verify")}</button>
            </div>
          </div>
        `,
        width: "min(420px, 92vw)",
        destroyCallback: () => {
          if (cleanupPattern) cleanupPattern();
          finalize(false);
        },
      });

      const root = dialog.element.querySelector(".ui-lock-guard__dialog");
      const passwordWrap = root.querySelector("[data-verify-password]");
      const patternWrap = root.querySelector("[data-verify-pattern]");
      const verifyBtn = root.querySelector("[data-action='verify']");
      const cancelBtn = root.querySelector("[data-action='cancel']");
      const statusEl = root.querySelector("[data-verify-status]");
      const passwordInput = passwordWrap?.querySelector("input");

      let secret = "";

      const doVerify = async () => {
        if (!secret) return;
        const {hash} = await hashSecret(secret, lock.salt);
        if (hash === lock.hash) {
          finalize(true);
          dialog.destroy();
          return;
        }
        showMessage(this.t("unlock.fail"));
        dialog.destroy();
        return;
      };

      const initVerifyPattern = () => {
        if (cleanupPattern) cleanupPattern();
        cleanupPattern = createPatternPad(patternWrap.querySelector(".ui-lock-guard__pattern"), {
          mode: "verify",
          onComplete: async (pattern) => {
            secret = pattern;
            if (statusEl) statusEl.textContent = this.t("unlock.verify");
            await doVerify();
          },
        });
      };

      if (lock.lockType === "password") {
        passwordWrap.style.display = "";
        verifyBtn.disabled = false;
        passwordInput.focus();
        passwordInput.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            secret = String(passwordInput.value || "");
            void doVerify();
          }
        });
      } else {
        patternWrap.style.display = "";
        initVerifyPattern();
      }

      verifyBtn.addEventListener("click", () => {
        if (lock.lockType === "password") {
          secret = String(passwordInput?.value || "");
        }
        void doVerify();
      });

      cancelBtn.addEventListener("click", () => {
        if (cleanupPattern) cleanupPattern();
        finalize(false);
        dialog.destroy();
      });
    });
  }

  async unlockLock(lock, options = {}) {
    if (!lock) return false;
    if (!this.isLockedNow(lock) && lock.policy === "always") {
      showMessage(this.t("unlock.alreadyUnlocked"));
      return true;
    }
    const ok = await this.verifyLock(lock, {
      title: options.title || this.t("unlock.dialogTitle", {name: lock.title || lock.id}),
      hint: options.hint,
    });
    if (!ok) return false;
    const key = makeLockKey(lock.type, lock.id);
    if (lock.policy === "trust") {
      lock.trustUntil = nowTs() + clampInt(lock.trustMinutes, 1, 1440, 30) * 60 * 1000;
      lock.updatedAt = nowTs();
      await this.saveLocks();
      this.scheduleTrustTimer(lock);
    } else {
      this.sessionUnlocks.add(key);
    }
    this.clearOverlaysForLock(lock);
    this.refreshDocTreeMarks();
    this.refreshAllProtyles();
    this.renderSettingLockList();
    showMessage(this.t("unlock.success"));
    return true;
  }

  async removeLock(lock) {
    if (!lock) return;
    const ok = await this.verifyLock(lock, {
      title: this.t("remove.dialogTitle", {name: lock.title || lock.id}),
      hint: this.t("remove.verifyHint"),
    });
    if (!ok) return;
    const key = makeLockKey(lock.type, lock.id);
    this.locks = this.locks.filter((item) => !(item.id === lock.id && item.type === lock.type));
    this.sessionUnlocks.delete(key);
    const timer = this.trustTimers.get(key);
    if (timer) clearTimeout(timer);
    this.trustTimers.delete(key);
    await this.saveLocks();
    this.clearOverlaysForLock(lock);
    this.refreshDocTreeMarks();
    this.refreshAllProtyles();
    this.renderSettingLockList();
    showMessage(this.t("remove.success"));
  }

  initSettingPanel() {
    const autoEnableWrap = document.createElement("label");
    autoEnableWrap.className = "ui-lock-guard__toggle";
    autoEnableWrap.innerHTML = '<input type="checkbox"><span class="ui-lock-guard__toggle-slider"></span>';
    const autoEnable = autoEnableWrap.querySelector("input");

    const autoMinutes = document.createElement("input");
    autoMinutes.type = "number";
    autoMinutes.min = "1";
    autoMinutes.max = "1440";
    autoMinutes.step = "1";
    autoMinutes.className = "b3-text-field fn__block";

    const autoCountdownWrap = document.createElement("label");
    autoCountdownWrap.className = "ui-lock-guard__toggle";
    autoCountdownWrap.innerHTML = '<input type="checkbox"><span class="ui-lock-guard__toggle-slider"></span>';
    const autoCountdown = autoCountdownWrap.querySelector("input");

    const autoPosition = document.createElement("select");
    autoPosition.className = "b3-select fn__block";
    autoPosition.innerHTML = `
      <option value="topbar">${escapeHtml(this.t("settings.positionTopbar"))}</option>
      <option value="floating">${escapeHtml(this.t("settings.positionFloating"))}</option>
    `;

    const treeCountdownWrap = document.createElement("label");
    treeCountdownWrap.className = "ui-lock-guard__toggle";
    treeCountdownWrap.innerHTML = '<input type="checkbox"><span class="ui-lock-guard__toggle-slider"></span>';
    const treeCountdown = treeCountdownWrap.querySelector("input");

    const lockListWrap = document.createElement("div");
    lockListWrap.className = "ui-lock-guard__lock-list";
    lockListWrap.style.width = "100%";
    lockListWrap.addEventListener("click", this.onSettingLockListClick);

    this.settingEls = {autoEnable, autoMinutes, autoCountdown, autoPosition, treeCountdown, lockListWrap};

    this.setting = new Setting({
      width: "100vw",
      height: "94vh",
      confirmCallback: () => void this.onSettingSave(),
    });

    this.setting.addItem({
      title: this.t("settings.enableAutoLock"),
      description: "",
      createActionElement: () => autoEnableWrap,
    });
    this.setting.addItem({
      title: this.t("settings.autoLockMinutes"),
      description: "",
      createActionElement: () => autoMinutes,
    });
    this.setting.addItem({
      title: this.t("settings.showCountdown"),
      description: "",
      createActionElement: () => autoCountdownWrap,
    });
    this.setting.addItem({
      title: this.t("settings.countdownPosition"),
      description: "",
      createActionElement: () => autoPosition,
    });
    this.setting.addItem({
      title: this.t("settings.showTreeCountdown"),
      description: this.t("settings.treeCountdownHint"),
      createActionElement: () => treeCountdownWrap,
    });
    this.setting.addItem({
      title: "",
      description: "",
      direction: "column",
      createActionElement: () => lockListWrap,
    });

    autoEnable.addEventListener("change", () => void this.onSettingSave());
    autoMinutes.addEventListener("change", () => void this.onSettingSave());
    autoCountdown.addEventListener("change", () => void this.onSettingSave());
    autoPosition.addEventListener("change", () => void this.onSettingSave());
    treeCountdown.addEventListener("change", () => void this.onSettingSave());
  }

  syncSettingInputs() {
    const {autoEnable, autoMinutes, autoCountdown, autoPosition, treeCountdown} = this.settingEls;
    if (autoEnable) autoEnable.checked = !!this.settings.autoLockEnabled;
    if (autoMinutes) autoMinutes.value = String(this.settings.autoLockMinutes);
    if (autoCountdown) autoCountdown.checked = !!this.settings.autoLockShowCountdown;
    if (autoPosition) autoPosition.value = this.settings.autoLockPosition || "topbar";
    if (treeCountdown) treeCountdown.checked = !!this.settings.treeCountdownEnabled;
  }

  async onSettingSave() {
    const {autoEnable, autoMinutes, autoCountdown, autoPosition, treeCountdown} = this.settingEls;
    this.settings = {
      ...this.settings,
      autoLockEnabled: !!autoEnable?.checked,
      autoLockMinutes: clampInt(autoMinutes?.value, 1, 1440, DEFAULT_SETTINGS.autoLockMinutes),
      autoLockShowCountdown: !!autoCountdown?.checked,
      autoLockPosition: autoPosition?.value === "floating" ? "floating" : "topbar",
      treeCountdownEnabled: !!treeCountdown?.checked,
    };
    await this.saveSettings();
    this.applyAutoLockSettings();
    this.syncSettingInputs();
    this.renderSettingLockList();
    this.refreshDocTreeMarks();
  }

  formatTrustInfo(lock, now = nowTs()) {
    if (!lock) return this.t("misc.unknown");
    const key = makeLockKey(lock.type, lock.id);
    if (lock.policy === "trust") {
      if (lock.trustUntil && lock.trustUntil > now) {
        return `${this.t("settings.trustUntilTime", {
          time: formatTime(lock.trustUntil),
        })} (${this.t("settings.trustRemaining")} ${formatDuration(lock.trustUntil - now)})`;
      }
      return this.t("settings.trustExpired");
    }
    return this.sessionUnlocks.has(key) ? this.t("settings.sessionUnlocked") : this.t("settings.locked");
  }

  formatTreeTrustCountdown(lock, now = nowTs()) {
    if (!lock || lock.policy !== "trust") return "";
    if (!lock.trustUntil || lock.trustUntil <= now) return "";
    const remaining = lock.trustUntil - now;
    const parts = getCountdownParts(remaining);
    const min = String(parts.minutes);
    const sec = String(parts.seconds).padStart(2, "0");
    return this.t("tree.trustCountdown", {min, sec});
  }

  updateTreeTrustCountdowns() {
    if (!this.settings.treeCountdownEnabled) {
      document.querySelectorAll(".ui-lock-guard__tree-countdown").forEach((node) => node.remove());
      this.stopTreeTrustTick();
      return;
    }
    const nodes = document.querySelectorAll(".ui-lock-guard__tree-countdown[data-lock-key]");
    if (!nodes.length) {
      this.stopTreeTrustTick();
      return;
    }
    const now = nowTs();
    nodes.forEach((node) => {
      const key = node.getAttribute("data-lock-key") || "";
      const lock = this.getLockByKey(key);
      if (!lock || lock.policy !== "trust") {
        node.remove();
        return;
      }
      const text = this.formatTreeTrustCountdown(lock, now);
      if (!text) {
        node.remove();
        return;
      }
      if (node.textContent !== text) node.textContent = text;
    });
  }

  startTreeTrustTick() {
    if (this.treeTrustTick) return;
    this.treeTrustTick = setInterval(() => this.updateTreeTrustCountdowns(), 1000);
  }

  stopTreeTrustTick() {
    if (!this.treeTrustTick) return;
    clearInterval(this.treeTrustTick);
    this.treeTrustTick = null;
  }

  updateSettingLockListTrustInfo() {
    const wrap = this.settingEls.lockListWrap;
    if (!wrap || !wrap.isConnected) {
      return;
    }
    const now = nowTs();
    const items = wrap.querySelectorAll("[data-lock-key]");
    items.forEach((item) => {
      const key = item.getAttribute("data-lock-key");
      const lock = this.getLockByKey(key);
      if (!lock) return;
      const infoEl = item.querySelector("[data-trust-info]");
      if (!infoEl) return;
      const trustInfo = this.formatTrustInfo(lock, now);
      if (infoEl.textContent !== trustInfo) {
        infoEl.textContent = trustInfo;
      }
    });
  }

  startSettingLockTick() {
    if (this.settingLockTick) return;
    this.settingLockTick = setInterval(() => this.updateSettingLockListTrustInfo(), 1000);
  }

  stopSettingLockTick() {
    if (!this.settingLockTick) return;
    clearInterval(this.settingLockTick);
    this.settingLockTick = null;
  }

  renderSettingLockList() {
    const wrap = this.settingEls.lockListWrap;
    if (!wrap) return;
    const headerHtml = `<div class="ui-lock-guard__lock-header">${this.t("settings.lockListTitle")}</div>`;
    if (!this.locks.length) {
      wrap.innerHTML = `${headerHtml}<div class="ui-lock-guard__hint">${this.t("settings.emptyLocks")}</div>`;
      this.stopSettingLockTick();
      return;
    }
    const now = nowTs();
    const hasTrustLock = this.locks.some((lock) => lock.policy === "trust");
    wrap.innerHTML =
      headerHtml +
      this.locks
      .map((lock) => {
        const key = makeLockKey(lock.type, lock.id);
        const title = lock.title || this.t("misc.unknown");
        const typeLabel = this.t(lock.type === "notebook" ? "settings.notebook" : "settings.doc");
        const lockTypeLabel = this.t(
          lock.lockType === "pattern" ? "settings.lockTypePattern" : "settings.lockTypePassword",
        );
        const policyLabel =
          lock.policy === "trust"
            ? `${this.t("settings.policyTrust")} (${this.t("settings.trustMinutes", {
                min: lock.trustMinutes,
              })})`
            : this.t("settings.policyAlways");
        const trustInfo = this.formatTrustInfo(lock, now);
        return `
          <div class="ui-lock-guard__lock-item" data-lock-key="${escapeAttr(key)}">
            <div>
              <div class="ui-lock-guard__lock-title">${escapeHtml(title)}</div>
              <div class="ui-lock-guard__lock-meta">
                <span>${this.t("settings.type")}: ${escapeHtml(typeLabel)}</span>
                <span>${this.t("settings.lockType")}: ${escapeHtml(lockTypeLabel)}</span>
                <span>${this.t("settings.policy")}: ${escapeHtml(policyLabel)}</span>
                <span>${this.t("settings.trustUntil")}: <span data-trust-info>${escapeHtml(trustInfo)}</span></span>
                <span>ID: ${escapeHtml(lock.id)}</span>
              </div>
            </div>
            <div class="ui-lock-guard__lock-actions">
              <button class="b3-button b3-button--outline" data-action="unlock">${this.t(
                "settings.unlock",
              )}</button>
              <button class="b3-button b3-button--outline" data-action="remove">${this.t(
                "settings.removeLock",
              )}</button>
            </div>
          </div>
        `;
      })
      .join("");
    if (hasTrustLock) {
      this.startSettingLockTick();
    } else {
      this.stopSettingLockTick();
    }
  }

  onSettingLockListClick = (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const item = btn.closest("[data-lock-key]");
    if (!item) return;
    const lock = this.getLockByKey(item.getAttribute("data-lock-key"));
    if (!lock) return;
    const action = btn.getAttribute("data-action");
    if (action === "unlock") {
      void this.unlockLock(lock);
      return;
    }
    if (action === "remove") {
      void this.removeLock(lock);
    }
  };

  applyAutoLockSettings() {
    if (this.settings.autoLockEnabled) {
      this.startAutoLock();
    } else {
      this.stopAutoLock();
    }
    this.ensureCountdownContainer();
  }

  startAutoLock() {
    if (this.autoLockTimer) return;
    this.lastActivity = nowTs();
    this.autoLockTriggered = false;
    const handler = () => {
      this.lastActivity = nowTs();
      this.autoLockTriggered = false;
      this.updateCountdownDisplay();
    };
    this.autoLockTimer = handler;
    const events = [
      "keydown",
      "mousemove",
      "mousedown",
      "touchstart",
      "wheel",
      "pointerdown",
      "pointermove",
      "touchmove",
    ];
    events.forEach((evt) => window.addEventListener(evt, handler, true));
    this.autoLockTick = setInterval(() => this.tickAutoLock(), 1000);
  }

  stopAutoLock() {
    if (this.autoLockTimer) {
      const handler = this.autoLockTimer;
      const events = [
        "keydown",
        "mousemove",
        "mousedown",
        "touchstart",
        "wheel",
        "pointerdown",
        "pointermove",
        "touchmove",
      ];
      events.forEach((evt) => window.removeEventListener(evt, handler, true));
      this.autoLockTimer = null;
    }
    if (this.autoLockTick) {
      clearInterval(this.autoLockTick);
      this.autoLockTick = null;
    }
    this.updateCountdownDisplay(0, true);
  }

  async tickAutoLock() {
    if (!this.settings.autoLockEnabled) return;
    const timeoutMs = Math.max(1, this.settings.autoLockMinutes) * 60 * 1000;
    const elapsed = nowTs() - this.lastActivity;
    const remaining = Math.max(0, timeoutMs - elapsed);
    this.updateCountdownDisplay(remaining);
    if (remaining <= 0 && !this.autoLockTriggered) {
      this.autoLockTriggered = true;
      const ok = await this.triggerAppLock();
      if (ok) showMessage(this.t("autoLock.triggered"));
      else showMessage(this.t("autoLock.actionFailed"));
      this.lastActivity = nowTs();
    }
  }

  updateCountdownDisplay(remaining, forceHide = false) {
    if (!this.settings.autoLockShowCountdown || !this.settings.autoLockEnabled || forceHide) {
      if (this.topBarCountdown) this.topBarCountdown.style.display = "none";
      if (this.countdownFloating) this.countdownFloating.style.display = "none";
      return;
    }
    const position = this.settings.autoLockPosition === "floating" ? "floating" : "topbar";
    const container = position === "floating" ? this.countdownFloating : this.topBarCountdown;
    const textEl = position === "floating" ? this.countdownFloatingText : this.topBarCountdownText;
    if (!container || !textEl) return;
    const timeoutMs = Math.max(1, this.settings.autoLockMinutes) * 60 * 1000;
    const left = typeof remaining === "number" ? remaining : Math.max(0, timeoutMs - (nowTs() - this.lastActivity));
    const total = Math.ceil(left / 1000);
    const min = String(Math.floor(total / 60)).padStart(2, "0");
    const sec = String(total % 60).padStart(2, "0");
    textEl.textContent = `${min}:${sec}`;
    container.style.display = "";
  }

  ensureCountdownContainer() {
    if (!this.settings.autoLockShowCountdown || !this.settings.autoLockEnabled) {
      if (this.topBarCountdown) this.topBarCountdown.style.display = "none";
      if (this.countdownFloating) this.countdownFloating.style.display = "none";
      return;
    }
    const position = this.settings.autoLockPosition === "floating" ? "floating" : "topbar";
    if (position === "floating") {
      this.ensureCountdownFloating();
      this.applyFloatingPosition();
      if (this.topBarCountdown) this.topBarCountdown.style.display = "none";
    } else {
      this.ensureCountdownTopBar();
      if (this.countdownFloating) this.countdownFloating.style.display = "none";
    }
    this.updateCountdownDisplay();
  }

  ensureCountdownTopBar() {
    if (!this.topBarCountdown) {
      this.topBarCountdown = this.addTopBar({
        icon: LOCK_ICON_ID,
        title: this.t("autoLock.countdownTitle"),
        callback: () => {},
      });
      this.topBarCountdown.classList.add("ui-lock-guard__countdown");
      this.topBarCountdownText = document.createElement("strong");
      this.topBarCountdown.appendChild(this.topBarCountdownText);
    }
  }

  ensureCountdownFloating() {
    if (!this.countdownFloating) {
      this.countdownFloating = document.createElement("div");
      this.countdownFloating.className = "ui-lock-guard__countdown-float";
      this.countdownFloating.innerHTML = `<svg><use xlink:href="#${LOCK_ICON_ID}"></use></svg>`;
      this.countdownFloatingText = document.createElement("strong");
      this.countdownFloating.appendChild(this.countdownFloatingText);
      document.body.appendChild(this.countdownFloating);
    }
    this.applyFloatingPosition();
    this.bindFloatingDrag();
  }

  applyFloatingPosition() {
    const el = this.countdownFloating;
    if (!el) return;
    const margin = 8;
    const bounds = getFloatingBounds(el.offsetWidth, el.offsetHeight, margin);
    const map = ensureDeviceFloatMap(this.settings);
    const deviceKey = getDeviceKey();
    const entry = map[deviceKey] || {};
    let ratioX = clampRatio(entry.x);
    let ratioY = clampRatio(entry.y);
    let migrated = false;

    if (Number.isFinite(entry.x) && entry.x > 1) {
      ratioX = clampRatio(ratioFromPosition(entry.x, bounds.minLeft, bounds.spanX));
      migrated = true;
    }
    if (Number.isFinite(entry.y) && entry.y > 1) {
      ratioY = clampRatio(ratioFromPosition(entry.y, bounds.minTop, bounds.spanY));
      migrated = true;
    }

    if (migrated) {
      map[deviceKey] = {x: ratioX, y: ratioY};
      void this.saveSettings();
    }

    if (typeof ratioX !== "number" || typeof ratioY !== "number") {
      el.style.right = "24px";
      el.style.bottom = "24px";
      el.style.left = "auto";
      el.style.top = "auto";
      return;
    }
    const left = bounds.minLeft + bounds.spanX * ratioX;
    const top = bounds.minTop + bounds.spanY * ratioY;
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
  }

  bindFloatingDrag() {
    const el = this.countdownFloating;
    if (!el || el.dataset.dragBound === "1") return;
    el.dataset.dragBound = "1";
    el.addEventListener("pointerdown", (event) => {
      if (event.button && event.button !== 0) return;
      const rect = el.getBoundingClientRect();
      const bounds = getFloatingBounds(rect.width, rect.height, 8);
      let baseLeft = rect.left;
      let baseTop = rect.top;
      let currentLeft = baseLeft;
      let currentTop = baseTop;
      const startX = event.clientX;
      const startY = event.clientY;
      el.setPointerCapture?.(event.pointerId);
      event.preventDefault();

      const onMove = (moveEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        currentLeft = Math.min(Math.max(bounds.minLeft, baseLeft + dx), bounds.maxLeft);
        currentTop = Math.min(Math.max(bounds.minTop, baseTop + dy), bounds.maxTop);
        el.style.left = `${Math.round(currentLeft)}px`;
        el.style.top = `${Math.round(currentTop)}px`;
        el.style.right = "auto";
        el.style.bottom = "auto";
      };

      const onUp = () => {
        document.removeEventListener("pointermove", onMove, true);
        document.removeEventListener("pointerup", onUp, true);
        document.removeEventListener("pointercancel", onUp, true);
        const ratioX = clampRatio(ratioFromPosition(currentLeft, bounds.minLeft, bounds.spanX));
        const ratioY = clampRatio(ratioFromPosition(currentTop, bounds.minTop, bounds.spanY));
        const map = ensureDeviceFloatMap(this.settings);
        const deviceKey = getDeviceKey();
        map[deviceKey] = {x: ratioX, y: ratioY};
        void this.saveSettings();
      };

      document.addEventListener("pointermove", onMove, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("pointercancel", onUp, true);
    });
  }

  async triggerAppLock() {
    try {
      const ipcRenderer = globalThis?.require?.("electron")?.ipcRenderer;
      if (ipcRenderer?.send) {
        ipcRenderer.send("siyuan-send-windows", {cmd: "lockscreen"});
        return true;
      }
    } catch {
      // ignore
    }
    try {
      await fetchSyncPost("/api/system/logoutAuth", {});
      const url = new URL(window.location.origin);
      url.pathname = "/check-auth";
      url.searchParams.set("to", window.location.href);
      window.location.href = url.href;
      return true;
    } catch {
      // ignore
    }
    const fallbackFns = [
      () => globalThis.siyuan?.lockScreen?.open?.(),
      () => globalThis.siyuan?.lockScreen?.show?.(),
      () => globalThis.siyuan?.lockScreen?.lock?.(),
      () => globalThis.siyuan?.layout?.lockScreen?.open?.(),
      () => globalThis.siyuan?.layout?.lockScreen?.show?.(),
      () => globalThis.siyuan?.layout?.lockScreen?.lock?.(),
      () => globalThis.siyuan?.layout?.lock?.open?.(),
      () => globalThis.siyuan?.layout?.lock?.show?.(),
      () => globalThis.siyuan?.layout?.lock?.lock?.(),
      () => globalThis.siyuan?.mobile?.lockScreen?.open?.(),
      () => globalThis.siyuan?.mobile?.lockScreen?.show?.(),
    ];
    for (const fn of fallbackFns) {
      try {
        const result = fn();
        if (result !== undefined) return true;
      } catch {
        // ignore
      }
    }
    return false;
  }
}

module.exports = UiLockGuardPlugin;
module.exports.default = UiLockGuardPlugin;
