const STORAGE_KEY = "thaiTimetablePlanner.v1";
const MAX_BACKGROUND_LENGTH = 1200000;
const MAX_BACKGROUND_SIDE = 1800;

const dayNames = [
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
];

const dayNamesEn = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const palette = [
  "#7c6cff",
  "#00a8a8",
  "#ff6b6b",
  "#f5b041",
  "#2ecc71",
  "#3498db",
  "#d65db1",
  "#6c5ce7",
  "#ff9671",
  "#008f7a",
  "#845ec2",
  "#c34a36",
  "#4d8076",
  "#f9c74f",
  "#577590",
  "#43aa8b",
];

let state = loadState();
let editingEntry = null;

const elements = {
  authScreen: document.getElementById("authScreen"),
  appScreen: document.getElementById("appScreen"),
  loginTab: document.getElementById("loginTab"),
  registerTab: document.getElementById("registerTab"),
  loginForm: document.getElementById("loginForm"),
  registerForm: document.getElementById("registerForm"),
  loginEmail: document.getElementById("loginEmail"),
  loginPassword: document.getElementById("loginPassword"),
  registerName: document.getElementById("registerName"),
  registerEmail: document.getElementById("registerEmail"),
  registerPassword: document.getElementById("registerPassword"),
  authMessage: document.getElementById("authMessage"),
  demoButton: document.getElementById("demoButton"),
  logoutButton: document.getElementById("logoutButton"),
  userBadge: document.getElementById("userBadge"),
  backgroundInput: document.getElementById("backgroundInput"),
  clearBackgroundButton: document.getElementById("clearBackgroundButton"),
  backgroundStatus: document.getElementById("backgroundStatus"),
  viewFilter: document.getElementById("viewFilter"),
  scopeFilter: document.getElementById("scopeFilter"),
  orientationFilter: document.getElementById("orientationFilter"),
  headerLanguageFilter: document.getElementById("headerLanguageFilter"),
  dayStartInput: document.getElementById("dayStartInput"),
  dayEndInput: document.getElementById("dayEndInput"),
  downloadImageButton: document.getElementById("downloadImageButton"),
  printPdfButton: document.getElementById("printPdfButton"),
  scheduleList: document.getElementById("scheduleList"),
  scheduleForm: document.getElementById("scheduleForm"),
  scheduleNameInput: document.getElementById("scheduleNameInput"),
  entryForm: document.getElementById("entryForm"),
  entryFormTitle: document.getElementById("entryFormTitle"),
  cancelEditButton: document.getElementById("cancelEditButton"),
  entryTitle: document.getElementById("entryTitle"),
  entryCategory: document.getElementById("entryCategory"),
  entrySchedule: document.getElementById("entrySchedule"),
  entryDay: document.getElementById("entryDay"),
  entryStart: document.getElementById("entryStart"),
  entryEnd: document.getElementById("entryEnd"),
  entryRoom: document.getElementById("entryRoom"),
  entryNote: document.getElementById("entryNote"),
  entryColor: document.getElementById("entryColor"),
  colorSwatches: document.getElementById("colorSwatches"),
  calendarGrid: document.getElementById("calendarGrid"),
  calendarTitle: document.getElementById("calendarTitle"),
  calendarSubtitle: document.getElementById("calendarSubtitle"),
  conflictCounter: document.getElementById("conflictCounter"),
  freeTimeList: document.getElementById("freeTimeList"),
  conflictList: document.getElementById("conflictList"),
  entryList: document.getElementById("entryList"),
};

init();

function init() {
  fillDayOptions();
  fillColorSwatches();
  bindAuth();
  bindToolbar();
  bindScheduleForm();
  bindEntryForm();
  render();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { users: [], sessionEmail: "" };
    }
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessionEmail: parsed.sessionEmail || "",
    };
  } catch {
    return { users: [], sessionEmail: "" };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    alert("บันทึกข้อมูลไม่ได้ อาจเป็นเพราะพื้นที่ localStorage เต็มหรือรูปพื้นหลังมีขนาดใหญ่เกินไป");
    return false;
  }
}

function bindAuth() {
  elements.loginTab.addEventListener("click", () => setAuthMode("login"));
  elements.registerTab.addEventListener("click", () => setAuthMode("register"));

  elements.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = normalizeEmail(elements.loginEmail.value);
    const password = elements.loginPassword.value;
    const user = state.users.find((item) => item.email === email);

    if (!user || user.password !== password) {
      elements.authMessage.textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      return;
    }

    state.sessionEmail = user.email;
    ensureUserDefaults(user);
    saveState();
    elements.authMessage.textContent = "";
    render();
  });

  elements.registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = elements.registerName.value.trim();
    const email = normalizeEmail(elements.registerEmail.value);
    const password = elements.registerPassword.value;

    if (state.users.some((item) => item.email === email)) {
      elements.authMessage.textContent = "อีเมลนี้ถูกใช้แล้ว";
      return;
    }

    const user = {
      id: createId(),
      name,
      email,
      password,
      preferences: defaultPreferences(),
      activeScheduleId: "",
      schedules: [createSchedule("ตารางเรียนหลัก")],
    };
    user.activeScheduleId = user.schedules[0].id;
    state.users.push(user);
    state.sessionEmail = user.email;
    saveState();
    elements.authMessage.textContent = "";
    render();
  });

  elements.demoButton.addEventListener("click", () => {
    let demoUser = state.users.find((user) => user.email === "demo@planner.local");
    if (!demoUser) {
      demoUser = createDemoUser();
      state.users.push(demoUser);
    }
    state.sessionEmail = demoUser.email;
    ensureUserDefaults(demoUser);
    saveState();
    render();
  });

  elements.logoutButton.addEventListener("click", () => {
    state.sessionEmail = "";
    editingEntry = null;
    saveState();
    render();
  });
}

