/**
 * Cơm Trưa Anh Béo - Website Account Management Module (Quản lý tài khoản Website)
 * File: wwwroot/js/accounts.js
 */

/* ==========================================================================
   1. STATE & CONSTANTS
   ========================================================================== */
const ACCOUNT_STATUS = {
    ACTIVE: { key: "ACTIVE", label: "Đang hoạt động", css: "badge-acc-active" },
    LOCKED: { key: "LOCKED", label: "Đã khóa", css: "badge-acc-locked" },
    INACTIVE: { key: "INACTIVE", label: "Tạm dừng", css: "badge-acc-inactive" }
};

// Data Store (Starts EMPTY per AGENTS.md rule 4 & 24)
let accounts = [];
let selectedAccountId = null;

// Filters State
let currentSearch = "";
let currentStatusFilter = "ALL";

// Pagination State
let currentPage = 1;
const pageSize = 10;

/* ==========================================================================
   1B. API HELPERS (KẾT NỐI BACKEND /admin/api/accounts)
   ========================================================================== */
const ACCOUNTS_API = "/admin/api/accounts";

// Trạng thái đơn hàng lưu trong DB (cột TrangThai) -> nhãn tiếng Việt.
// Nếu gặp mã chưa có trong bảng này thì hiển thị nguyên mã.
const ORDER_STATUS_LABELS = {
    choxacnhan: "Chờ xác nhận",
    daxacnhan: "Đã xác nhận",
    dangchuanbi: "Đang chuẩn bị",
    dangtimtaixe: "Đang tìm tài xế",
    dacotaixe: "Đã có tài xế",
    danggiao: "Đang giao hàng",
    hoanthanh: "Hoàn thành",
    dahuy: "Đã hủy",
    thatbai: "Giao thất bại",
    giaothatbai: "Giao thất bại"
};

function orderStatusLabel(raw) {
    const key = String(raw || "").replace(/[\s_-]/g, "").toLowerCase();
    return ORDER_STATUS_LABELS[key] || raw || "";
}

async function getAntiforgeryToken() {
    const response = await fetch("/auth/antiforgery", {
        credentials: "same-origin",
        cache: "no-store"
    });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.token) {
        throw new Error("Không thể xác thực yêu cầu. Vui lòng tải lại trang.");
    }
    return result.token;
}

async function accountsApi(url, method = "GET") {
    const headers = {};
    if (method !== "GET") {
        headers.RequestVerificationToken = await getAntiforgeryToken();
    }

    const response = await fetch(url, {
        method,
        headers,
        credentials: "same-origin",
        cache: "no-store"
    });

    // Hết phiên đăng nhập: server chuyển hướng về trang đăng nhập (HTML)
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        throw new Error("Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại.");
    }

    const result = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(result?.message || "Yêu cầu không thành công. Vui lòng thử lại.");
    }
    return result;
}

async function loadAccounts() {
    try {
        const result = await accountsApi(ACCOUNTS_API);
        accounts = (result.accounts || []).map(a => ({
            ...a,
            addresses: [],
            orders: [],
            detailLoaded: false
        }));

        if (selectedAccountId && !accounts.some(a => a.id === selectedAccountId)) {
            selectedAccountId = null;
        }

        renderKPIs();
        renderAccountTable();
        renderRightPanel();
    } catch (error) {
        showToast(error instanceof Error ? error.message : "Không thể tải danh sách tài khoản.", "danger");
    }
}

