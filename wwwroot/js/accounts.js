/**
 * Cơm Trưa Anh Béo - Website Account Management Module (Quản lý tài khoản Website)
 * File: wwwroot/js/accounts.js
 * Frontend UI & Interaction Skeleton
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
   2. DOM READY INITIALIZATION
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  renderKPIs();
  renderAccountTable();
  renderRightPanel();
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

    // Format registration date: dd/MM/yyyy
    const regDate = new Date(acc.createdAt);
    const dateStr = `${String(regDate.getDate()).padStart(2, '0')}/${String(regDate.getMonth() + 1).padStart(2, '0')}/${regDate.getFullYear()}`;

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

  const regDate = new Date(acc.createdAt);
  document.getElementById("panelAccountRegDate").textContent = `${regDate.getDate()}/${regDate.getMonth() + 1}/${regDate.getFullYear()}`;

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

    <!-- Deactivate Action -->
    <button class="btn-order-action btn-secondary-action" onclick="openDeactivateModal()">
      ⏸️ Vô hiệu hóa tài khoản
    </button>

    <!-- Delete Action with Historical Preservation Notice -->
    <button class="btn-order-action btn-danger-outline" onclick="openDeleteModal()">
      🗑️ Xóa tài khoản (Bảo lưu đơn hàng)
    </button>
  `;
}

/* ==========================================================================
   6. ACCOUNT MANAGEMENT ACTIONS (LOCK, DEACTIVATE, DELETE)
   ========================================================================== */
function toggleAccountLock() {
  if (!selectedAccountId) return;
  const acc = accounts.find(a => a.id === selectedAccountId);
  if (!acc) return;

  if (acc.status === "LOCKED") {
    acc.status = "ACTIVE";
    showToast(`Đã mở khóa tài khoản cho ${acc.fullName}`, "success");
  } else {
    acc.status = "LOCKED";
    showToast(`Đã tạm khóa tài khoản của ${acc.fullName}`, "warning");
  }

  renderKPIs();
  renderAccountTable();
  renderRightPanel();

  // TODO: Call Backend Lock/Unlock Account API
}

// Deactivate Account Modal
function openDeactivateModal() {
  if (!selectedAccountId) return;
  const acc = accounts.find(a => a.id === selectedAccountId);
  if (!acc) return;

  document.getElementById("deactivateTargetName").textContent = `${acc.fullName} (${acc.phone})`;
  const modal = document.getElementById("deactivateAccountModal");
  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }
}

function closeDeactivateModal() {
  const modal = document.getElementById("deactivateAccountModal");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
}

function confirmDeactivateAccount() {
  if (!selectedAccountId) return;
  const acc = accounts.find(a => a.id === selectedAccountId);
  if (acc) {
    acc.status = "INACTIVE";
    showToast(`Đã vô hiệu hóa tài khoản ${acc.fullName}`, "info");
  }

  closeDeactivateModal();
  renderKPIs();
  renderAccountTable();
  renderRightPanel();

  // TODO: Call Backend Deactivate Account API
}

// Delete Account Modal (With Order History Preservation)
function openDeleteModal() {
  if (!selectedAccountId) return;
  const acc = accounts.find(a => a.id === selectedAccountId);
  if (!acc) return;

  document.getElementById("deleteTargetName").textContent = `${acc.fullName} (${acc.phone})`;
  const modal = document.getElementById("deleteAccountModal");
  if (modal) {
    modal.classList.add("active");
    modal.style.display = "flex";
  }
}

function closeDeleteModal() {
  const modal = document.getElementById("deleteAccountModal");
  if (modal) {
    modal.classList.remove("active");
    modal.style.display = "none";
  }
}