function bindToolbar() {
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.addEventListener("click", () => {
      const user = currentUser();
      if (!user) return;
      user.preferences.theme = button.dataset.themeChoice;
      saveState();
      render();
    });
  });

  elements.backgroundInput.addEventListener("change", async (event) => {
    const user = currentUser();
    const file = event.target.files && event.target.files[0];
    if (!user || !file) return;

    if (!file.type.startsWith("image/")) {
      setBackgroundStatus("กรุณาเลือกไฟล์รูปภาพ");
      elements.backgroundInput.value = "";
      return;
    }

    const previousImage = user.preferences.backgroundImage || "";
    setBackgroundStatus("กำลังเตรียมรูป...");
    elements.backgroundInput.disabled = true;

    try {
      user.preferences.backgroundImage = await prepareBackgroundImage(file);
      if (saveState()) {
        setBackgroundStatus("เพิ่มภาพพื้นหลังแล้ว");
      } else {
        user.preferences.backgroundImage = previousImage;
        setBackgroundStatus("บันทึกรูปไม่สำเร็จ รูปอาจใหญ่เกินไป");
      }
      render();
    } catch (error) {
      user.preferences.backgroundImage = previousImage;
      setBackgroundStatus(error.message || "เพิ่มภาพพื้นหลังไม่สำเร็จ");
    } finally {
      elements.backgroundInput.value = "";
      elements.backgroundInput.disabled = false;
    }
  });

  elements.clearBackgroundButton.addEventListener("click", () => {
    const user = currentUser();
    if (!user) return;
    user.preferences.backgroundImage = "";
    setBackgroundStatus("ล้างภาพพื้นหลังแล้ว");
    saveState();
    render();
  });

  elements.viewFilter.addEventListener("change", () => {
    const user = currentUser();
    if (!user) return;
    user.preferences.view = elements.viewFilter.value;
    saveState();
    render();
  });

  elements.scopeFilter.addEventListener("change", () => {
    const user = currentUser();
    if (!user) return;
    user.preferences.scope = elements.scopeFilter.value;
    saveState();
    render();
  });

  elements.orientationFilter.addEventListener("change", () => {
    const user = currentUser();
    if (!user) return;
    user.preferences.orientation = elements.orientationFilter.value;
    saveState();
    render();
  });

  elements.headerLanguageFilter.addEventListener("change", () => {
    const user = currentUser();
    if (!user) return;
    user.preferences.headerLanguage = elements.headerLanguageFilter.value;
    saveState();
    render();
  });

  elements.dayStartInput.addEventListener("change", updateDayWindow);
  elements.dayEndInput.addEventListener("change", updateDayWindow);
  elements.downloadImageButton.addEventListener("click", downloadPng);
  elements.printPdfButton.addEventListener("click", () => window.print());
}

function bindScheduleForm() {
  elements.scheduleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = currentUser();
    const name = elements.scheduleNameInput.value.trim();
    if (!user || !name) return;

    const schedule = createSchedule(name);
    user.schedules.push(schedule);
    user.activeScheduleId = schedule.id;
    elements.scheduleNameInput.value = "";
    saveState();
    render();
  });
}

function bindEntryForm() {
  elements.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const user = currentUser();
    if (!user) return;

    const entry = readEntryForm();
    if (!entry) return;

    if (editingEntry) {
      const oldSchedule = user.schedules.find((schedule) => schedule.id === editingEntry.scheduleId);
      const newSchedule = user.schedules.find((schedule) => schedule.id === entry.scheduleId);
      if (!oldSchedule || !newSchedule) return;

      const index = oldSchedule.entries.findIndex((item) => item.id === editingEntry.id);
      if (index === -1) return;

      const updated = { ...entry, id: editingEntry.id };
      if (oldSchedule.id === newSchedule.id) {
        oldSchedule.entries[index] = updated;
      } else {
        oldSchedule.entries.splice(index, 1);
        newSchedule.entries.push(updated);
        user.activeScheduleId = newSchedule.id;
      }
      editingEntry = null;
    } else {
      const schedule = user.schedules.find((item) => item.id === entry.scheduleId);
      if (!schedule) return;
      schedule.entries.push({ ...entry, id: createId() });
      user.activeScheduleId = schedule.id;
    }

    resetEntryForm();
    saveState();
    render();
  });

  elements.cancelEditButton.addEventListener("click", () => {
    editingEntry = null;
    resetEntryForm();
    render();
  });
}

function fillDayOptions() {
  elements.entryDay.innerHTML = dayNames
    .map((name, index) => `<option value="${index}">${name}</option>`)
    .join("");
}

