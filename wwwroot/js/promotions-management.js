let promotions = [];
let filteredPromotions = [];
let selectedPromoCode = null;
let promoCodeToDelete = null;
let isCreateMode = false;
let isSaving = false;

const promotionApiUrl = "/admin/api/promotions";
const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0
});

document.addEventListener("DOMContentLoaded", () => {
  setupDiscountTypeListener();
  setupDeleteModal();
  loadPromotions();
});

async function loadPromotions() {
  setPageState("loading");
  setFormEnabled(false);

  try {
    const data = await sendPromotionRequest(promotionApiUrl);
    if (!Array.isArray(data)) {
      throw new Error("Dữ liệu khuyến mãi từ máy chủ không hợp lệ.");
    }

    promotions = data;
    renderKPIs();
    handleFilter();

    const currentSelection = promotions.find(promo => promo.code === selectedPromoCode);
    if (currentSelection) {
      selectPromotion(currentSelection.code);
    } else if (promotions.length > 0) {
      selectPromotion(promotions[0].code);
    } else {
      resetPromotionPanel();
      setPageState("empty");
    }
    return true;
  } catch (error) {
    setPageState("error", getErrorMessage(error, "Không thể tải danh sách khuyến mãi."));
    setFormEnabled(false);
    showToast(getErrorMessage(error, "Không thể tải danh sách khuyến mãi."), "danger");
    return false;
  }
}

async function sendPromotionRequest(url, method = "GET", body) {
  const headers = {};
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (method !== "GET") {
    const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
    if (!token) {
      throw new Error("Không tìm thấy mã xác thực yêu cầu. Vui lòng tải lại trang.");
    }
    headers.RequestVerificationToken = token;
  }

  const response = await fetch(url, {
    method,
    headers,
    credentials: "same-origin",
    cache: "no-store",
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || `Yêu cầu thất bại (${response.status}).`);
  }
  return result;
}

function getErrorMessage(error, fallback) {
  return error instanceof Error ? error.message : fallback;
}

function setPageState(state, message = "") {
  const loading = document.getElementById("promoLoadingState");
  const error = document.getElementById("promoErrorState");
  const empty = document.getElementById("promoEmptyState");
  const table = document.getElementById("promoTableContainer");
  const summary = document.getElementById("promoSummaryText");

  loading.hidden = state !== "loading";
  error.hidden = state !== "error";
  empty.hidden = state !== "empty";
  table.hidden = state !== "table";
  if (state === "error") {
    document.getElementById("promoErrorMessage").textContent = message;
  }
  if (state === "loading") {
    summary.textContent = "Đang tải khuyến mãi…";
  } else if (state === "error") {
    summary.textContent = "Không tải được dữ liệu.";
  } else if (state === "empty") {
    summary.textContent = "Chưa có mã khuyến mãi.";
  }
}

function setFormEnabled(enabled) {
  document.querySelectorAll("#promoForm input, #promoForm select, #promoForm textarea, #promoForm button")
    .forEach(element => {
      element.disabled = !enabled;
    });
  document.querySelectorAll("#existingPromoActions button, #btnCancelPromoCreate")
    .forEach(element => {
      element.disabled = !enabled;
    });
  document.getElementById("btnSavePromo").disabled = !enabled;
}

function formatVND(amount) {
  return vndFormatter.format(Number(amount) || 0).replace("₫", "đ");
}

function formatDisplayDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  });
}