async function loadAccountDetail(acc) {
    try {
        const detail = await accountsApi(`${ACCOUNTS_API}/${encodeURIComponent(acc.id)}`);
        acc.addresses = detail.addresses || [];
        acc.orders = (detail.orders || []).map(o => ({ ...o, status: orderStatusLabel(o.status) }));
        acc.detailLoaded = true;
        if (selectedAccountId === acc.id) renderRightPanel();
    } catch (error) {
        showToast(error instanceof Error ? error.message : "Không thể tải chi tiết tài khoản.", "danger");
    }
}

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "—";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/* ==========================================================================
   2. DOM READY INITIALIZATION
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
    initEventListeners();
    renderKPIs();
    renderAccountTable();
    renderRightPanel();
    loadAccounts();
});

function initEventListeners() {
    // Search Input (Name, Phone, Email)
    const searchInput = document.getElementById("searchAccountInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value.trim().toLowerCase();
            currentPage = 1;
            renderAccountTable();
        });
    }

    // Filter Status Select
    const statusFilter = document.getElementById("filterAccountStatus");
    if (statusFilter) {
        statusFilter.addEventListener("change", (e) => {
            currentStatusFilter = e.target.value;
            currentPage = 1;
            renderAccountTable();
        });
    }

    // Header Notifications Dropdown
    const notiBtn = document.getElementById("notiBtn");
    const notiDropdown = document.getElementById("notiDropdown");
    if (notiBtn && notiDropdown) {
        notiBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            notiDropdown.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!notiDropdown.contains(e.target) && e.target !== notiBtn) {
                notiDropdown.classList.remove("active");
            }
        });
    }
}

function resetAllFilters() {
    currentSearch = "";
    currentStatusFilter = "ALL";
    currentPage = 1;

    const searchInput = document.getElementById("searchAccountInput");
    if (searchInput) searchInput.value = "";
    const statusFilter = document.getElementById("filterAccountStatus");
    if (statusFilter) statusFilter.value = "ALL";

    renderAccountTable();
    showToast("Đã đặt lại bộ lọc tìm kiếm", "info");
}

/* ==========================================================================
   3. FILTERING & KPI LOGIC
   ========================================================================== */
function getFilteredAccounts() {
    return accounts.filter(acc => {
        // Search text
        if (currentSearch) {
            const matchName = acc.fullName.toLowerCase().includes(currentSearch);
            const matchPhone = acc.phone.toLowerCase().includes(currentSearch);
            const matchEmail = (acc.email || "").toLowerCase().includes(currentSearch);
            if (!matchName && !matchPhone && !matchEmail) return false;
        }

        // Status filter
        if (currentStatusFilter !== "ALL" && acc.status !== currentStatusFilter) {
            return false;
        }

        return true;
    });
}

function renderKPIs() {
    const total = accounts.length;
    const active = accounts.filter(a => a.status === "ACTIVE").length;
    const locked = accounts.filter(a => a.status === "LOCKED" || a.status === "INACTIVE").length;

    document.getElementById("kpiTotalAccounts").textContent = total;
    document.getElementById("kpiActiveAccounts").textContent = active;
    document.getElementById("kpiLockedAccounts").textContent = locked;
}

/* ==========================================================================
   4. RENDER ACCOUNT TABLE
   ========================================================================== */
function renderAccountTable() {
    const tableBody = document.getElementById("accountTableBody");
    const emptyState = document.getElementById("accountEmptyState");
    const paginationWrap = document.getElementById("accountPaginationBar");

    if (!tableBody) return;

    const filtered = getFilteredAccounts();

    // If list is empty
    if (filtered.length === 0) {
        tableBody.innerHTML = "";
        if (emptyState) emptyState.style.display = "flex";
        if (paginationWrap) paginationWrap.style.display = "none";
        return;
    }

    if (emptyState) emptyState.style.display = "none";
    if (paginationWrap) paginationWrap.style.display = "flex";

    // Pagination slice
    const totalPages = Math.ceil(filtered.length / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, filtered.length);
    const pagedAccounts = filtered.slice(startIndex, endIndex);

    tableBody.innerHTML = pagedAccounts.map(acc => {
        const isSelected = selectedAccountId === acc.id;
        const statusDef = ACCOUNT_STATUS[acc.status] || { label: acc.status, css: "badge-acc-active" };

        // Format registration date: dd/MM/yyyy (chưa có dữ liệu thì hiện "—")
        const dateStr = formatDate(acc.createdAt);

        // Avatar initials
        const initials = acc.fullName.split(" ").map(n => n[0]).slice(-2).join("").toUpperCase();

        return `
      <tr class="${isSelected ? 'selected-row' : ''}" onclick="selectAccount('${acc.id}', event)">
        <td>
          <div class="user-cell">
            <div class="user-avatar-circle">${escapeHtml(initials)}</div>
            <div class="user-name-title">${escapeHtml(acc.fullName)}</div>
          </div>
        </td>
        <td>
          <span class="user-phone-mono">${escapeHtml(acc.phone)}</span>
        </td>
        <td>
          <span class="user-email-text">${escapeHtml(acc.email || "Chưa cập nhật")}</span>
        </td>
        <td style="font-size: 12px; color: var(--text-secondary); white-space: nowrap;">
          ${dateStr}
        </td>
        <td>
          <span class="badge-acc-status ${statusDef.css}">
            ${statusDef.label}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="bulk-action-btn bulk-btn-print" onclick="selectAccount('${acc.id}');" title="Xem chi tiết tài khoản">
            👁️ Xem
          </button>
        </td>
      </tr>
    `;
    }).join("");

    document.getElementById("paginationInfoText").textContent = `Hiển thị ${filtered.length > 0 ? startIndex + 1 : 0} - ${endIndex} trên ${filtered.length} tài khoản`;
    renderPaginationButtons(totalPages);
}