function fillColorSwatches() {
  elements.colorSwatches.innerHTML = "";
  palette.forEach((color) => {
    const button = document.createElement("button");
    button.className = "swatch";
    button.type = "button";
    button.style.setProperty("--swatch", color);
    button.setAttribute("aria-label", `เลือกสี ${color}`);
    button.addEventListener("click", () => {
      elements.entryColor.value = color;
    });
    elements.colorSwatches.appendChild(button);
  });
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  elements.loginTab.classList.toggle("active", isLogin);
  elements.registerTab.classList.toggle("active", !isLogin);
  elements.loginForm.classList.toggle("hidden", !isLogin);
  elements.registerForm.classList.toggle("hidden", isLogin);
  elements.authMessage.textContent = "";
}

function render() {
  const user = currentUser();
  if (!user) {
    elements.authScreen.classList.remove("hidden");
    elements.appScreen.classList.add("hidden");
    document.body.dataset.theme = "pastel";
    document.body.classList.remove("has-wallpaper");
    document.body.style.setProperty("--wallpaper", "none");
    document.body.style.setProperty("--wallpaper-opacity", "0");
    return;
  }

  ensureUserDefaults(user);
  elements.authScreen.classList.add("hidden");
  elements.appScreen.classList.remove("hidden");
  applyPreferences(user);
  renderToolbar(user);
  renderScheduleList(user);
  renderEntryScheduleOptions(user);
  renderCalendarModern(user);
  renderFreeTimes(user);
  renderConflicts(user);
  renderEntryList(user);
  renderEntryFormState(user);
}

function applyPreferences(user) {
  const preferences = user.preferences;
  document.body.dataset.theme = preferences.theme;
  document.body.classList.toggle("has-wallpaper", Boolean(preferences.backgroundImage));
  document.body.style.setProperty(
    "--wallpaper",
    preferences.backgroundImage ? `url("${preferences.backgroundImage}")` : "none",
  );
  document.body.style.setProperty("--wallpaper-opacity", preferences.backgroundImage ? "0.45" : "0");
}

function renderToolbar(user) {
  elements.userBadge.textContent = user.name || user.email;
  document.querySelectorAll("[data-theme-choice]").forEach((button) => {
    button.classList.toggle("active", button.dataset.themeChoice === user.preferences.theme);
  });
  elements.viewFilter.value = user.preferences.view;
  elements.scopeFilter.value = user.preferences.scope;
  elements.orientationFilter.value = user.preferences.orientation;
  elements.headerLanguageFilter.value = user.preferences.headerLanguage;
  elements.dayStartInput.value = user.preferences.dayStart;
  elements.dayEndInput.value = user.preferences.dayEnd;
  setBackgroundStatus(user.preferences.backgroundImage ? "มีภาพพื้นหลังแล้ว" : "");
}

function renderScheduleList(user) {
  elements.scheduleList.innerHTML = "";
  user.schedules.forEach((schedule) => {
    const row = document.createElement("div");
    row.className = "schedule-item";

    const switchButton = document.createElement("button");
    switchButton.type = "button";
    switchButton.className = "schedule-chip";
    switchButton.classList.toggle("active", schedule.id === user.activeScheduleId);
    switchButton.textContent = `${schedule.name} (${schedule.entries.length})`;
    switchButton.addEventListener("click", () => {
      user.activeScheduleId = schedule.id;
      saveState();
      render();
    });

    const renameButton = document.createElement("button");
    renameButton.type = "button";
    renameButton.className = "ghost-button compact";
    renameButton.textContent = "แก้";
    renameButton.addEventListener("click", () => renameSchedule(user, schedule));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost-button compact";
    deleteButton.textContent = "ลบ";
    deleteButton.addEventListener("click", () => deleteSchedule(user, schedule));

    row.append(switchButton, renameButton, deleteButton);
    elements.scheduleList.appendChild(row);
  });
}

function renameSchedule(user, schedule) {
  const nextName = prompt("ชื่อตาราง", schedule.name);
  if (!nextName || !nextName.trim()) return;
  schedule.name = nextName.trim();
  saveState();
  render();
}

function deleteSchedule(user, schedule) {
  if (user.schedules.length <= 1) {
    alert("ต้องมีอย่างน้อย 1 ตาราง");
    return;
  }
  if (!confirm(`ลบ "${schedule.name}" หรือไม่`)) return;
  user.schedules = user.schedules.filter((item) => item.id !== schedule.id);
  if (user.activeScheduleId === schedule.id) {
    user.activeScheduleId = user.schedules[0].id;
  }
  if (editingEntry && editingEntry.scheduleId === schedule.id) {
    editingEntry = null;
    resetEntryForm();
  }
  saveState();
  render();
}

function renderEntryScheduleOptions(user) {
  const selectedValue = editingEntry ? editingEntry.scheduleId : user.activeScheduleId;
  elements.entrySchedule.innerHTML = user.schedules
    .map((schedule) => `<option value="${schedule.id}">${escapeHtml(schedule.name)}</option>`)
    .join("");
  elements.entrySchedule.value = selectedValue;
}

function renderEntryFormState(user) {
  elements.entryFormTitle.textContent = editingEntry ? "แก้ไขรายการ" : "เพิ่มรายการ";
  elements.cancelEditButton.classList.toggle("hidden", !editingEntry);
  if (!editingEntry && !elements.entryStart.value && !elements.entryEnd.value) {
    elements.entryStart.value = "09:00";
    elements.entryEnd.value = "10:30";
    elements.entrySchedule.value = user.activeScheduleId;
  }
}