function toDateTimeLocal(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = number => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getPromoStatusMeta(promo) {
  if (!promo.isActive) {
    return { status: "PAUSED", label: "Tạm dừng", badgeClass: "badge-status-inactive" };
  }

  const now = Date.now();
  const start = new Date(promo.startDate).getTime();
  const end = new Date(promo.endDate).getTime();
  if (now < start) {
    return { status: "UPCOMING", label: "Sắp diễn ra", badgeClass: "date-status-upcoming" };
  }
  if (now > end) {
    return { status: "EXPIRED", label: "Hết hạn", badgeClass: "badge-status-expired" };
  }
  if (promo.maxUsage != null && promo.usageCount >= promo.maxUsage) {
    return { status: "EXHAUSTED", label: "Hết lượt", badgeClass: "badge-status-exhausted" };
  }
  return { status: "ACTIVE", label: "Đang áp dụng", badgeClass: "badge-available" };
}

function renderKPIs() {
  let active = 0;
  let paused = 0;
  let expiredOrExhausted = 0;

  promotions.forEach(promo => {
    const status = getPromoStatusMeta(promo).status;
    if (status === "ACTIVE" || status === "UPCOMING") active += 1;
    else if (status === "PAUSED") paused += 1;
    else expiredOrExhausted += 1;
  });

  document.getElementById("statTotalPromos").textContent = promotions.length;
  document.getElementById("statActivePromos").textContent = active;
  document.getElementById("statPausedPromos").textContent = paused;
  document.getElementById("statExpiredPromos").textContent = expiredOrExhausted;
}

function handleFilter() {
  const search = document.getElementById("searchPromoInput").value.trim().toLocaleLowerCase("vi");
  const type = document.getElementById("filterPromoType").value;
  const status = document.getElementById("filterPromoStatus").value;
  const sort = document.getElementById("sortPromoOrder").value;

  filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.code.toLocaleLowerCase("vi").includes(search) ||
      promo.name.toLocaleLowerCase("vi").includes(search);
    if (!matchesSearch || (type !== "all" && promo.discountType !== type)) return false;

    if (status === "all") return true;
    const actualStatus = getPromoStatusMeta(promo).status;
    return actualStatus === status;
  });

  if (sort === "discount-desc") {
    filteredPromotions.sort((left, right) => getDiscountSortValue(right) - getDiscountSortValue(left));
  } else if (sort === "date-asc") {
    filteredPromotions.sort((left, right) => new Date(left.endDate) - new Date(right.endDate));
  } else if (sort === "usage-desc") {
    filteredPromotions.sort((left, right) => right.usageCount - left.usageCount);
  } else if (sort === "name-asc") {
    filteredPromotions.sort((left, right) => left.name.localeCompare(right.name, "vi"));
  }

  if (promotions.length > 0) {
    setPageState("table");
    renderTable();
  }
}

function getDiscountSortValue(promo) {
  return promo.discountType === "PERCENT" ? (promo.maxDiscount || 0) : promo.discountValue;
}