function confirmDeleteAccount() {
  if (!selectedAccountId) return;
  const acc = accounts.find(a => a.id === selectedAccountId);
  const name = acc ? acc.fullName : "";

  // Remove from frontend active accounts list
  accounts = accounts.filter(a => a.id !== selectedAccountId);
  selectedAccountId = null;

  closeDeleteModal();
  renderKPIs();
  renderAccountTable();
  renderRightPanel();

  showToast(`Đã xóa tài khoản ${name}. Dữ liệu đơn hàng lịch sử đã được bảo lưu an toàn.`, "danger");

  // TODO: Call Backend Delete Account API (Preserving historical orders in Database)
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
    window.location.href = "orders.html";
  } else if (module === 'mon-an') {
    window.location.href = "adminpage.html";
  } else if (module === 'khuyen-mai') {
    window.location.href = "Promotions.html";
  }
}

/* ==========================================================================
   8. OPTIONAL TESTING HELPER (LOAD DEMO DATA FOR UI VERIFICATION IN LIVE SERVER)
   ========================================================================== */
function loadDemoAccountsForTesting() {
  accounts = [
    {
      id: "ACC-001",
      fullName: "Nguyễn Văn An",
      phone: "0908 123 456",
      email: "vanan.nguyen@gmail.com",
      status: "ACTIVE",
      createdAt: "2026-08-15T09:30:00Z",
      addresses: [
        { label: "Văn phòng (Mặc định)", address: "Tòa nhà Bitexco, 2 Hải Triều, P. Bến Nghé, Quận 1, TP.HCM", isDefault: true, note: "Gửi lễ tân tầng G" },
        { label: "Nhà riêng", address: "145/8 Điện Biên Phủ, P. 15, Quận Bình Thạnh, TP.HCM", isDefault: false, note: "Gọi trước khi giao" }
      ],
      orders: [
        { orderId: "DH-1025", date: "07/11/2026", total: 98000, status: "Hoàn thành" },
        { orderId: "DH-1011", date: "01/11/2026", total: 145000, status: "Hoàn thành" },
        { orderId: "DH-0982", date: "24/10/2026", total: 92000, status: "Hoàn thành" }
      ]
    },
    {
      id: "ACC-002",
      fullName: "Trần Thị Bích Ngọc",
      phone: "0912 888 999",
      email: "bichngoc.tran@outlook.com",
      status: "ACTIVE",
      createdAt: "2026-09-02T14:15:00Z",
      addresses: [
        { label: "Công ty", address: "123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM", isDefault: true, note: "Lầu 4, phòng Marketing" }
      ],
      orders: [
        { orderId: "DH-1024", date: "07/11/2026", total: 123000, status: "Đang giao" },
        { orderId: "DH-0994", date: "28/10/2026", total: 85000, status: "Hoàn thành" }
      ]
    },
    {
      id: "ACC-003",
      fullName: "Lê Hoàng Long",
      phone: "0934 555 777",
      email: "hoanglong.le@yahoo.com",
      status: "LOCKED",
      createdAt: "2026-07-20T11:00:00Z",
      addresses: [
        { label: "Nhà riêng", address: "45 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM", isDefault: true, note: "" }
      ],
      orders: [
        { orderId: "DH-1023", date: "07/11/2026", total: 88000, status: "Đang giao" }
      ]
    },
    {
      id: "ACC-004",
      fullName: "Đỗ Minh Quân",
      phone: "0988 112 334",
      email: "minhquan.do@gmail.com",
      status: "ACTIVE",
      createdAt: "2026-10-10T16:45:00Z",
      addresses: [
        { label: "Văn phòng", address: "72 Nguyễn Thị Minh Khai, Quận 3, TP.HCM", isDefault: true, note: "" }
      ],
      orders: [
        { orderId: "DH-1022", date: "07/11/2026", total: 77000, status: "Hoàn thành" }
      ]
    }
  ];

  selectedAccountId = accounts[0].id;
  renderKPIs();
  renderAccountTable();
  renderRightPanel();
  showToast("Đã nạp 4 tài khoản khách hàng mẫu để kiểm thử UI Live Server", "success");
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