function renderCalendar(user) {
  const preferences = user.preferences;
  const activeSchedule = getActiveSchedule(user);
  const visibleEntries = getVisibleEntries(user);
  const conflictMap = getConflictMap(visibleEntries);
  const conflicts = getConflicts(visibleEntries);
  const { start, end } = getDayWindow(user);
  const hourSpan = Math.max((end - start) / 60, 1);
  const grid = elements.calendarGrid;

  elements.calendarTitle.textContent = preferences.scope === "all" ? "ทุกตาราง" : activeSchedule.name;
  elements.calendarSubtitle.textContent = `${viewLabel(preferences.view)} • ${formatTime(start)}-${formatTime(end)}`;
  elements.conflictCounter.textContent = `${conflicts.length} ชนกัน`;

  grid.innerHTML = "";
  grid.style.setProperty("--calendar-hours", String(hourSpan));

  const corner = document.createElement("div");
  corner.className = "corner-cell";
  grid.appendChild(corner);

  dayNames.forEach((name, index) => {
    const header = document.createElement("div");
    header.className = "day-header";
    header.style.gridColumn = String(index + 2);
    header.style.gridRow = "1";
    header.textContent = name;
    grid.appendChild(header);
  });

  const timeColumn = document.createElement("div");
  timeColumn.className = "time-column";
  for (let minute = start; minute <= end; minute += 60) {
    const label = document.createElement("div");
    label.className = "time-label";
    label.style.setProperty("--top", `${((minute - start) / (end - start)) * 100}%`);
    label.textContent = formatTime(minute);
    timeColumn.appendChild(label);
  }
  grid.appendChild(timeColumn);

  dayNames.forEach((_, dayIndex) => {
    const column = document.createElement("div");
    column.className = "day-column";
    column.style.gridColumn = String(dayIndex + 2);
    column.style.gridRow = "2";

    const dayEntries = visibleEntries.filter((entry) => {
      const entryStart = toMinutes(entry.start);
      const entryEnd = toMinutes(entry.end);
      return Number(entry.day) === dayIndex && entryEnd > start && entryStart < end;
    });
    const layouts = layoutDayEntries(dayEntries, start, end);

    layouts.forEach((layout) => {
      const block = document.createElement("button");
      const key = eventKey(layout.entry);
      const hasConflict = conflictMap.has(key);
      block.type = "button";
      block.className = `event-block${hasConflict ? " conflict" : ""}`;
      block.style.setProperty("--event-top", `${layout.top}%`);
      block.style.setProperty("--event-left", `calc(${(layout.lane / layout.laneCount) * 100}% + 6px)`);
      block.style.setProperty("--event-width", `calc(${100 / layout.laneCount}% - 11px)`);
      block.style.setProperty("--event-color", layout.entry.color);
      block.style.setProperty("--event-text", readableTextColor(layout.entry.color));
      block.style.height = layout.height < 5 ? "34px" : `calc(${layout.height}% - 7px)`;
      block.title = `${layout.entry.title} ${layout.entry.start}-${layout.entry.end}`;
      block.addEventListener("click", () => startEditingEntry(layout.entry));
      block.innerHTML = `
        <div class="event-title">${escapeHtml(layout.entry.title)}</div>
        <div class="event-meta">
          <span>${layout.entry.start}-${layout.entry.end}</span>
          <span>${escapeHtml(layout.entry.room || layout.entry.scheduleName || "")}</span>
        </div>
      `;
      column.appendChild(block);
    });

    grid.appendChild(column);
  });
}

function renderFreeTimes(user) {
  const freeSlotsByDay = getFreeSlots(user);
  elements.freeTimeList.innerHTML = "";

  freeSlotsByDay.forEach((item) => {
    const row = document.createElement("div");
    row.className = "free-row";
    const title = document.createElement("strong");
    title.textContent = item.dayName;
    const chips = document.createElement("div");
    chips.className = "free-slots";

    if (item.slots.length === 0) {
      const empty = document.createElement("span");
      empty.className = "free-chip";
      empty.textContent = "ไม่มีช่วงว่าง";
      chips.appendChild(empty);
    } else {
      item.slots.forEach((slot) => {
        const chip = document.createElement("span");
        chip.className = "free-chip";
        chip.textContent = `${formatTime(slot.start)}-${formatTime(slot.end)}`;
        chips.appendChild(chip);
      });
    }

    row.append(title, chips);
    elements.freeTimeList.appendChild(row);
  });
}

function renderConflicts(user) {
  const conflicts = getConflicts(getVisibleEntries(user));
  elements.conflictList.innerHTML = "";

  if (conflicts.length === 0) {
    elements.conflictList.innerHTML = '<div class="empty-state">ไม่มีรายการชนกันในมุมมองนี้</div>';
    return;
  }

  conflicts.forEach(({ a, b }) => {
    const row = document.createElement("div");
    row.className = "conflict-row";
    row.innerHTML = `
      <strong>${dayNames[a.day]} ${overlapText(a, b)}</strong>
      <span>${escapeHtml(a.title)} (${escapeHtml(a.scheduleName)})</span>
      <span>${escapeHtml(b.title)} (${escapeHtml(b.scheduleName)})</span>
    `;
    elements.conflictList.appendChild(row);
  });
}