function renderTable() {
  const tbody = document.getElementById("promoTableBody");
  tbody.replaceChildren();

  if (filteredPromotions.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 8;
    cell.className = "promo-no-results";
    cell.textContent = "Không tìm thấy mã khuyến mãi phù hợp. Hãy thử từ khóa hoặc bộ lọc khác.";
    row.appendChild(cell);
    tbody.appendChild(row);
    document.getElementById("promoSummaryText").textContent =
      `Không có kết quả trong ${promotions.length} mã khuyến mãi.`;
    return;
  }

  filteredPromotions.forEach(promo => {
    const row = document.createElement("tr");
    if (!isCreateMode && promo.code === selectedPromoCode) row.classList.add("selected-row");
    row.addEventListener("click", event => {
      if (!event.target.closest("button")) selectPromotion(promo.code);
    });

    const codeCell = document.createElement("td");
    const codePill = document.createElement("span");
    codePill.className = "coupon-code-pill";
    codePill.textContent = promo.code;
    codeCell.appendChild(codePill);
    row.appendChild(codeCell);

    const nameCell = document.createElement("td");
    const name = document.createElement("strong");
    name.className = "promo-name";
    name.textContent = promo.name;
    const typeBadge = document.createElement("span");
    typeBadge.className = `promo-type-badge ${getDiscountTypeClass(promo.discountType)}`;
    typeBadge.textContent = getDiscountTypeLabel(promo.discountType);
    nameCell.append(name, typeBadge);
    row.appendChild(nameCell);

    const discountCell = document.createElement("td");
    const discount = document.createElement("strong");
    discount.textContent = getDiscountDescription(promo);
    discountCell.appendChild(discount);
    if (promo.discountType === "PERCENT" && promo.maxDiscount != null) {
      const limit = document.createElement("div");
      limit.className = "promo-secondary-text";
      limit.textContent = `Tối đa ${formatVND(promo.maxDiscount)}`;
      discountCell.appendChild(limit);
    }
    row.appendChild(discountCell);

    const minimumCell = document.createElement("td");
    minimumCell.textContent = formatVND(promo.minOrderValue);
    row.appendChild(minimumCell);

    const dateCell = document.createElement("td");
    dateCell.className = "date-meta-cell";
    dateCell.append(
      makeDateRow("Bắt đầu", promo.startDate),
      makeDateRow("Kết thúc", promo.endDate)
    );
    row.appendChild(dateCell);

    const usageCell = document.createElement("td");
    usageCell.appendChild(makeUsageCell(promo));
    row.appendChild(usageCell);

    const statusCell = document.createElement("td");
    statusCell.className = "promo-status-cell";
    const status = getPromoStatusMeta(promo);
    const statusButton = document.createElement("button");
    statusButton.type = "button";
    statusButton.className = `badge-status ${status.badgeClass}`;
    const statusDot = document.createElement("span");
    statusDot.className = "status-dot";
    const statusLabel = document.createElement("span");
    statusLabel.textContent = status.label;
    statusButton.append(statusDot, statusLabel);
    statusButton.title = promo.isActive ? "Tạm tắt mã" : "Bật mã";
    statusButton.addEventListener("click", () => quickTogglePromoStatus(promo.code));
    statusCell.appendChild(statusButton);
    row.appendChild(statusCell);

    const actionsCell = document.createElement("td");
    actionsCell.className = "promo-actions-cell";
    const editButton = makeIconButton("Xem chi tiết và chỉnh sửa", "view", () => selectPromotion(promo.code));
    const canDelete = (promo.orderCount ?? 0) === 0;
    const deleteButton = makeIconButton(
      canDelete ? "Xóa mã" : "Mã đã gắn với đơn hàng; hãy tạm tắt thay vì xóa",
      "delete",
      () => prepareDeletePromo(promo.code)
    );
    deleteButton.classList.add("danger");
    deleteButton.disabled = !canDelete;
    actionsCell.append(editButton, deleteButton);
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });

  document.getElementById("promoSummaryText").textContent =
    `Hiển thị ${filteredPromotions.length} trong tổng số ${promotions.length} mã khuyến mãi.`;
}

function makeDateRow(label, value) {
  const row = document.createElement("div");
  row.className = "date-row-item";
  const labelElement = document.createElement("span");
  labelElement.textContent = `${label}:`;
  const dateElement = document.createElement("span");
  dateElement.textContent = formatDisplayDate(value);
  row.append(labelElement, dateElement);
  return row;
}

function makeUsageCell(promo) {
  const wrap = document.createElement("div");
  wrap.className = "usage-cell-wrap";
  const textRow = document.createElement("div");
  textRow.className = "usage-text-row";
  const count = document.createElement("span");
  count.textContent = promo.maxUsage == null
    ? `${promo.usageCount} / Không giới hạn`
    : `${promo.usageCount} / ${promo.maxUsage}`;
  textRow.appendChild(count);
  wrap.appendChild(textRow);

  if (promo.maxUsage != null) {
    const percent = Math.min(100, Math.round((promo.usageCount / promo.maxUsage) * 100));
    const bar = document.createElement("div");
    bar.className = "usage-progress-bar";
    const fill = document.createElement("div");
    fill.className = `usage-progress-fill${percent >= 100 ? " full" : percent >= 80 ? " near-limit" : ""}`;
    fill.style.width = `${percent}%`;
    bar.appendChild(fill);
    wrap.appendChild(bar);
  }
  return wrap;
}