function renderPaginationButtons(totalPages) {
    const container = document.getElementById("paginationButtonsWrap");
    if (!container) return;

    let html = `
    <button class="bulk-action-btn bulk-btn-print" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
      &laquo; Trước
    </button>
  `;

    for (let i = 1; i <= totalPages; i++) {
        html += `
      <button class="bulk-action-btn ${i === currentPage ? 'bulk-btn-confirm' : 'bulk-btn-print'}" onclick="changePage(${i})">
        ${i}
      </button>
    `;
    }

    html += `
    <button class="bulk-action-btn bulk-btn-print" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
      Sau &raquo;
    </button>
  `;

    container.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderAccountTable();
}

/* ==========================================================================
   5. SELECTION & RIGHT PANEL RENDERING
   ========================================================================== */
function selectAccount(accountId, event) {
    selectedAccountId = accountId;
    document.querySelectorAll("#accountTableBody tr").forEach(tr => tr.classList.remove("selected-row"));
    renderAccountTable();
    renderRightPanel();

    const acc = accounts.find(a => a.id === accountId);
    if (acc && !acc.detailLoaded) loadAccountDetail(acc);
}

function renderRightPanel() {
    const emptyPlaceholder = document.getElementById("panelEmptyPlaceholder");
    const detailContent = document.getElementById("panelDetailContent");

    if (!selectedAccountId) {
        if (emptyPlaceholder) emptyPlaceholder.style.display = "flex";
        if (detailContent) detailContent.style.display = "none";
        return;
    }

    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!acc) {
        if (emptyPlaceholder) emptyPlaceholder.style.display = "flex";
        if (detailContent) detailContent.style.display = "none";
        return;
    }

    if (emptyPlaceholder) emptyPlaceholder.style.display = "none";
    if (detailContent) detailContent.style.display = "flex";

    const statusDef = ACCOUNT_STATUS[acc.status] || { label: acc.status, css: "badge-acc-active" };

    // Personal Info
    const initials = acc.fullName.split(" ").map(n => n[0]).slice(-2).join("").toUpperCase();
    document.getElementById("panelAccountAvatar").textContent = initials;
    document.getElementById("panelAccountFullName").textContent = acc.fullName;
    document.getElementById("panelAccountPhone").textContent = acc.phone;
    document.getElementById("panelAccountEmail").textContent = acc.email || "Chưa có email";

    const statusBadge = document.getElementById("panelAccountStatusBadge");
    statusBadge.className = `badge-acc-status ${statusDef.css}`;
    statusBadge.textContent = statusDef.label;

    // Saved Delivery Addresses
    const addressList = document.getElementById("panelSavedAddressesList");
    if (acc.addresses && acc.addresses.length > 0) {
        addressList.innerHTML = acc.addresses.map((addr, idx) => `
      <div class="saved-address-item">
        <div class="address-header-row">
          <strong style="color: var(--brand-burgundy);">${escapeHtml(addr.label || `Địa chỉ ${idx + 1}`)}</strong>
          ${addr.isDefault ? `<span class="address-tag-default">Mặc định</span>` : ''}
        </div>
        <div class="address-text">📍 ${escapeHtml(addr.address)}</div>
        ${addr.note ? `<div style="font-size: 11px; color: var(--text-muted);">Ghi chú: ${escapeHtml(addr.note)}</div>` : ''}
      </div>
    `).join("");
    } else {
        addressList.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Khách hàng chưa lưu sổ địa chỉ giao hàng.</div>`;
    }

    // Order History
    const historyList = document.getElementById("panelOrderHistoryList");
    if (acc.orders && acc.orders.length > 0) {
        historyList.innerHTML = acc.orders.map(o => `
      <div class="order-history-card-item">
        <div>
          <span class="history-order-id">#${escapeHtml(o.orderId)}</span>
          <div class="history-order-date">${escapeHtml(o.date)}</div>
        </div>
        <div style="text-align: right;">
          <div class="history-order-amount">${formatVND(o.total)}</div>
          <span style="font-size: 10.5px; color: ${o.status === 'Hoàn thành' ? 'var(--success)' : 'var(--text-secondary)'}; font-weight: 700;">
            ${escapeHtml(o.status)}
          </span>
        </div>
      </div>
    `).join("");
    } else {
        historyList.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Chưa có lịch sử đơn hàng nào.</div>`;
    }

    // Management Actions Footer
    renderActionButtons(acc);
}