function renderEntryList(user) {
  const entries = getVisibleEntries(user).sort(entrySorter);
  const conflictMap = getConflictMap(entries);
  elements.entryList.innerHTML = "";

  if (entries.length === 0) {
    elements.entryList.innerHTML = '<div class="empty-state">ยังไม่มีรายการในมุมมองนี้</div>';
    return;
  }

  entries.forEach((entry) => {
    const row = document.createElement("div");
    row.className = "entry-row";
    const categoryClass = entry.category === "class" ? "class" : "work";
    const hasConflict = conflictMap.has(eventKey(entry));
    row.innerHTML = `
      <div class="entry-color" style="--entry-color: ${entry.color}"></div>
      <div class="entry-details">
        <strong>${escapeHtml(entry.title)}</strong>
        <span class="entry-meta-line">
          ${dayNames[entry.day]} ${entry.start}-${entry.end} • ${escapeHtml(entry.room || "-")} • ${escapeHtml(entry.scheduleName)}
        </span>
        <span>
          <span class="category-pill ${categoryClass}">${entry.category === "class" ? "ตารางเรียน" : "งานอื่นๆ"}</span>
          ${hasConflict ? '<span class="category-pill">ชนกัน</span>' : ""}
        </span>
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "ghost-button compact";
    editButton.textContent = "แก้ไข";
    editButton.addEventListener("click", () => startEditingEntry(entry));
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost-button compact";
    deleteButton.textContent = "ลบ";
    deleteButton.addEventListener("click", () => deleteEntry(entry));
    actions.append(editButton, deleteButton);
    row.appendChild(actions);
    elements.entryList.appendChild(row);
  });
}

async function prepareBackgroundImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  let maxSide = MAX_BACKGROUND_SIDE;
  let quality = 0.84;
  let output = "";

  for (let attempt = 0; attempt < 12; attempt += 1) {
    output = renderBackgroundDataUrl(image, maxSide, quality);
    if (output.length <= MAX_BACKGROUND_LENGTH) {
      return output;
    }

    if (quality > 0.58) {
      quality -= 0.08;
    } else {
      maxSide = Math.round(maxSide * 0.78);
      quality = 0.78;
    }
  }

  if (output && output.length <= MAX_BACKGROUND_LENGTH * 1.25) {
    return output;
  }

  throw new Error("รูปนี้ใหญ่เกินไป ลองเลือกรูปที่เล็กลง");
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("อ่านไฟล์รูปไม่ได้"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("ไฟล์รูปนี้เปิดไม่ได้"));
    image.src = src;
  });
}

function renderBackgroundDataUrl(image, maxSide, quality) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  if (!width || !height) {
    throw new Error("รูปนี้ไม่มีขนาดภาพที่อ่านได้");
  }

  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function setBackgroundStatus(message) {
  if (elements.backgroundStatus) {
    elements.backgroundStatus.textContent = message;
  }
}

function updateDayWindow() {
  const user = currentUser();
  if (!user) return;
  const start = toMinutes(elements.dayStartInput.value);
  const end = toMinutes(elements.dayEndInput.value);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    alert("ช่วงเวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม");
    elements.dayStartInput.value = user.preferences.dayStart;
    elements.dayEndInput.value = user.preferences.dayEnd;
    return;
  }
  user.preferences.dayStart = elements.dayStartInput.value;
  user.preferences.dayEnd = elements.dayEndInput.value;
  saveState();
  render();
}

function readEntryForm() {
  const title = elements.entryTitle.value.trim();
  const scheduleId = elements.entrySchedule.value;
  const start = elements.entryStart.value;
  const end = elements.entryEnd.value;
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);

  if (!title) {
    alert("กรุณาใส่ชื่อรายวิชาหรืองาน");
    return null;
  }
  if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) {
    alert("เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม");
    return null;
  }

  return {
    scheduleId,
    title,
    category: elements.entryCategory.value,
    day: Number(elements.entryDay.value),
    start,
    end,
    room: elements.entryRoom.value.trim(),
    note: elements.entryNote.value.trim(),
    color: elements.entryColor.value,
  };
}

function resetEntryForm() {
  const user = currentUser();
  elements.entryForm.reset();
  elements.entryColor.value = "#7c6cff";
  elements.entryStart.value = "09:00";
  elements.entryEnd.value = "10:30";
  if (user) {
    elements.entrySchedule.value = user.activeScheduleId;
  }
}

function startEditingEntry(entry) {
  const user = currentUser();
  if (!user) return;
  editingEntry = { id: entry.id, scheduleId: entry.scheduleId };
  user.activeScheduleId = entry.scheduleId;
  elements.entryTitle.value = entry.title;
  elements.entryCategory.value = entry.category;
  elements.entrySchedule.value = entry.scheduleId;
  elements.entryDay.value = entry.day;
  elements.entryStart.value = entry.start;
  elements.entryEnd.value = entry.end;
  elements.entryRoom.value = entry.room || "";
  elements.entryNote.value = entry.note || "";
  elements.entryColor.value = entry.color || "#7c6cff";
  saveState();
  render();
  document.querySelector(".sidebar").scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteEntry(entry) {
  const user = currentUser();
  if (!user) return;
  if (!confirm(`ลบ "${entry.title}" หรือไม่`)) return;
  const schedule = user.schedules.find((item) => item.id === entry.scheduleId);
  if (!schedule) return;
  schedule.entries = schedule.entries.filter((item) => item.id !== entry.id);
  if (editingEntry && editingEntry.id === entry.id && editingEntry.scheduleId === entry.scheduleId) {
    editingEntry = null;
    resetEntryForm();
  }
  saveState();
  render();
}

function getVisibleEntries(user) {
  const schedules = user.preferences.scope === "all" ? user.schedules : [getActiveSchedule(user)];
  return schedules
    .flatMap((schedule) =>
      schedule.entries.map((entry) => ({
        ...entry,
        day: Number(entry.day),
        scheduleId: schedule.id,
        scheduleName: schedule.name,
      })),
    )
    .filter((entry) => user.preferences.view === "all" || entry.category === user.preferences.view);
}

function getFreeSlots(user) {
  const entries = getVisibleEntries(user);
  const { start, end } = getDayWindow(user);

  return dayNames.map((dayName, dayIndex) => {
    const busy = entries
      .filter((entry) => Number(entry.day) === dayIndex)
      .map((entry) => ({
        start: Math.max(start, toMinutes(entry.start)),
        end: Math.min(end, toMinutes(entry.end)),
      }))
      .filter((slot) => slot.end > slot.start)
      .sort((a, b) => a.start - b.start);

    const merged = [];
    busy.forEach((slot) => {
      const last = merged[merged.length - 1];
      if (!last || slot.start > last.end) {
        merged.push({ ...slot });
      } else {
        last.end = Math.max(last.end, slot.end);
      }
    });

    const slots = [];
    let cursor = start;
    merged.forEach((slot) => {
      if (slot.start > cursor) {
        slots.push({ start: cursor, end: slot.start });
      }
      cursor = Math.max(cursor, slot.end);
    });
    if (cursor < end) {
      slots.push({ start: cursor, end });
    }
    return { dayName, slots };
  });
}

function getConflicts(entries) {
  const conflicts = [];
  for (let index = 0; index < entries.length; index += 1) {
    for (let next = index + 1; next < entries.length; next += 1) {
      const a = entries[index];
      const b = entries[next];
      if (
        Number(a.day) === Number(b.day) &&
        toMinutes(a.start) < toMinutes(b.end) &&
        toMinutes(b.start) < toMinutes(a.end)
      ) {
        conflicts.push({ a, b });
      }
    }
  }
  return conflicts.sort((first, second) => entrySorter(first.a, second.a));
}

function getConflictMap(entries) {
  const map = new Set();
  getConflicts(entries).forEach(({ a, b }) => {
    map.add(eventKey(a));
    map.add(eventKey(b));
  });
  return map;
}

function layoutDayEntries(entries, windowStart, windowEnd) {
  const sorted = entries
    .map((entry) => ({
      entry,
      start: toMinutes(entry.start),
      end: toMinutes(entry.end),
    }))
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const clusters = [];
  let current = [];
  let clusterEnd = -1;

  sorted.forEach((item) => {
    if (current.length === 0 || item.start < clusterEnd) {
      current.push(item);
      clusterEnd = Math.max(clusterEnd, item.end);
      return;
    }
    clusters.push(current);
    current = [item];
    clusterEnd = item.end;
  });
  if (current.length > 0) {
    clusters.push(current);
  }

  return clusters.flatMap((cluster) => {
    const laneEnds = [];
    const placed = cluster.map((item) => {
      let lane = laneEnds.findIndex((end) => item.start >= end);
      if (lane === -1) {
        lane = laneEnds.length;
      }
      laneEnds[lane] = item.end;
      return { ...item, lane };
    });

    const laneCount = Math.max(laneEnds.length, 1);
    return placed.map((item) => {
      const clippedStart = Math.max(item.start, windowStart);
      const clippedEnd = Math.min(item.end, windowEnd);
      const windowLength = Math.max(windowEnd - windowStart, 1);
      return {
        entry: item.entry,
        lane: item.lane,
        laneCount,
        top: ((clippedStart - windowStart) / windowLength) * 100,
        height: ((clippedEnd - clippedStart) / windowLength) * 100,
      };
    });
  });
}

function downloadPng() {
  const user = currentUser();
  if (!user) return;

  const scale = 2;
  const width = 1600;
  const height = 1100;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext("2d");
  context.scale(scale, scale);

  const styles = getComputedStyle(document.body);
  const surface = styles.getPropertyValue("--surface").trim() || "#ffffff";
  const surface2 = styles.getPropertyValue("--surface-2").trim() || "#f4f7fb";
  const text = styles.getPropertyValue("--text").trim() || "#17202a";
  const muted = styles.getPropertyValue("--muted").trim() || "#697386";
  const line = styles.getPropertyValue("--line").trim() || "#d9e0ea";
  const accent = styles.getPropertyValue("--accent").trim() || "#3f8f8d";
  const accent2 = styles.getPropertyValue("--accent-2").trim() || "#e45668";

  roundRect(context, 0, 0, width, height, 0, surface, surface);
  context.fillStyle = surface2;
  roundRect(context, 32, 28, width - 64, height - 56, 8, surface2, line);

  context.fillStyle = text;
  context.font = "800 34px Segoe UI, Tahoma, sans-serif";
  const title = user.preferences.scope === "all" ? "ทุกตาราง" : getActiveSchedule(user).name;
  context.fillText(title, 64, 82);
  context.font = "700 18px Segoe UI, Tahoma, sans-serif";
  context.fillStyle = muted;
  const { start, end } = getDayWindow(user);
  context.fillText(`${viewLabel(user.preferences.view)} • ${formatTime(start)}-${formatTime(end)}`, 64, 112);

  const entries = getVisibleEntries(user);
  const conflicts = getConflicts(entries);
  context.fillStyle = conflicts.length > 0 ? accent2 : accent;
  roundRect(context, width - 220, 54, 150, 38, 8, context.fillStyle, "transparent");
  context.fillStyle = readableTextColor(conflicts.length > 0 ? accent2 : accent);
  context.font = "800 17px Segoe UI, Tahoma, sans-serif";
  context.fillText(`${conflicts.length} ชนกัน`, width - 184, 79);

  const gridX = 118;
  const gridY = 150;
  const gridW = 1400;
  const gridH = 760;
  const timeW = 90;
  const dayW = (gridW - timeW) / dayNames.length;
  const conflictMap = getConflictMap(entries);

  roundRect(context, gridX, gridY, gridW, gridH, 8, surface, line);
  context.fillStyle = surface2;
  context.fillRect(gridX, gridY, gridW, 46);
  context.strokeStyle = line;
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(gridX, gridY + 46);
  context.lineTo(gridX + gridW, gridY + 46);
  context.stroke();

  context.font = "800 16px Segoe UI, Tahoma, sans-serif";
  context.fillStyle = text;
  dayNames.forEach((name, index) => {
    const x = gridX + timeW + dayW * index;
    context.fillText(name, x + dayW / 2 - context.measureText(name).width / 2, gridY + 30);
    context.strokeStyle = line;
    context.beginPath();
    context.moveTo(x, gridY);
    context.lineTo(x, gridY + gridH);
    context.stroke();
  });

  context.font = "700 13px Segoe UI, Tahoma, sans-serif";
  for (let minute = start; minute <= end; minute += 60) {
    const y = gridY + 46 + ((minute - start) / (end - start)) * (gridH - 46);
    context.strokeStyle = line;
    context.beginPath();
    context.moveTo(gridX, y);
    context.lineTo(gridX + gridW, y);
    context.stroke();
    context.fillStyle = muted;
    context.fillText(formatTime(minute), gridX + 16, y + 5);
  }

  dayNames.forEach((_, dayIndex) => {
    const dayEntries = entries.filter((entry) => {
      const entryStart = toMinutes(entry.start);
      const entryEnd = toMinutes(entry.end);
      return Number(entry.day) === dayIndex && entryEnd > start && entryStart < end;
    });
    const layouts = layoutDayEntries(dayEntries, start, end);
    layouts.forEach((layout) => {
      const xBase = gridX + timeW + dayW * dayIndex + 8;
      const laneW = (dayW - 16) / layout.laneCount;
      const x = xBase + laneW * layout.lane;
      const y = gridY + 46 + (layout.top / 100) * (gridH - 46) + 4;
      const w = laneW - 6;
      const h = Math.max(36, (layout.height / 100) * (gridH - 46) - 8);
      const color = layout.entry.color || accent;
      roundRect(context, x, y, w, h, 8, color, conflictMap.has(eventKey(layout.entry)) ? accent2 : "rgba(255,255,255,0.72)");
      context.fillStyle = readableTextColor(color);
      context.font = "800 14px Segoe UI, Tahoma, sans-serif";
      drawTrimmedText(context, layout.entry.title, x + 10, y + 22, w - 20);
      context.font = "700 12px Segoe UI, Tahoma, sans-serif";
      drawTrimmedText(context, `${layout.entry.start}-${layout.entry.end}`, x + 10, y + 41, w - 20);
      if (h > 62) {
        drawTrimmedText(context, layout.entry.room || layout.entry.scheduleName, x + 10, y + 60, w - 20);
      }
    });
  });

  context.fillStyle = text;
  context.font = "800 21px Segoe UI, Tahoma, sans-serif";
  context.fillText("ช่วงว่างโดยสรุป", 64, 970);
  context.font = "700 14px Segoe UI, Tahoma, sans-serif";
  context.fillStyle = muted;
  const freeText = getFreeSlots(user)
    .map((item) => {
      const slots = item.slots.slice(0, 2).map((slot) => `${formatTime(slot.start)}-${formatTime(slot.end)}`);
      return `${item.dayName}: ${slots.length ? slots.join(", ") : "ไม่มี"}`;
    })
    .join("   ");
  drawWrappedText(context, freeText, 64, 1002, width - 128, 23, 2);

  const link = document.createElement("a");
  link.download = `${safeFileName(title)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function createDemoUser() {
  const mainSchedule = createSchedule("ภาคเรียน 1/2569");
  mainSchedule.entries = [
    createEntry("คณิตศาสตร์", "class", 0, "09:00", "10:30", "A302", "อ.กมล", "#7c6cff"),
    createEntry("ภาษาอังกฤษ", "class", 1, "13:00", "14:30", "B201", "Presentation", "#00a8a8"),
    createEntry("ฟิสิกส์", "class", 2, "10:00", "12:00", "Lab 4", "ทดลองกลุ่ม", "#ff6b6b"),
    createEntry("ประชุมโปรเจกต์", "work", 2, "11:00", "12:30", "ออนไลน์", "ชนกับฟิสิกส์", "#f5b041"),
    createEntry("อ่านหนังสือ", "work", 4, "16:00", "18:00", "ห้องสมุด", "ทบทวนบทที่ 3", "#2ecc71"),
  ];

  const sideSchedule = createSchedule("งานชมรม");
  sideSchedule.entries = [
    createEntry("ซ้อมกิจกรรม", "work", 5, "10:00", "13:00", "หอประชุม", "ทีมเวที", "#3498db"),
    createEntry("ออกแบบโปสเตอร์", "work", 3, "18:00", "20:00", "Co-working", "ส่งแบบร่าง", "#d65db1"),
  ];

  return {
    id: createId(),
    name: "ผู้ใช้ตัวอย่าง",
    email: "demo@planner.local",
    password: "demo",
    preferences: defaultPreferences(),
    activeScheduleId: mainSchedule.id,
    schedules: [mainSchedule, sideSchedule],
  };
}

function createSchedule(name) {
  return {
    id: createId(),
    name,
    entries: [],
  };
}

function createEntry(title, category, day, start, end, room, note, color) {
  return {
    id: createId(),
    title,
    category,
    day,
    start,
    end,
    room,
    note,
    color,
  };
}

function defaultPreferences() {
  return {
    theme: "pastel",
    backgroundImage: "",
    view: "all",
    scope: "active",
    orientation: "vertical",
    headerLanguage: "th",
    dayStart: "07:00",
    dayEnd: "21:00",
  };
}

function ensureUserDefaults(user) {
  user.preferences = { ...defaultPreferences(), ...(user.preferences || {}) };
  user.schedules = Array.isArray(user.schedules) ? user.schedules : [];
  if (user.schedules.length === 0) {
    user.schedules.push(createSchedule("ตารางเรียนหลัก"));
  }
  user.schedules.forEach((schedule) => {
    schedule.entries = Array.isArray(schedule.entries) ? schedule.entries : [];
    schedule.entries = schedule.entries.map((entry) => ({
      id: entry.id || createId(),
      title: entry.title || "รายการใหม่",
      category: entry.category === "work" ? "work" : "class",
      day: Number.isFinite(Number(entry.day)) ? Number(entry.day) : 0,
      start: entry.start || "09:00",
      end: entry.end || "10:00",
      room: entry.room || "",
      note: entry.note || "",
      color: entry.color || "#7c6cff",
    }));
  });
  if (!user.activeScheduleId || !user.schedules.some((schedule) => schedule.id === user.activeScheduleId)) {
    user.activeScheduleId = user.schedules[0].id;
  }
}

function currentUser() {
  if (!state.sessionEmail) return null;
  return state.users.find((user) => user.email === state.sessionEmail) || null;
}

function getActiveSchedule(user) {
  return user.schedules.find((schedule) => schedule.id === user.activeScheduleId) || user.schedules[0];
}

function getDayWindow(user) {
  const start = toMinutes(user.preferences.dayStart);
  const end = toMinutes(user.preferences.dayEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return { start: 420, end: 1260 };
  }
  return { start, end };
}

function toMinutes(value) {
  if (!value || !String(value).includes(":")) return NaN;
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

function formatTime(minutes) {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function overlapText(a, b) {
  const start = Math.max(toMinutes(a.start), toMinutes(b.start));
  const end = Math.min(toMinutes(a.end), toMinutes(b.end));
  return `${formatTime(start)}-${formatTime(end)}`;
}

function entrySorter(a, b) {
  return Number(a.day) - Number(b.day) || toMinutes(a.start) - toMinutes(b.start) || a.title.localeCompare(b.title, "th");
}

function eventKey(entry) {
  return `${entry.scheduleId}:${entry.id}`;
}

function viewLabel(view) {
  if (view === "class") return "เฉพาะตารางเรียน";
  if (view === "work") return "เฉพาะงานอื่นๆ";
  return "รวมเรียนและงาน";
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function createId() {
  if (crypto && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readableTextColor(hex) {
  const normalized = String(hex || "#000000").replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized.padEnd(6, "0").slice(0, 6);
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
  return brightness > 150 ? "#16202a" : "#ffffff";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeFileName(value) {
  return String(value)
    .trim()
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80) || "timetable";
}

function roundRect(context, x, y, width, height, radius, fill, stroke) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
  if (fill && fill !== "transparent") {
    context.fillStyle = fill;
    context.fill();
  }
  if (stroke && stroke !== "transparent") {
    context.strokeStyle = stroke;
    context.lineWidth = 2;
    context.stroke();
  }
}

function drawTrimmedText(context, text, x, y, maxWidth) {
  let output = String(text || "");
  if (context.measureText(output).width <= maxWidth) {
    context.fillText(output, x, y);
    return;
  }
  while (output.length > 1 && context.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  context.fillText(`${output}...`, x, y);
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text).split(" ");
  let line = "";
  let lineCount = 0;
  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (context.measureText(nextLine).width > maxWidth && line) {
      context.fillText(line, x, y + lineCount * lineHeight);
      line = word;
      lineCount += 1;
      return;
    }
    line = nextLine;
  });
  if (line && lineCount < maxLines) {
    context.fillText(line, x, y + lineCount * lineHeight);
  }
}