function makeIconButton(title, icon, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action-icon-btn";
  button.title = title;
  button.setAttribute("aria-label", title);
  button.innerHTML = icon === "view"
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4H15.5L14.5 3H9.5L8.5 4H5V6H19M6 19A2 2 0 0 0 8 21H16A2 2 0 0 0 18 19V7H6V19Z"/></svg>';
  button.addEventListener("click", onClick);
  return button;
}

function getDiscountTypeClass(type) {
  if (type === "PERCENT") return "promo-type-percent";
  if (type === "SHIPPING") return "promo-type-shipping";
  return "promo-type-fixed";
}

function getDiscountTypeLabel(type) {
  if (type === "PERCENT") return "Giảm phần trăm";
  if (type === "SHIPPING") return "Giảm phí giao hàng";
  return "Giảm tiền cố định";
}

function getDiscountDescription(promo) {
  if (promo.discountType === "PERCENT") return `Giảm ${promo.discountValue}%`;
  if (promo.discountType === "SHIPPING") return `Hỗ trợ ${formatVND(promo.discountValue)}`;
  return `Giảm ${formatVND(promo.discountValue)}`;
}

function selectPromotion(code) {
  const promo = promotions.find(item => item.code === code);
  if (!promo) return;

  selectedPromoCode = promo.code;
  isCreateMode = false;
  setFormEnabled(true);
  document.getElementById("panelPromoTitle").textContent = "CHI TIẾT MÃ KHUYẾN MÃI";
  document.getElementById("panelPromoSubtitle").textContent = "Xem và chỉnh sửa điều kiện áp dụng";
  document.getElementById("panelPromoCodeBadge").textContent = `#${promo.code}`;
  document.getElementById("formPromoCode").value = promo.code;
  document.getElementById("formPromoCode").disabled = true;
  document.getElementById("promoCodeHint").hidden = false;
  document.getElementById("formPromoName").value = promo.name;
  document.getElementById("formDiscountType").value = promo.discountType;
  document.getElementById("formDiscountValue").value = promo.discountValue;
  document.getElementById("formMaxDiscount").value = promo.maxDiscount ?? "";
  document.getElementById("formMinOrder").value = promo.minOrderValue;
  document.getElementById("formStartDate").value = toDateTimeLocal(promo.startDate);
  document.getElementById("formEndDate").value = toDateTimeLocal(promo.endDate);
  document.getElementById("formMaxUsage").value = promo.maxUsage ?? "";
  document.getElementById("formPerCustomerLimit").value = promo.perCustomerLimit ?? "";
  document.getElementById("formPromoDesc").value = promo.description ?? "";
  document.getElementById("promoStatusActive").checked = promo.isActive;
  document.getElementById("promoStatusInactive").checked = !promo.isActive;
  document.getElementById("btnSavePromoText").textContent = "Lưu khuyến mãi";
  document.getElementById("existingPromoActions").style.display = "grid";
  document.getElementById("btnCancelPromoCreate").style.display = "none";
  document.getElementById("btnToggleStatusText").textContent = promo.isActive ? "Tắt mã" : "Bật mã";
  const deleteCurrentButton = document.getElementById("btnDeletePromo");
  deleteCurrentButton.disabled = promo.orderCount > 0;
  deleteCurrentButton.title = promo.orderCount > 0
    ? "Mã đã gắn với đơn hàng; hãy tạm tắt thay vì xóa."
    : "Xóa mã khuyến mãi";
  updatePromoRadioPills();
  handleDiscountTypeChange();
  resetTesterCalculator();
  renderTable();
}

function resetPromotionPanel() {
  isCreateMode = false;
  selectedPromoCode = null;
  document.getElementById("panelPromoTitle").textContent = "CHI TIẾT MÃ KHUYẾN MÃI";
  document.getElementById("panelPromoSubtitle").textContent = "Chọn một mã trong bảng hoặc tạo mã mới.";
  document.getElementById("panelPromoCodeBadge").textContent = "Chưa chọn mã";
  document.getElementById("promoForm").reset();
  document.getElementById("formPromoCode").disabled = true;
  document.getElementById("promoCodeHint").hidden = true;
  document.getElementById("existingPromoActions").style.display = "none";
  document.getElementById("btnCancelPromoCreate").style.display = "none";
  document.getElementById("btnSavePromoText").textContent = "Lưu khuyến mãi";
  setFormEnabled(false);
}

