/**
 * Cơm Trưa Anh Béo - Website Account Management Module (Quản lý tài khoản Website)
 * File: wwwroot/js/accounts.js
 * Đồng bộ trực tiếp với Backend KhachHangController và KhachHangService.
 * Nguyên tắc: Backend là nguồn chức năng chuẩn, không sử dụng dữ liệu giả lập.
 */

// =============================================================================
// 1. STATE MANAGEMENT
// =============================================================================
let customers = [];
let selectedCustomer = null;
let currentPage = 1;
const pageSize = 10;
let totalItems = 0;
let totalPages = 1;
let currentKeyword = "";
let currentStatusFilter = "ALL";
let searchDebounceTimer = null;

// =============================================================================
// 2. KHỞI TẠO KHI TẢI TRANG
// =============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  fetchAccounts(1);
});

function initEventListeners() {
  // Tìm kiếm theo từ khóa (Họ tên, SĐT, Email) với Debounce 350ms
  const searchInput = document.getElementById("searchAccountInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        currentKeyword = e.target.value.trim();
        fetchAccounts(1);
      }, 350);
    });

    // Enter để tìm kiếm ngay
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        clearTimeout(searchDebounceTimer);
        currentKeyword = e.target.value.trim();
        fetchAccounts(1);
      }
    });
  }
}

function handleStatusFilterChange() {
  const filterEl = document.getElementById("filterAccountStatus");
  currentStatusFilter = filterEl ? filterEl.value : "ALL";
  renderAccountTable();
}

function resetAllFilters() {
  currentKeyword = "";
  currentStatusFilter = "ALL";
  currentPage = 1;

  const searchInput = document.getElementById("searchAccountInput");
  if (searchInput) searchInput.value = "";

  const statusFilter = document.getElementById("filterAccountStatus");
  if (statusFilter) statusFilter.value = "ALL";

  fetchAccounts(1);
  showToast("Đã đặt lại bộ lọc tìm kiếm", "info");
}