function renderActionButtons(acc) {
    const footer = document.getElementById("panelActionsFooter");
    if (!footer) return;

    const isLocked = acc.status === "LOCKED";

    footer.innerHTML = `
    <!-- Lock / Unlock Action -->
    <button class="btn-order-action ${isLocked ? 'btn-primary-burgundy' : 'btn-secondary-action'}" onclick="toggleAccountLock()">
      ${isLocked ? '🔓 Mở khóa tài khoản' : '🔒 Khóa tài khoản'}
    </button>
  `;
}

/* ==========================================================================
   6. ACCOUNT MANAGEMENT ACTIONS (LOCK / UNLOCK)
   ========================================================================== */
async function toggleAccountLock() {
    if (!selectedAccountId) return;
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!acc) return;

    const wasLocked = acc.status !== "ACTIVE";
    try {
        const result = await accountsApi(
            `${ACCOUNTS_API}/${encodeURIComponent(acc.id)}/${wasLocked ? "unlock" : "lock"}`,
            "POST"
        );
        acc.status = result.status;
        showToast(
            wasLocked ? `Đã mở khóa tài khoản cho ${acc.fullName}` : `Đã tạm khóa tài khoản của ${acc.fullName}`,
            wasLocked ? "success" : "warning"
        );
    } catch (error) {
        showToast(error instanceof Error ? error.message : "Không thể cập nhật tài khoản.", "danger");
    }

    renderKPIs();
    renderAccountTable();
    renderRightPanel();
}

/* ==========================================================================
   7. NAVIGATION & TOASTS
   ========================================================================== */
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
    <span>${escapeHtml(message)}</span>
  `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(50px)";
        toast.style.transition = "all 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3200);
}

function markAllNotiRead() {
    document.querySelectorAll(".noti-item").forEach(item => item.classList.remove("unread"));
    const badge = document.getElementById("notiBadgeCount");
    if (badge) badge.style.display = "none";
    showToast("Đã đánh dấu đọc tất cả thông báo", "info");
}

function handleNavClick(module) {
    if (module === 'tai-khoan') {
        showToast("Bạn đang ở trang Quản lý tài khoản Website", "info");
    } else if (module === 'don-hang') {
        window.location.href = "/admin/orders";
    } else if (module === 'mon-an') {
        window.location.href = "/admin/products";
    } else if (module === 'khuyen-mai') {
        window.location.href = "/admin/promotions";
    }
}

/* ==========================================================================
   9. UTILITIES
   ========================================================================== */
function formatVND(num) {
    if (isNaN(num)) return "0đ";
    return new Intl.NumberFormat('vi-VN').format(num) + "đ";
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}