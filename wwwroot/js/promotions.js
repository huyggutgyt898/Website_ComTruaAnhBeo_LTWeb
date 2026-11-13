/**
 * Cơm Trưa Anh Béo - Promotions Management Module (Quản lý khuyến mãi)
 * File: wwwroot/js/promotions.js
 */

/* ========================================================================
   1. MOCK DATA: PROMOTIONS LIST
   ======================================================================== */
let promotions = [
  {
    id: "PROMO-001",
    code: "ANHBEO20",
    name: "Ưu đãi cơm trưa văn phòng 20%",
    discountType: "PERCENT", // PERCENT | FIXED_AMOUNT | SHIPPING
    discountValue: 20, // 20%
    maxDiscount: 30000, // 30.000đ
    minOrderValue: 100000, // 100.000đ
    startDate: "2026-11-01T08:00",
    endDate: "2026-11-30T22:00",
    usageCount: 48,
    maxUsage: 100,
    perCustomerLimit: 2,
    isActive: true,
    description: "Giảm 20% tối đa 30.000đ cho đơn cơm trưa từ 100.000đ. Áp dụng cho toàn bộ thực đơn cơm sườn, cơm gà, cơm bò."
  },
  {
    id: "PROMO-002",
    code: "FREESHIP",
    name: "Miễn phí giao hàng đơn từ 120k",
    discountType: "SHIPPING",
    discountValue: 20000, // Hỗ trợ tối đa 20.000đ phí giao hàng
    maxDiscount: 20000,
    minOrderValue: 120000,
    startDate: "2026-11-01T00:00",
    endDate: "2026-11-15T23:59",
    usageCount: 82,
    maxUsage: 150,
    perCustomerLimit: 1,
    isActive: true,
    description: "Tài trợ tối đa 20.000đ phí ship cho hóa đơn từ 120.000đ bán kính 5km quanh quán."
  },
  {
    id: "PROMO-003",
    code: "GIAM30K",
    name: "Giảm 30K tiệc cơm đoàn thể & công ty",
    discountType: "FIXED_AMOUNT",
    discountValue: 30000,
    maxDiscount: 30000,
    minOrderValue: 200000,
    startDate: "2026-11-05T09:00",
    endDate: "2026-11-25T21:00",
    usageCount: 19,
    maxUsage: 50,
    perCustomerLimit: 1,
    isActive: true,
    description: "Khấu trừ trực tiếp 30.000đ trên tổng hóa đơn đặt cơm theo nhóm từ 200.000đ."
  },
  {
    id: "PROMO-004",
    code: "BANMOI15",
    name: "Chào bạn mới - Giảm 15K đơn đầu tiên",
    discountType: "FIXED_AMOUNT",
    discountValue: 15000,
    maxDiscount: 15000,
    minOrderValue: 60000,
    startDate: "2026-10-01T00:00",
    endDate: "2026-12-31T23:59",
    usageCount: 154,
    maxUsage: 200,
    perCustomerLimit: 1,
    isActive: true,
    description: "Dành riêng cho khách hàng mới trải nghiệm lần đầu tại Cơm Trưa Anh Béo."
  },
  {
    id: "PROMO-005",
    code: "HEOQUAY10",
    name: "Tri ân món Cơm heo quay giảm 10%",
    discountType: "PERCENT",
    discountValue: 10,
    maxDiscount: 20000,
    minOrderValue: 80000,
    startDate: "2026-11-01T08:00",
    endDate: "2026-11-10T22:00",
    usageCount: 15,
    maxUsage: 50,
    perCustomerLimit: 1,
    isActive: false, // Tạm dừng
    description: "Chương trình tri ân khách hàng yêu thích món Cơm heo quay cải chua truyền thống."
  },
  {
    id: "PROMO-006",
    code: "HALLOWEEN",
    name: "Ưu đãi tuần lễ Halloween hóa trang",
    discountType: "FIXED_AMOUNT",
    discountValue: 25000,
    maxDiscount: 25000,
    minOrderValue: 150000,
    startDate: "2026-10-25T00:00",
    endDate: "2026-10-31T23:59", // Đã hết hạn
    usageCount: 50,
    maxUsage: 50,
    perCustomerLimit: 1,
    isActive: true,
    description: "Mã khuyến mãi theo sự kiện lễ hội đã kết thúc thời gian áp dụng."
  }
];