// =============================================================================
// 3. GỌI API BACKEND LẤY DANH SÁCH & TÌM KIẾM KHÁCH HÀNG
// =============================================================================
async function fetchAccounts(page = 1) {
  const refreshBtn = document.getElementById("btnRefreshAccounts");
  if (refreshBtn) refreshBtn.classList.add("loading");

  const tableBody = document.getElementById("accountTableBody");
  const emptyState = document.getElementById("accountEmptyState");
  const paginationWrap = document.getElementById("accountPaginationBar");

  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 28px; color: var(--text-muted);">
          <div style="font-size: 26px; margin-bottom: 8px;">⏳</div>
          Đang tải danh sách tài khoản khách hàng từ máy chủ...
        </td>
      </tr>
    `;
  }

  try {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    });

    if (currentKeyword) {
      params.append("keyword", currentKeyword);
    }

    const res = await fetch(`/api/khach-hang?${params.toString()}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "same-origin"
    });

    if (res.status === 401 || res.status === 403) {
      if (tableBody) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align: center; padding: 28px; color: var(--danger);">
              <div style="font-size: 26px; margin-bottom: 6px;">🔒</div>
              Phiên làm việc Quản trị viên đã hết hạn hoặc không có quyền truy cập. Vui lòng đăng nhập lại.
            </td>
          </tr>
        `;
      }
      return;
    }

    if (!res.ok) {
      throw new Error(`Máy chủ phản hồi mã lỗi HTTP ${res.status}`);
    }

    const data = await res.json();
    customers = Array.isArray(data.items) ? data.items : [];
    totalItems = data.totalItems || 0;
    currentPage = data.page || 1;
    totalPages = data.totalPages || 1;

    updateKPIs();
    renderAccountTable();

    // Nếu khách hàng đang chọn vẫn nằm trong trang mới, cập nhật lại dữ liệu chi tiết
    if (selectedCustomer) {
      const updated = customers.find(c => c.maTk === selectedCustomer.maTk);
      if (updated) {
        selectedCustomer = updated;
        renderRightPanel();
      }
    }
  } catch (err) {
    console.error("Lỗi khi tải danh sách khách hàng:", err);
    if (tableBody) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 28px; color: var(--danger);">
            <div style="font-size: 24px; margin-bottom: 6px;">✕</div>
            Không thể kết nối đến máy chủ: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
    showToast(`Lỗi kết nối máy chủ: ${err.message}`, "danger");
  } finally {
    if (refreshBtn) refreshBtn.classList.remove("loading");
  }
}

// =============================================================================
// 4. HIỂN THỊ DỮ LIỆU & BẢNG
// =============================================================================
function getFilteredCustomers() {
  if (currentStatusFilter === "ACTIVE") {
    return customers.filter(c => c.hoatDong === true);
  } else if (currentStatusFilter === "LOCKED") {
    return customers.filter(c => c.hoatDong === false);
  }
  return customers;
}

function updateKPIs() {
  const activeCount = customers.filter(c => c.hoatDong).length;
  const lockedCount = customers.filter(c => !c.hoatDong).length;

  const totalEl = document.getElementById("kpiTotalAccounts");
  const activeEl = document.getElementById("kpiActiveAccounts");
  const lockedEl = document.getElementById("kpiLockedAccounts");

  if (totalEl) totalEl.textContent = totalItems;
  if (activeEl) activeEl.textContent = activeCount;
  if (lockedEl) lockedEl.textContent = lockedCount;
}

function renderAccountTable() {
  const tableBody = document.getElementById("accountTableBody");
  const emptyState = document.getElementById("accountEmptyState");
  const paginationWrap = document.getElementById("accountPaginationBar");

  if (!tableBody) return;

  const displayList = getFilteredCustomers();

  if (displayList.length === 0) {
    tableBody.innerHTML = "";
    if (emptyState) emptyState.style.display = "flex";
    if (paginationWrap) paginationWrap.style.display = "none";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (paginationWrap) paginationWrap.style.display = "flex";

  tableBody.innerHTML = displayList.map(acc => {
    const isSelected = selectedCustomer && selectedCustomer.maTk === acc.maTk;
    const isHoatDong = acc.hoatDong === true;
    const statusCss = isHoatDong ? "badge-acc-active" : "badge-acc-locked";
    const statusText = isHoatDong ? "Đang hoạt động" : "Đã khóa";

    // Avatar chữ cái đầu
    const nameParts = (acc.hoTen || "KH").trim().split(" ");
    const initials = nameParts.length >= 2
      ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
      : nameParts[0].substring(0, 2).toUpperCase();

    const diaChiShort = acc.diaChi ? escapeHtml(acc.diaChi) : '<span style="color: var(--text-muted); font-style: italic;">Chưa có địa chỉ</span>';

    return `
      <tr class="${isSelected ? 'selected-row' : ''}" onclick="handleSelectCustomer(${acc.maTk})" style="cursor: pointer;">
        <td><strong style="color: var(--brand-burgundy);">#KH-${acc.maTk}</strong></td>
        <td>
          <div class="user-cell">
            <div class="user-avatar-circle">${escapeHtml(initials)}</div>
            <div class="user-name-title">${escapeHtml(acc.hoTen || "Khách hàng")}</div>
          </div>
        </td>
        <td>
          <span class="user-phone-mono">${escapeHtml(acc.sdt || "--")}</span>
        </td>
        <td>
          <span class="user-email-text">${escapeHtml(acc.email || "--")}</span>
        </td>
        <td style="max-width: 200px; font-size: 12px; white-space: normal; line-height: 1.3;" title="${escapeHtml(acc.diaChi || '')}">
          ${diaChiShort}
        </td>
        <td>
          <span class="badge-acc-status ${statusCss}">
            ${statusText}
          </span>
        </td>
        <td style="text-align: right;">
          <button type="button" class="bulk-action-btn bulk-btn-print" onclick="event.stopPropagation(); handleSelectCustomer(${acc.maTk});" title="Xem chi tiết tài khoản">
            👁️ Chi tiết
          </button>
        </td>
      </tr>
    `;
  }).join("");

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + displayList.length, totalItems);
  const infoText = document.getElementById("paginationInfoText");
  if (infoText) {
    infoText.textContent = `Hiển thị ${totalItems > 0 ? startIndex + 1 : 0} - ${endIndex} trên tổng số ${totalItems} tài khoản khách hàng`;
  }

  renderPaginationButtons(totalPages);
}

function renderPaginationButtons(total) {
  const container = document.getElementById("paginationButtonsWrap");
  if (!container) return;

  if (total <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = `
    <button type="button" class="bulk-action-btn bulk-btn-print" ${currentPage === 1 ? 'disabled' : ''} onclick="fetchAccounts(${currentPage - 1})">
      &laquo; Trước
    </button>
  `;

  for (let i = 1; i <= total; i++) {
    html += `
      <button type="button" class="bulk-action-btn ${i === currentPage ? 'bulk-btn-confirm' : 'bulk-btn-print'}" onclick="fetchAccounts(${i})">
        ${i}
      </button>
    `;
  }

  html += `
    <button type="button" class="bulk-action-btn bulk-btn-print" ${currentPage === total ? 'disabled' : ''} onclick="fetchAccounts(${currentPage + 1})">
      Sau &raquo;
    </button>
  `;

  container.innerHTML = html;
}

// =============================================================================
// 5. CHỌN VÀ HIỂN THỊ CHI TIẾT KHÁCH HÀNG Ở PANEL PHẢI
// =============================================================================
async function handleSelectCustomer(maTk) {
  // Tìm trong mảng hiện tại trước để phản hồi nhanh
  let cust = customers.find(c => c.maTk === maTk);
  if (cust) {
    selectedCustomer = cust;
    renderAccountTable();
    renderRightPanel();
  }

  // Gọi GET /api/khach-hang/{maTk} để đảm bảo dữ liệu mới nhất từ database
  try {
    const res = await fetch(`/api/khach-hang/${maTk}`, {
      method: "GET",
      headers: { "Accept": "application/json" },
      credentials: "same-origin"
    });

    if (res.ok) {
      selectedCustomer = await res.json();
      renderRightPanel();
    }
  } catch (err) {
    console.warn("Không thể đồng bộ chi tiết khách hàng:", err);
  }
}

function renderRightPanel() {
  const emptyPlaceholder = document.getElementById("panelEmptyPlaceholder");
  const detailContent = document.getElementById("panelDetailContent");
  const subtitle = document.getElementById("panelSubtitle");

  if (!selectedCustomer) {
    if (emptyPlaceholder) emptyPlaceholder.style.display = "flex";
    if (detailContent) detailContent.style.display = "none";
    return;
  }

  if (emptyPlaceholder) emptyPlaceholder.style.display = "none";
  if (detailContent) detailContent.style.display = "flex";

  if (subtitle) {
    subtitle.textContent = `Đang quản trị #KH-${selectedCustomer.maTk}`;
  }

  const isHoatDong = selectedCustomer.hoatDong === true;
  const statusCss = isHoatDong ? "badge-acc-active" : "badge-acc-locked";
  const statusText = isHoatDong ? "Đang hoạt động" : "Đã khóa";

  // Avatar chữ cái
  const nameParts = (selectedCustomer.hoTen || "KH").trim().split(" ");
  const initials = nameParts.length >= 2
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : nameParts[0].substring(0, 2).toUpperCase();

  setText("panelAccountAvatar", initials);
  setText("panelAccountFullName", selectedCustomer.hoTen || "Khách hàng");
  setText("panelAccountMaTk", `Mã tài khoản: #KH-${selectedCustomer.maTk}`);
  setText("panelAccountPhone", selectedCustomer.sdt || "--");
  setText("panelAccountEmail", selectedCustomer.email || "--");

  const badgeEl = document.getElementById("panelAccountStatusBadge");
  if (badgeEl) {
    badgeEl.className = `badge-acc-status ${statusCss}`;
    badgeEl.textContent = statusText;
  }

  // Địa chỉ nhận hàng
  const addrEl = document.getElementById("panelAccountAddress");
  if (addrEl) {
    addrEl.innerHTML = selectedCustomer.diaChi
      ? `<strong>📍 ${escapeHtml(selectedCustomer.diaChi)}</strong>`
      : `<span style="color: var(--text-muted); font-style: italic;">Khách hàng chưa cập nhật địa chỉ giao hàng.</span>`;
  }

  // Tình trạng đăng nhập
  const loginStateEl = document.getElementById("panelAccountLoginState");
  if (loginStateEl) {
    loginStateEl.textContent = isHoatDong ? "Cho phép đăng nhập" : "Bị chặn đăng nhập";
    loginStateEl.style.color = isHoatDong ? "#2E7D32" : "#C62828";
  }

  // Footer Actions: Khóa hoặc Mở khóa tài khoản
  renderActionButtons(selectedCustomer);
}