function triggerAddNewPromotion() {
  isCreateMode = true;
  selectedPromoCode = null;
  const form = document.getElementById("promoForm");
  form.reset();
  setFormEnabled(true);

  document.getElementById("panelPromoTitle").textContent = "TẠO MÃ KHUYẾN MÃI MỚI";
  document.getElementById("panelPromoSubtitle").textContent = "Nhập thông tin và thiết lập điều kiện áp dụng.";
  document.getElementById("panelPromoCodeBadge").textContent = "#MỚI";
  document.getElementById("formPromoCode").disabled = false;
  document.getElementById("promoCodeHint").hidden = true;
  document.getElementById("formDiscountType").value = "PERCENT";
  document.getElementById("formDiscountValue").value = 15;
  document.getElementById("formMaxDiscount").value = 25000;
  document.getElementById("formMinOrder").value = 80000;
  document.getElementById("formMaxUsage").value = "";
  document.getElementById("formPerCustomerLimit").value = "";
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 30);
  document.getElementById("formStartDate").value = toDateTimeLocal(now);
  document.getElementById("formEndDate").value = toDateTimeLocal(endDate);
  document.getElementById("promoStatusActive").checked = true;
  document.getElementById("promoStatusInactive").checked = false;
  document.getElementById("btnSavePromoText").textContent = "Tạo mã khuyến mãi";
  document.getElementById("existingPromoActions").style.display = "none";
  document.getElementById("btnCancelPromoCreate").style.display = "flex";
  updatePromoRadioPills();
  handleDiscountTypeChange();
  resetTesterCalculator();
  renderTable();
  document.getElementById("formPromoCode").focus();
}

function cancelPromoCreate() {
  const existing = promotions.find(promo => promo.code === selectedPromoCode) || promotions[0];
  if (existing) selectPromotion(existing.code);
  else resetPromotionPanel();
}

function setupDiscountTypeListener() {
  document.getElementById("formDiscountType").addEventListener("change", handleDiscountTypeChange);
  document.getElementById("formPromoCode").addEventListener("input", event => {
    document.getElementById("panelPromoCodeBadge").textContent =
      event.target.value.trim() ? `#${event.target.value.trim().toUpperCase()}` : "#MỚI";
  });
}

function handleDiscountTypeChange() {
  const type = document.getElementById("formDiscountType").value;
  const label = document.getElementById("formDiscountValLabel");
  const suffix = document.getElementById("formDiscountValSuffix");
  const maxDiscountGroup = document.getElementById("formMaxDiscountGroup");
  const maxDiscountInput = document.getElementById("formMaxDiscount");

  if (type === "PERCENT") {
    label.innerHTML = 'Phần trăm giảm (%) <span class="required">*</span>';
    suffix.textContent = "%";
    maxDiscountGroup.style.display = "";
    maxDiscountInput.required = true;
  } else {
    label.innerHTML = type === "SHIPPING"
      ? 'Mức hỗ trợ phí giao hàng (VNĐ) <span class="required">*</span>'
      : 'Số tiền giảm (VNĐ) <span class="required">*</span>';
    suffix.textContent = "VNĐ";
    maxDiscountGroup.style.display = "none";
    maxDiscountInput.required = false;
  }
}

function updatePromoRadioPills() {
  const active = document.getElementById("promoStatusActive").checked;
  document.getElementById("labelPromoActive").className =
    `pill-radio-label${active ? " active-success" : ""}`;
  document.getElementById("labelPromoInactive").className =
    `pill-radio-label${active ? "" : " active-danger"}`;
}