/* ========================================================================
   2. STATE VARIABLES
   ======================================================================== */
let selectedPromoId = "PROMO-001";
let isCreateMode = false;
let filteredPromotions = [...promotions];
let promoIdToDelete = null;

/* ========================================================================
   3. INITIALIZATION
   ======================================================================== */
window.addEventListener("DOMContentLoaded", () => {
  renderKPIs();
  handleFilter();
  selectPromotion("PROMO-001");
  setupDiscountTypeListener();
});

/* ========================================================================
   4. FORMATTING UTILITIES
   ======================================================================== */
function formatVND(amount) {
  if (isNaN(amount) || amount === null) return "0đ";
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'đ');
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${mins}`;
}

function getPromoStatusMeta(promo) {
  const now = new Date();
  const start = new Date(promo.startDate);
  const end = new Date(promo.endDate);

  if (!promo.isActive) {
    return { status: "PAUSED", label: "Tạm dừng", badgeClass: "badge-status-inactive", dot: "🟠" };
  }
  if (now > end) {
    return { status: "EXPIRED", label: "Hết hạn", badgeClass: "badge-status-expired", dot: "🔴" };
  }
  if (promo.usageCount >= promo.maxUsage) {
    return { status: "EXHAUSTED", label: "Hết lượt", badgeClass: "badge-status-exhausted", dot: "⚪" };
  }
  if (now < start) {
    return { status: "UPCOMING", label: "Sắp diễn ra", badgeClass: "date-status-upcoming", dot: "🔵" };
  }
  return { status: "ACTIVE", label: "Đang áp dụng", badgeClass: "badge-available", dot: "🟢" };
}

/* ========================================================================
   5. KPI STATS CALCULATION
   ======================================================================== */
function renderKPIs() {
  const total = promotions.length;
  let active = 0;
  let paused = 0;
  let expiredOrExhausted = 0;

  promotions.forEach(p => {
    const meta = getPromoStatusMeta(p);
    if (meta.status === "ACTIVE" || meta.status === "UPCOMING") active++;
    else if (meta.status === "PAUSED") paused++;
    else if (meta.status === "EXPIRED" || meta.status === "EXHAUSTED") expiredOrExhausted++;
  });

  const totalElem = document.getElementById("statTotalPromos");
  const activeElem = document.getElementById("statActivePromos");
  const pausedElem = document.getElementById("statPausedPromos");
  const expiredElem = document.getElementById("statExpiredPromos");

  if (totalElem) totalElem.textContent = total;
  if (activeElem) activeElem.textContent = active;
  if (pausedElem) pausedElem.textContent = paused;
  if (expiredElem) expiredElem.textContent = expiredOrExhausted;
}

/* ========================================================================
   6. FILTERING & SEARCHING
   ======================================================================== */
function handleFilter() {
  const searchInput = document.getElementById("searchPromoInput");
  const typeSelect = document.getElementById("filterPromoType");
  const statusSelect = document.getElementById("filterPromoStatus");
  const sortSelect = document.getElementById("sortPromoOrder");

  const searchVal = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const typeVal = typeSelect ? typeSelect.value : "all";
  const statusVal = statusSelect ? statusSelect.value : "all";
  const sortVal = sortSelect ? sortSelect.value : "default";

  filteredPromotions = promotions.filter(p => {
    // Search by code or name
    const matchCode = p.code.toLowerCase().includes(searchVal);
    const matchName = p.name.toLowerCase().includes(searchVal);
    if (!matchCode && !matchName) return false;

    // Filter by type
    if (typeVal !== "all" && p.discountType !== typeVal) return false;

    // Filter by status
    if (statusVal !== "all") {
      const meta = getPromoStatusMeta(p);
      if (meta.status !== statusVal) return false;
    }

    return true;
  });

  // Sorting
  if (sortVal === "discount-desc") {
    filteredPromotions.sort((a, b) => {
      const valA = a.discountType === "PERCENT" ? a.maxDiscount : a.discountValue;
      const valB = b.discountType === "PERCENT" ? b.maxDiscount : b.discountValue;
      return valB - valA;
    });
  } else if (sortVal === "date-asc") {
    filteredPromotions.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
  } else if (sortVal === "usage-desc") {
    filteredPromotions.sort((a, b) => b.usageCount - a.usageCount);
  } else if (sortVal === "name-asc") {
    filteredPromotions.sort((a, b) => a.code.localeCompare(b.code));
  }

  renderTable();
}

/* ========================================================================
   7. TABLE RENDERING
   ======================================================================== */
function renderTable() {
  const tbody = document.getElementById("promoTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (filteredPromotions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <div style="font-size: 32px; margin-bottom: 8px;">🏷️</div>
          <div style="font-weight: 700; font-size: 15px;">Không tìm thấy mã khuyến mãi phù hợp</div>
          <div style="font-size: 13px; margin-top: 4px;">Thử thay đổi từ khóa hoặc bộ lọc trạng thái.</div>
        </td>
      </tr>
    `;
    const summary = document.getElementById("promoSummaryText");
    if (summary) summary.textContent = "Không có kết quả";
    return;
  }

  filteredPromotions.forEach(promo => {
    const isSelected = (!isCreateMode && promo.id === selectedPromoId);
    const meta = getPromoStatusMeta(promo);
    const tr = document.createElement("tr");
    if (isSelected) tr.classList.add("selected-row");

    tr.onclick = (e) => {
      if (e.target.closest('.badge-status') || e.target.closest('.action-icon-btn')) return;
      selectPromotion(promo.id);
    };

    // Discount value display
    let discountDisplay = "";
    let typeBadge = "";
    if (promo.discountType === "PERCENT") {
      discountDisplay = `<strong>Giảm ${promo.discountValue}%</strong><div style="font-size: 11px; color: var(--text-secondary);">Tối đa ${formatVND(promo.maxDiscount)}</div>`;
      typeBadge = `<span class="promo-type-badge promo-type-percent">📊 Giảm %</span>`;
    } else if (promo.discountType === "FIXED_AMOUNT") {
      discountDisplay = `<strong>Giảm ${formatVND(promo.discountValue)}</strong><div style="font-size: 11px; color: var(--text-secondary);">Trực tiếp</div>`;
      typeBadge = `<span class="promo-type-badge promo-type-fixed">💵 Giảm tiền</span>`;
    } else if (promo.discountType === "SHIPPING") {
      discountDisplay = `<strong>Freeship ${formatVND(promo.discountValue)}</strong><div style="font-size: 11px; color: var(--text-secondary);">Phí giao hàng</div>`;
      typeBadge = `<span class="promo-type-badge promo-type-shipping">🛵 Miễn/Giảm ship</span>`;
    }

    // Usage Progress
    const usagePercent = Math.min(100, Math.round((promo.usageCount / promo.maxUsage) * 100));
    let progressClass = "";
    if (usagePercent >= 100) progressClass = "full";
    else if (usagePercent >= 80) progressClass = "near-limit";

    tr.innerHTML = `
      <td>
        <div class="coupon-code-pill">
          <svg viewBox="0 0 24 24"><path d="M4 4C2.89 4 2 4.89 2 6V10C3.11 10 4 10.9 4 12C4 13.1 3.11 14 2 14V18C2 19.1 2.89 20 4 20H20C21.1 20 22 19.1 22 18V14C20.9 14 20 13.1 20 12C20 10.9 20.9 10 22 10V6C22 4.89 21.1 4 20 4H4M4 6H20V8.54C18.84 9.24 18 10.5 18 12C18 13.5 18.84 14.76 20 15.46V18H4V15.46C5.16 14.76 6 13.5 6 12C6 10.5 5.16 9.24 4 8.54V6M9 9V15H11V9H9M13 9V15H15V9H13Z"/></svg>
          <span>${promo.code}</span>
        </div>
      </td>
      <td>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="font-weight: 700; color: var(--brand-burgundy); font-size: 13.5px;">${promo.name}</span>
          <div>${typeBadge}</div>
        </div>
      </td>
      <td>
        ${discountDisplay}
      </td>
      <td>
        <span style="font-weight: 700; color: var(--brand-burgundy); font-size: 13px;">${formatVND(promo.minOrderValue)}</span>
      </td>
      <td>
        <div class="date-meta-cell">
          <div class="date-row-item">
            <span style="font-size: 11px;">Bắt đầu:</span>
            <span>${formatDisplayDate(promo.startDate)}</span>
          </div>
          <div class="date-row-item">
            <span style="font-size: 11px;">Kết thúc:</span>
            <span>${formatDisplayDate(promo.endDate)}</span>
          </div>
        </div>
      </td>
      <td>
        <div class="usage-cell-wrap">
          <div class="usage-text-row">
            <span>${promo.usageCount} / ${promo.maxUsage}</span>
            <span style="color: var(--text-secondary);">${usagePercent}%</span>
          </div>
          <div class="usage-progress-bar">
            <div class="usage-progress-fill ${progressClass}" style="width: ${usagePercent}%;"></div>
          </div>
        </div>
      </td>
      <td style="text-align: center;">
        <span class="badge-status ${meta.badgeClass}" onclick="quickTogglePromoStatus('${promo.id}', event)" title="Nhấn để bật/tắt nhanh">
          <span class="status-dot"></span>
          <span>${meta.label}</span>
        </span>
      </td>
      <td style="text-align: right;">
        <div class="table-actions-cell" style="justify-content: flex-end;">
          <button class="action-icon-btn" title="Xem chi tiết & Chỉnh sửa" onclick="selectPromotion('${promo.id}')">
            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z"/></svg>
          </button>
          <button class="action-icon-btn danger" title="Xóa mã" onclick="prepareDeletePromo('${promo.id}', event)">
            <svg viewBox="0 0 24 24"><path d="M19 4H15.5L14.5 3H9.5L8.5 4H5V6H19M6 19A2 2 0 0 0 8 21H16A2 2 0 0 0 18 19V7H6V19Z"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  const summary = document.getElementById("promoSummaryText");
  if (summary) summary.textContent = `Hiển thị ${filteredPromotions.length} trong tổng số ${promotions.length} mã khuyến mãi`;
}

/* ========================================================================
   8. RIGHT ACTION PANEL: SELECTION & FORM BINDING
   ======================================================================== */
function selectPromotion(id) {
  isCreateMode = false;
  selectedPromoId = id;
  const promo = promotions.find(p => p.id === id);
  if (!promo) return;

  // Header Title & Badge
  document.getElementById("panelPromoTitle").textContent = "CHI TIẾT MÃ KHUYẾN MÃI";
  document.getElementById("panelPromoSubtitle").textContent = "Xem & hiệu chỉnh điều kiện áp dụng";
  document.getElementById("panelPromoCodeBadge").textContent = "#" + promo.code;

  // Fill Inputs
  document.getElementById("formPromoId").value = promo.id;
  document.getElementById("formPromoCode").value = promo.code;
  document.getElementById("formPromoName").value = promo.name;
  document.getElementById("formDiscountType").value = promo.discountType;
  document.getElementById("formDiscountValue").value = promo.discountValue;
  document.getElementById("formMaxDiscount").value = promo.maxDiscount || "";
  document.getElementById("formMinOrder").value = promo.minOrderValue || 0;
  document.getElementById("formStartDate").value = promo.startDate;
  document.getElementById("formEndDate").value = promo.endDate;
  document.getElementById("formMaxUsage").value = promo.maxUsage;
  document.getElementById("formPerCustomerLimit").value = promo.perCustomerLimit || 1;
  document.getElementById("formPromoDesc").value = promo.description || "";

  // Active Toggle Radio
  const radioActive = document.getElementById("promoStatusActive");
  const radioInactive = document.getElementById("promoStatusInactive");
  if (promo.isActive) radioActive.checked = true;
  else radioInactive.checked = true;
  updatePromoRadioPills();

  // Dynamic input label & visibility based on Discount Type
  handleDiscountTypeChange();

  // Reset & prepare test calculator
  resetTesterCalculator();

  // Button state
  document.getElementById("btnSavePromoText").textContent = "Lưu khuyến mãi";
  document.getElementById("existingPromoActions").style.display = "grid";
  document.getElementById("btnCancelPromoCreate").style.display = "none";

  const btnToggleStatusText = document.getElementById("btnToggleStatusText");
  if (btnToggleStatusText) {
    btnToggleStatusText.textContent = promo.isActive ? "Tắt mã" : "Bật mã";
  }

  // Highlight row in table
  document.querySelectorAll("#promoTableBody tr").forEach(r => r.classList.remove("selected-row"));
  document.querySelectorAll("#promoTableBody tr").forEach(r => {
    if (r.children[0] && r.children[0].textContent.includes(promo.code)) {
      r.classList.add("selected-row");
    }
  });
}

function setupDiscountTypeListener() {
  const typeSelect = document.getElementById("formDiscountType");
  if (typeSelect) {
    typeSelect.addEventListener("change", handleDiscountTypeChange);
  }
}

function handleDiscountTypeChange() {
  const typeSelect = document.getElementById("formDiscountType");
  const valueGroup = document.getElementById("formDiscountValueGroup");
  const valLabel = document.getElementById("formDiscountValLabel");
  const valSuffix = document.getElementById("formDiscountValSuffix");
  const maxDiscountGroup = document.getElementById("formMaxDiscountGroup");

  if (!typeSelect) return;
  const type = typeSelect.value;

  if (type === "PERCENT") {
    valLabel.innerHTML = 'Phần trăm giảm (%) <span class="required">*</span>';
    valSuffix.textContent = "%";
    maxDiscountGroup.style.display = "block";
  } else if (type === "FIXED_AMOUNT") {
    valLabel.innerHTML = 'Số tiền giảm (VNĐ) <span class="required">*</span>';
    valSuffix.textContent = "VNĐ";
    maxDiscountGroup.style.display = "none";
  } else if (type === "SHIPPING") {
    valLabel.innerHTML = 'Mức hỗ trợ phí ship (VNĐ) <span class="required">*</span>';
    valSuffix.textContent = "VNĐ";
    maxDiscountGroup.style.display = "none";
  }
}

function updatePromoRadioPills() {
  const radioActive = document.getElementById("promoStatusActive");
  const labelActive = document.getElementById("labelPromoActive");
  const labelInactive = document.getElementById("labelPromoInactive");

  if (!radioActive || !labelActive || !labelInactive) return;

  if (radioActive.checked) {
    labelActive.className = "pill-radio-label active-success";
    labelInactive.className = "pill-radio-label";
  } else {
    labelActive.className = "pill-radio-label";
    labelInactive.className = "pill-radio-label active-danger";
  }
}

/* ========================================================================
   9. CREATE PROMOTION MODE
   ======================================================================== */
function triggerAddNewPromotion() {
  isCreateMode = true;
  selectedPromoId = null;

  document.querySelectorAll("#promoTableBody tr").forEach(r => r.classList.remove("selected-row"));

  const nextId = "PROMO-" + String(promotions.length + 1).padStart(3, "0");

  document.getElementById("panelPromoTitle").textContent = "TẠO MÃ KHUYẾN MÃI MỚI";
  document.getElementById("panelPromoSubtitle").textContent = "Nhập thông số và thiết lập điều kiện";
  document.getElementById("panelPromoCodeBadge").textContent = "#MỚI";

  // Default values
  document.getElementById("formPromoId").value = nextId;
  document.getElementById("formPromoCode").value = "";
  document.getElementById("formPromoName").value = "";
  document.getElementById("formDiscountType").value = "PERCENT";
  document.getElementById("formDiscountValue").value = 15;
  document.getElementById("formMaxDiscount").value = 25000;
  document.getElementById("formMinOrder").value = 80000;

  // Set default start = now, end = 30 days later
  const now = new Date();
  const later = new Date();
  later.setDate(later.getDate() + 30);
  document.getElementById("formStartDate").value = now.toISOString().slice(0, 16);
  document.getElementById("formEndDate").value = later.toISOString().slice(0, 16);

  document.getElementById("formMaxUsage").value = 100;
  document.getElementById("formPerCustomerLimit").value = 1;
  document.getElementById("formPromoDesc").value = "";

  document.getElementById("promoStatusActive").checked = true;
  updatePromoRadioPills();
  handleDiscountTypeChange();
  resetTesterCalculator();

  document.getElementById("btnSavePromoText").textContent = "+ Tạo mã khuyến mãi";
  document.getElementById("existingPromoActions").style.display = "none";
  document.getElementById("btnCancelPromoCreate").style.display = "flex";

  document.getElementById("formPromoCode").focus();
  showToast("Chuyển sang chế độ tạo mã khuyến mãi mới", "info");
}

function cancelPromoCreate() {
  if (promotions.length > 0) {
    selectPromotion(promotions[0].id);
  }
}

/* ========================================================================
   10. SAVE & VALIDATE PROMOTION FORM
   ======================================================================== */
function handlePromoFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById("formPromoId").value;
  let code = document.getElementById("formPromoCode").value.trim().toUpperCase();
  const name = document.getElementById("formPromoName").value.trim();
  const discountType = document.getElementById("formDiscountType").value;
  const discountValue = parseFloat(document.getElementById("formDiscountValue").value);
  const maxDiscount = parseFloat(document.getElementById("formMaxDiscount").value) || discountValue;
  const minOrderValue = parseFloat(document.getElementById("formMinOrder").value) || 0;
  const startDate = document.getElementById("formStartDate").value;
  const endDate = document.getElementById("formEndDate").value;
  const maxUsage = parseInt(document.getElementById("formMaxUsage").value, 10);
  const perCustomerLimit = parseInt(document.getElementById("formPerCustomerLimit").value, 10) || 1;
  const isActive = document.getElementById("promoStatusActive").checked;
  const description = document.getElementById("formPromoDesc").value.trim();

  // VALIDATIONS
  if (!code) {
    showToast("Vui lòng nhập mã khuyến mãi", "warning");
    return;
  }

  // Check unique code
  const duplicate = promotions.find(p => p.code.toUpperCase() === code && p.id !== id);
  if (duplicate) {
    showToast(`Mã [${code}] đã tồn tại trong hệ thống! Vui lòng chọn mã khác`, "danger");
    return;
  }

  if (discountType === "PERCENT") {
    if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
      showToast("Phần trăm giảm phải từ 1% đến 100%", "danger");
      return;
    }
    if (isNaN(maxDiscount) || maxDiscount <= 0) {
      showToast("Vui lòng nhập mức giảm tối đa hợp lệ (> 0đ)", "danger");
      return;
    }
  } else {
    if (isNaN(discountValue) || discountValue <= 0) {
      showToast("Số tiền giảm giá phải lớn hơn 0đ", "danger");
      return;
    }
  }

  if (isNaN(minOrderValue) || minOrderValue < 0) {
    showToast("Giá trị đơn tối thiểu không hợp lệ", "danger");
    return;
  }

  const startD = new Date(startDate);
  const endD = new Date(endDate);
  if (isNaN(startD.getTime()) || isNaN(endD.getTime())) {
    showToast("Vui lòng nhập ngày giờ bắt đầu và kết thúc", "warning");
    return;
  }
  if (endD <= startD) {
    showToast("Ngày kết thúc phải diễn ra sau ngày bắt đầu!", "danger");
    return;
  }

  if (isNaN(maxUsage) || maxUsage <= 0) {
    showToast("Tổng lượt sử dụng phải lớn hơn 0", "danger");
    return;
  }

  if (isCreateMode) {
    const newPromo = {
      id,
      code,
      name,
      discountType,
      discountValue,
      maxDiscount: discountType === "PERCENT" ? maxDiscount : discountValue,
      minOrderValue,
      startDate,
      endDate,
      usageCount: 0,
      maxUsage,
      perCustomerLimit,
      isActive,
      description
    };
    promotions.unshift(newPromo);
    isCreateMode = false;
    selectedPromoId = newPromo.id;
    showToast(`Đã tạo thành công mã khuyến mãi: [${code}]!`, "success");
  } else {
    const idx = promotions.findIndex(p => p.id === id);
    if (idx !== -1) {
      promotions[idx].code = code;
      promotions[idx].name = name;
      promotions[idx].discountType = discountType;
      promotions[idx].discountValue = discountValue;
      promotions[idx].maxDiscount = discountType === "PERCENT" ? maxDiscount : discountValue;
      promotions[idx].minOrderValue = minOrderValue;
      promotions[idx].startDate = startDate;
      promotions[idx].endDate = endDate;
      promotions[idx].maxUsage = maxUsage;
      promotions[idx].perCustomerLimit = perCustomerLimit;
      promotions[idx].isActive = isActive;
      promotions[idx].description = description;
      showToast(`Đã lưu thay đổi cho mã [${code}]!`, "success");
    }
  }

  renderKPIs();
  handleFilter();
  selectPromotion(selectedPromoId || id);
}

/* ========================================================================
   11. QUICK TOGGLES & DELETE
   ======================================================================== */
function quickTogglePromoStatus(id, e) {
  if (e) e.stopPropagation();
  const promo = promotions.find(p => p.id === id);
  if (!promo) return;

  promo.isActive = !promo.isActive;
  renderKPIs();
  renderTable();

  if (selectedPromoId === id) {
    selectPromotion(id);
  }

  showToast(`Đã ${promo.isActive ? 'KÍCH HOẠT' : 'TẠM DỪNG'} mã [${promo.code}]`, promo.isActive ? "success" : "warning");
}

function quickToggleCurrentPromo() {
  if (!selectedPromoId) return;
  quickTogglePromoStatus(selectedPromoId);
}

function prepareDeletePromo(id, e) {
  if (e) e.stopPropagation();
  promoIdToDelete = id;
  const promo = promotions.find(p => p.id === id);
  if (!promo) return;

  const descElem = document.getElementById("deletePromoModalDesc");
  if (descElem) {
    descElem.innerHTML = `Bạn có chắc chắn muốn xóa mã khuyến mãi <strong>${promo.code}</strong> (${promo.name})?`;
  }
  const modal = document.getElementById("deletePromoModalBackdrop");
  if (modal) modal.classList.add("active");
}

function triggerDeleteCurrentPromo() {
  if (!selectedPromoId) return;
  prepareDeletePromo(selectedPromoId);
}

function closeDeletePromoModal() {
  const modal = document.getElementById("deletePromoModalBackdrop");
  if (modal) modal.classList.remove("active");
  promoIdToDelete = null;
}

function confirmDeletePromo() {
  if (!promoIdToDelete) return;
  const idx = promotions.findIndex(p => p.id === promoIdToDelete);
  if (idx !== -1) {
    const code = promotions[idx].code;
    promotions.splice(idx, 1);
    showToast(`Đã xóa mã khuyến mãi [${code}]!`, "danger");
    renderKPIs();
    handleFilter();

    if (promotions.length > 0) {
      selectPromotion(promotions[0].id);
    } else {
      triggerAddNewPromotion();
    }
  }
  closeDeletePromoModal();
}

/* ========================================================================
   12. INTERACTIVE DISCOUNT CALCULATOR / VALIDATOR WIDGET
   ======================================================================== */
function resetTesterCalculator() {
  const resultBox = document.getElementById("testerResultBox");
  if (resultBox) {
    resultBox.style.display = "none";
    resultBox.className = "tester-result-box";
  }
}

function testApplyCurrentPromo() {
  const orderInput = document.getElementById("testOrderAmount");
  const shippingInput = document.getElementById("testShippingFee");
  const resultBox = document.getElementById("testerResultBox");

  const orderAmount = parseFloat(orderInput.value) || 0;
  const shippingFee = parseFloat(shippingInput.value) || 0;

  // Retrieve current form values
  const code = document.getElementById("formPromoCode").value.trim().toUpperCase() || "MÃ THỬ";
  const discountType = document.getElementById("formDiscountType").value;
  const discountValue = parseFloat(document.getElementById("formDiscountValue").value) || 0;
  const maxDiscount = parseFloat(document.getElementById("formMaxDiscount").value) || discountValue;
  const minOrderValue = parseFloat(document.getElementById("formMinOrder").value) || 0;
  const startDate = new Date(document.getElementById("formStartDate").value);
  const endDate = new Date(document.getElementById("formEndDate").value);
  const isActive = document.getElementById("promoStatusActive").checked;

  const promoObj = promotions.find(p => p.id === selectedPromoId);
  const usageCount = promoObj ? promoObj.usageCount : 0;
  const maxUsage = promoObj ? promoObj.maxUsage : 100;

  const now = new Date();

  // VALIDATION CHECKS
  // 1. Is active?
  if (!isActive) {
    showTesterError(`Mã [${code}] hiện đang bị TẮT (Tạm dừng). Không thể áp dụng!`);
    return;
  }

  // 2. Date validity?
  if (now < startDate) {
    showTesterError(`Chương trình khuyến mãi chưa bắt đầu! Bắt đầu lúc: ${formatDisplayDate(startDate.toISOString())}`);
    return;
  }
  if (now > endDate) {
    showTesterError(`Mã khuyến mãi đã HẾT HẠN sử dụng từ: ${formatDisplayDate(endDate.toISOString())}`);
    return;
  }

  // 3. Usage limit check?
  if (usageCount >= maxUsage) {
    showTesterError(`Mã đã đạt giới hạn tối đa ${maxUsage} lượt sử dụng!`);
    return;
  }

  // 4. Minimum order check?
  if (orderAmount < minOrderValue) {
    showTesterError(`Đơn hàng (${formatVND(orderAmount)}) chưa đạt giá trị tối thiểu ${formatVND(minOrderValue)}`);
    return;
  }

  // CALCULATE DISCOUNT
  let computedDiscount = 0;
  let calculationNote = "";

  if (discountType === "PERCENT") {
    const rawDiscount = (orderAmount * discountValue) / 100;
    if (rawDiscount > maxDiscount) {
      computedDiscount = maxDiscount;
      calculationNote = `Giảm ${discountValue}% (${formatVND(rawDiscount)}), chặn mức trần tối đa ${formatVND(maxDiscount)}`;
    } else {
      computedDiscount = rawDiscount;
      calculationNote = `Giảm đúng ${discountValue}% trên giá trị đơn hàng`;
    }
    // Cannot exceed order amount
    computedDiscount = Math.min(computedDiscount, orderAmount);
  } else if (discountType === "FIXED_AMOUNT") {
    computedDiscount = Math.min(discountValue, orderAmount);
    calculationNote = `Khấu trừ trực tiếp ${formatVND(computedDiscount)} vào tiền món`;
  } else if (discountType === "SHIPPING") {
    computedDiscount = Math.min(discountValue, shippingFee);
    calculationNote = `Hỗ trợ phí vận chuyển ${formatVND(computedDiscount)} (phí gốc ${formatVND(shippingFee)})`;
  }

  const finalPayable = Math.max(0, (orderAmount + shippingFee) - computedDiscount);

  // Render Pass Result
  resultBox.className = "tester-result-box valid";
  resultBox.style.display = "block";
  resultBox.innerHTML = `
    <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
      <span>✓</span>
      <span>ĐỦ ĐIỀU KIỆN ÁP DỤNG MÃ [${code}]</span>
    </div>
    <div class="tester-calc-row">
      <span>Giá trị tiền món:</span>
      <span>${formatVND(orderAmount)}</span>
    </div>
    <div class="tester-calc-row">
      <span>Phí giao hàng:</span>
      <span>${formatVND(shippingFee)}</span>
    </div>
    <div class="tester-calc-row" style="color: var(--success); font-weight: 700;">
      <span>Số tiền giảm trừ:</span>
      <span>-${formatVND(computedDiscount)}</span>
    </div>
    <div style="font-size: 11px; color: #2E7D32; margin-bottom: 6px; font-style: italic;">
      * ${calculationNote}
    </div>
    <div class="tester-calc-total">
      <span>TỔNG KHÁCH THANH TOÁN:</span>
      <span style="color: var(--brand-burgundy); font-size: 14.5px;">${formatVND(finalPayable)}</span>
    </div>
  `;
}

function showTesterError(msg) {
  const resultBox = document.getElementById("testerResultBox");
  resultBox.className = "tester-result-box invalid";
  resultBox.style.display = "block";
  resultBox.innerHTML = `
    <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
      <span>✕</span>
      <span>KHÔNG THỂ ÁP DỤNG MÃ</span>
    </div>
    <div style="font-size: 12px; line-height: 1.4;">
      ${msg}
    </div>
  `;
}

/* ========================================================================
   13. TOAST NOTIFICATIONS (FALLBACK)
   ======================================================================== */
function showToast(message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast-msg ${type}`;

  let icon = "✓";
  if (type === "danger") icon = "✕";
  if (type === "warning") icon = "⚠️";
  if (type === "info") icon = "ℹ️";

  toast.innerHTML = `
    <span style="font-size: 16px;">${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(50px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ========================================================================
   14. HEADER NOTIFICATIONS & NAVIGATION
   ======================================================================== */
function handleNavClick(module) {
  if (module === 'mon-an') {
    window.location.href = "/admin/products";
  } else if (module === 'don-hang') {
    window.location.href = "/admin/orders";
  } else if (module === 'khuyen-mai') {
    showToast("Bạn đang ở trang Quản lý khuyến mãi", "info");
  } else if (module === 'tai-khoan' || module === 'quan-ly-khac') {
    window.location.href = "/admin/accounts";
  }
}