function renderActionButtons(cust) {
  const footer = document.getElementById("panelActionsFooter");
  if (!footer) return;

  const isLocked = !cust.hoatDong;

  footer.innerHTML = `
    <button type="button" class="btn-order-action ${isLocked ? 'btn-primary-burgundy' : 'btn-secondary-action'}"
            id="btnToggleLock"
            onclick="toggleAccountLock(${cust.maTk}, ${cust.hoatDong})"
            style="${isLocked ? 'background: #2E7D32; color: #fff;' : 'background: #D32F2F; color: #fff;'}">
      ${isLocked ? '🔓 Mở khóa tài khoản' : '🔒 Khóa tài khoản khách hàng'}
    </button>
  `;
}

// =============================================================================
// 6. THAO TÁC QUẢN TRỊ: KHÓA / MỞ KHÓA TÀI KHOẢN (PATCH)
// =============================================================================
async function toggleAccountLock(maTk, currentHoatDong) {
  const newStatus = !currentHoatDong;
  const actionName = newStatus ? "MỞ KHÓA" : "KHÓA";
  const confirmMsg = `Bạn có chắc chắn muốn ${actionName} tài khoản khách hàng #KH-${maTk}?\n\n${
    newStatus
      ? "Khách hàng sẽ được phép đăng nhập lại vào hệ thống để đặt món."
      : "Khách hàng sẽ bị chặn đăng nhập vào hệ thống cho đến khi được mở khóa."
  }`;

  if (!confirm(confirmMsg)) return;

  const btn = document.getElementById("btnToggleLock");
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`/api/khach-hang/${maTk}/trang-thai`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ hoatDong: newStatus })
    });

    const result = await res.json();

    if (res.ok) {
      showToast(result.message || `${actionName} tài khoản thành công!`, newStatus ? "success" : "warning");

      // Cập nhật state nội bộ
      if (result.data) {
        selectedCustomer = result.data;
        const item = customers.find(c => c.maTk === maTk);
        if (item) {
          item.hoatDong = result.data.hoatDong;
        }
      }

      updateKPIs();
      renderAccountTable();
      renderRightPanel();
    } else {
      alert(`[Lỗi từ máy chủ - HTTP ${res.status}]:\n\n${result.message || "Không thể cập nhật trạng thái tài khoản."}`);
    }
  } catch (err) {
    alert("Lỗi kết nối khi cập nhật trạng thái: " + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// =============================================================================
// 7. TIỆN ÍCH HỖ TRỢ
// =============================================================================
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
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

function showToast(message, type = "success") {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;

  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "warning") icon = "⚠️";
  if (type === "danger") icon = "❌";

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