function readPromotionForm() {
  const numberValue = id => {
    const value = document.getElementById(id).value.trim();
    return value === "" ? null : Number(value);
  };
  const type = document.getElementById("formDiscountType").value;
  const data = {
    code: document.getElementById("formPromoCode").value.trim().toUpperCase(),
    name: document.getElementById("formPromoName").value.trim(),
    description: document.getElementById("formPromoDesc").value.trim() || null,
    discountType: type,
    discountValue: numberValue("formDiscountValue"),
    maxDiscount: type === "PERCENT" ? numberValue("formMaxDiscount") : null,
    minOrderValue: numberValue("formMinOrder") ?? 0,
    startDate: document.getElementById("formStartDate").value,
    endDate: document.getElementById("formEndDate").value,
    maxUsage: numberValue("formMaxUsage"),
    perCustomerLimit: numberValue("formPerCustomerLimit"),
    isActive: document.getElementById("promoStatusActive").checked
  };

  if (!/^[A-Z0-9_-]{1,30}$/.test(data.code)) {
    throw new Error("Mã voucher chỉ được gồm chữ không dấu, số, dấu gạch ngang hoặc gạch dưới (tối đa 30 ký tự).");
  }
  if (!data.name) throw new Error("Vui lòng nhập tên chương trình ưu đãi.");
  if (!Number.isInteger(data.discountValue) || data.discountValue <= 0) {
    throw new Error("Mức giảm phải là số nguyên lớn hơn 0.");
  }
  if (type === "PERCENT" && (data.discountValue > 100 || !Number.isInteger(data.maxDiscount) || data.maxDiscount <= 0)) {
    throw new Error("Phần trăm giảm tối đa là 100% và cần có mức giảm trần hợp lệ.");
  }
  if (!Number.isInteger(data.minOrderValue) || data.minOrderValue < 0) {
    throw new Error("Giá trị đơn tối thiểu phải là số nguyên không âm.");
  }
  if (!data.startDate || !data.endDate || new Date(data.endDate) <= new Date(data.startDate)) {
    throw new Error("Vui lòng chọn thời gian kết thúc sau thời gian bắt đầu.");
  }
  if (data.maxUsage !== null && (!Number.isInteger(data.maxUsage) || data.maxUsage < 1)) {
    throw new Error("Tổng lượt dùng phải lớn hơn 0 hoặc để trống nếu không giới hạn.");
  }
  if (data.perCustomerLimit !== null && (!Number.isInteger(data.perCustomerLimit) || data.perCustomerLimit < 1)) {
    throw new Error("Lượt dùng mỗi khách phải lớn hơn 0 hoặc để trống nếu không giới hạn.");
  }
  return data;
}

async function handlePromoFormSubmit(event) {
  event.preventDefault();
  if (isSaving || !document.getElementById("promoForm").reportValidity()) return;

  let data;
  try {
    data = readPromotionForm();
  } catch (error) {
    showToast(getErrorMessage(error, "Thông tin khuyến mãi không hợp lệ."), "warning");
    return;
  }

  const code = data.code;
  const url = isCreateMode
    ? promotionApiUrl
    : `${promotionApiUrl}/${encodeURIComponent(selectedPromoCode)}`;
  const method = isCreateMode ? "POST" : "PUT";
  const wasCreating = isCreateMode;
  const saveButton = document.getElementById("btnSavePromo");
  isSaving = true;
  saveButton.disabled = true;

  try {
    await sendPromotionRequest(url, method, data);
    selectedPromoCode = code;
    await loadPromotions();
    showToast(wasCreating ? `Đã tạo mã ${code}.` : `Đã lưu mã ${code}.`, "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Không thể lưu khuyến mãi."), "danger");
  } finally {
    isSaving = false;
    if (document.getElementById("promoErrorState").hidden) {
      saveButton.disabled = !isCreateMode && !selectedPromoCode;
    }
  }
}

async function quickTogglePromoStatus(code) {
  const promo = promotions.find(item => item.code === code);
  if (!promo) return;

  try {
    await sendPromotionRequest(
      `${promotionApiUrl}/${encodeURIComponent(code)}/status`,
      "PUT",
      { isActive: !promo.isActive }
    );
    await loadPromotions();
    showToast(`Đã ${promo.isActive ? "tạm tắt" : "bật"} mã ${code}.`, "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Không thể đổi trạng thái mã khuyến mãi."), "danger");
  }
}

function quickToggleCurrentPromo() {
  if (selectedPromoCode) quickTogglePromoStatus(selectedPromoCode);
}

function prepareDeletePromo(code) {
  promoCodeToDelete = code;
  const promo = promotions.find(item => item.code === code);
  if (!promo) return;
  document.getElementById("deletePromoModalDesc").textContent =
    `Bạn có chắc chắn muốn xóa mã ${promo.code} (${promo.name})?`;
  document.getElementById("deletePromoModalBackdrop").classList.add("active");
}

function triggerDeleteCurrentPromo() {
  if (selectedPromoCode) prepareDeletePromo(selectedPromoCode);
}

function closeDeletePromoModal() {
  document.getElementById("deletePromoModalBackdrop").classList.remove("active");
  promoCodeToDelete = null;
}

async function confirmDeletePromo() {
  if (!promoCodeToDelete) return;
  const code = promoCodeToDelete;
  try {
    await sendPromotionRequest(`${promotionApiUrl}/${encodeURIComponent(code)}`, "DELETE");
    closeDeletePromoModal();
    selectedPromoCode = null;
    await loadPromotions();
    showToast(`Đã xóa mã ${code}.`, "success");
  } catch (error) {
    showToast(getErrorMessage(error, "Không thể xóa mã khuyến mãi."), "danger");
  }
}

function setupDeleteModal() {
  const backdrop = document.getElementById("deletePromoModalBackdrop");
  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeDeletePromoModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDeletePromoModal();
  });
}

function resetTesterCalculator() {
  const result = document.getElementById("testerResultBox");
  result.style.display = "none";
  result.className = "tester-result-box";
  result.textContent = "";
}

function testApplyCurrentPromo() {
  const result = document.getElementById("testerResultBox");
  const amount = Number(document.getElementById("testOrderAmount").value) || 0;
  const shipping = Number(document.getElementById("testShippingFee").value) || 0;
  const code = document.getElementById("formPromoCode").value.trim().toUpperCase() || "MÃ THỬ";
  const type = document.getElementById("formDiscountType").value;
  const value = Number(document.getElementById("formDiscountValue").value) || 0;
  const cap = Number(document.getElementById("formMaxDiscount").value) || value;
  const minimum = Number(document.getElementById("formMinOrder").value) || 0;
  const start = new Date(document.getElementById("formStartDate").value);
  const end = new Date(document.getElementById("formEndDate").value);
  const selected = promotions.find(promo => promo.code === selectedPromoCode);

  let error = "";
  if (!document.getElementById("promoStatusActive").checked) error = "Mã đang tạm tắt.";
  else if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) error = "Hãy nhập thời hạn hợp lệ.";
  else if (Date.now() < start.getTime()) error = `Mã bắt đầu lúc ${formatDisplayDate(start)}.`;
  else if (Date.now() > end.getTime()) error = `Mã đã hết hạn từ ${formatDisplayDate(end)}.`;
  else if (selected?.maxUsage != null && selected.usageCount >= selected.maxUsage) error = "Mã đã hết lượt sử dụng.";
  else if (amount < minimum) error = `Đơn hàng cần đạt tối thiểu ${formatVND(minimum)}.`;

  if (error) {
    result.className = "tester-result-box invalid";
    result.textContent = error;
    result.style.display = "block";
    return;
  }

  const base = type === "SHIPPING" ? shipping : amount;
  let discount = type === "PERCENT" ? Math.floor(base * value / 100) : value;
  if (type === "PERCENT" && cap > 0) discount = Math.min(discount, cap);
  discount = Math.min(discount, base);
  const total = Math.max(0, amount + shipping - discount);
  result.className = "tester-result-box valid";
  result.textContent =
    `Mã ${code} hợp lệ · giảm ${formatVND(discount)} · khách thanh toán ${formatVND(total)}.`;
  result.style.display = "block";
}
