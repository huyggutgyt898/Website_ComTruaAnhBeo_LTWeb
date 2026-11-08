/**
 * Cơm Trưa Anh Béo - Order Management Module (Quản lý đơn hàng)
 * File: wwwroot/js/orders.js
 * Frontend UI & Interaction Skeleton
 */

/* ==========================================================================
   1. STATE & CONSTANTS
   ========================================================================== */
// Status Definitions
const ORDER_STATUS = {
  PENDING: { key: "PENDING", label: "Chờ xác nhận", css: "status-pending" },
  CONFIRMED: { key: "CONFIRMED", label: "Đã xác nhận", css: "status-confirmed" },
  PREPARING: { key: "PREPARING", label: "Đang chuẩn bị", css: "status-preparing" },
  FINDING_DRIVER: { key: "FINDING_DRIVER", label: "Đang tìm tài xế", css: "status-finding_driver" },
  DRIVER_ASSIGNED: { key: "DRIVER_ASSIGNED", label: "Đã có tài xế", css: "status-driver_assigned" },
  DELIVERING: { key: "DELIVERING", label: "Đang giao hàng", css: "status-delivering" },
  COMPLETED: { key: "COMPLETED", label: "Hoàn thành", css: "status-completed" },
  CANCELED: { key: "CANCELED", label: "Đã hủy", css: "status-canceled" },
  FAILED: { key: "FAILED", label: "Giao thất bại", css: "status-failed" }
};

// Data Store (Starts EMPTY per AGENTS.md rule 4 & 24)
let orders = [];
let selectedOrderId = null;
let checkedOrderIds = new Set();
let soundEnabled = true;

// Filters State
let currentSearch = "";
let currentStatusFilter = "ALL";
let currentPaymentFilter = "ALL";
let currentStartDate = "";
let currentEndDate = "";

// Pagination State
let currentPage = 1;
const pageSize = 10;

// Audio Context for Clean System Chimes (Autoplay safe)
let audioCtx = null;

function initAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
}

function playNotificationChime() {
  if (!soundEnabled) return;
  try {
    initAudioContext();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    
    // Melodic ding-dong chime
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880.00, now + 0.12); // A5

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (e) {
    console.warn("Audio chime autoplay restricted or unavailable:", e);
  }
}

/* ==========================================================================
   2. DOM READY INITIALIZATION
   ========================================================================== */
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  renderKPIs();
  renderOrderTable();
  renderRightPanel();
});

function initEventListeners() {
  // Search input
  const searchInput = document.getElementById("searchOrderInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value.trim().toLowerCase();
      currentPage = 1;
      renderOrderTable();
    });
  }

  // Filter Status Dropdown
  const statusFilter = document.getElementById("filterOrderStatus");
  if (statusFilter) {
    statusFilter.addEventListener("change", (e) => {
      currentStatusFilter = e.target.value;
      currentPage = 1;
      syncQuickStatusPills(currentStatusFilter);
      renderOrderTable();
    });
  }

  // Filter Payment Dropdown
  const payFilter = document.getElementById("filterPaymentStatus");
  if (payFilter) {
    payFilter.addEventListener("change", (e) => {
      currentPaymentFilter = e.target.value;
      currentPage = 1;
      renderOrderTable();
    });
  }

  // Date filters
  const startDateInput = document.getElementById("filterOrderStartDate");
  const endDateInput = document.getElementById("filterOrderEndDate");
  if (startDateInput) {
    startDateInput.addEventListener("change", (e) => {
      currentStartDate = e.target.value;
      currentPage = 1;
      renderOrderTable();
    });
  }
  if (endDateInput) {
    endDateInput.addEventListener("change", (e) => {
      currentEndDate = e.target.value;
      currentPage = 1;
      renderOrderTable();
    });
  }

  // Quick Status Tabs
  document.querySelectorAll(".status-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const statusKey = btn.getAttribute("data-status");
      currentStatusFilter = statusKey;
      if (statusFilter) statusFilter.value = statusKey;
      syncQuickStatusPills(statusKey);
      currentPage = 1;
      renderOrderTable();
    });
  });

  // Master Checkbox
  const masterCheck = document.getElementById("selectAllOrders");
  if (masterCheck) {
    masterCheck.addEventListener("change", (e) => {
      const isChecked = e.target.checked;
      const filtered = getFilteredOrders();
      if (isChecked) {
        filtered.forEach(o => checkedOrderIds.add(o.id));
      } else {
        checkedOrderIds.clear();
      }
      renderOrderTable();
      updateBulkActionBar();
    });
  }

  // Header Notifications & Dropdown
  const notiBtn = document.getElementById("notiBtn");
  const notiDropdown = document.getElementById("notiDropdown");
  if (notiBtn && notiDropdown) {
    notiBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      initAudioContext();
      notiDropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
      if (!notiDropdown.contains(e.target) && e.target !== notiBtn) {
        notiDropdown.classList.remove("active");
      }
    });
  }

  // Sound Toggle Button
  const soundBtn = document.getElementById("soundToggleBtn");
  if (soundBtn) {
    soundBtn.addEventListener("click", () => {
      initAudioContext();
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        soundBtn.classList.remove("sound-muted");
        soundBtn.setAttribute("title", "Âm thanh thông báo: ĐANG BẬT");
        showToast("Đã bật âm thanh thông báo đơn mới", "info");
        playNotificationChime();
      } else {
        soundBtn.classList.add("sound-muted");
        soundBtn.setAttribute("title", "Âm thanh thông báo: ĐÃ TẮT");
        showToast("Đã tắt âm thanh thông báo", "warning");
      }
    });
  }

  // Initialize on user touch/click for audio permission
  document.addEventListener("click", () => {
    if (!audioCtx) initAudioContext();
  }, { once: true });
}

function syncQuickStatusPills(statusKey) {
  document.querySelectorAll(".status-tab-btn").forEach(btn => {
    if (btn.getAttribute("data-status") === statusKey) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function resetAllFilters() {
  currentSearch = "";
  currentStatusFilter = "ALL";
  currentPaymentFilter = "ALL";
  currentStartDate = "";
  currentEndDate = "";
  currentPage = 1;

  const searchInput = document.getElementById("searchOrderInput");
  if (searchInput) searchInput.value = "";
  const statusFilter = document.getElementById("filterOrderStatus");
  if (statusFilter) statusFilter.value = "ALL";
  const payFilter = document.getElementById("filterPaymentStatus");
  if (payFilter) payFilter.value = "ALL";
  const startDateInput = document.getElementById("filterOrderStartDate");
  if (startDateInput) startDateInput.value = "";
  const endDateInput = document.getElementById("filterOrderEndDate");
  if (endDateInput) endDateInput.value = "";

  syncQuickStatusPills("ALL");
  renderOrderTable();
  showToast("Đã đặt lại tất cả bộ lọc", "info");
}

/* ==========================================================================
   3. FILTERING & KPI LOGIC
   ========================================================================== */
function getFilteredOrders() {
  return orders.filter(order => {
    // Search text (ID, Customer name, Phone)
    if (currentSearch) {
      const matchId = order.id.toLowerCase().includes(currentSearch);
      const matchName = order.customerName.toLowerCase().includes(currentSearch);
      const matchPhone = order.customerPhone.toLowerCase().includes(currentSearch);
      if (!matchId && !matchName && !matchPhone) return false;
    }

    // Status filter
    if (currentStatusFilter !== "ALL" && order.status !== currentStatusFilter) {
      return false;
    }

    // Payment status filter
    if (currentPaymentFilter !== "ALL") {
      if (currentPaymentFilter === "PAID" && !order.isPaid) return false;
      if (currentPaymentFilter === "UNPAID" && order.isPaid) return false;
    }

    // Date filters
    if (currentStartDate) {
      const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
      if (orderDate < currentStartDate) return false;
    }
    if (currentEndDate) {
      const orderDate = new Date(order.createdAt).toISOString().slice(0, 10);
      if (orderDate > currentEndDate) return false;
    }

    return true;
  });
}

function renderKPIs() {
  const total = orders.length;
  const pending = orders.filter(o => o.status === "PENDING").length;
  const prep = orders.filter(o => o.status === "PREPARING" || o.status === "CONFIRMED").length;
  const delivering = orders.filter(o => o.status === "DELIVERING" || o.status === "DRIVER_ASSIGNED" || o.status === "FINDING_DRIVER").length;
  const completed = orders.filter(o => o.status === "COMPLETED").length;
  const canceled = orders.filter(o => o.status === "CANCELED" || o.status === "FAILED").length;

  document.getElementById("kpiTotalOrders").textContent = total;
  document.getElementById("kpiPendingOrders").textContent = pending;
  document.getElementById("kpiPrepOrders").textContent = prep;
  document.getElementById("kpiDeliveringOrders").textContent = delivering;
  document.getElementById("kpiCompletedOrders").textContent = completed;
  document.getElementById("kpiCanceledOrders").textContent = canceled;

  // Update pill counts
  const tabPending = document.getElementById("tabCountPending");
  if (tabPending) tabPending.textContent = pending;
  const tabDelivering = document.getElementById("tabCountDelivering");
  if (tabDelivering) tabDelivering.textContent = delivering;
  const tabCompleted = document.getElementById("tabCountCompleted");
  if (tabCompleted) tabCompleted.textContent = completed;
}

/* ==========================================================================
   4. RENDER ORDER TABLE
   ========================================================================== */
function renderOrderTable() {
  const tableBody = document.getElementById("orderTableBody");
  const emptyState = document.getElementById("orderEmptyState");
  const tableWrap = document.getElementById("orderTableContainer");
  const paginationWrap = document.getElementById("orderPaginationBar");

  if (!tableBody) return;

  const filtered = getFilteredOrders();

  // If no orders match or list is empty
  if (filtered.length === 0) {
    tableBody.innerHTML = "";
    if (emptyState) emptyState.style.display = "flex";
    if (paginationWrap) paginationWrap.style.display = "none";
    updateBulkActionBar();
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (paginationWrap) paginationWrap.style.display = "flex";

  // Pagination slice
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filtered.length);
  const pagedOrders = filtered.slice(startIndex, endIndex);

  // Render Table Rows
  tableBody.innerHTML = pagedOrders.map(order => {
    const isChecked = checkedOrderIds.has(order.id);
    const isSelected = selectedOrderId === order.id;
    const statusDef = ORDER_STATUS[order.status] || { label: order.status, css: "status-pending" };

    // Format item summary
    const itemSummary = order.items.map(it => `${it.qty}x ${it.name}`).join(", ");

    // Format date: HH:mm - dd/MM/yyyy
    const d = new Date(order.createdAt);
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} - ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    return `
      <tr class="${isSelected ? 'selected-row' : ''}" onclick="selectOrder('${order.id}', event)">
        <td class="col-check" onclick="event.stopPropagation()">
          <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="toggleOrderCheck('${order.id}', this.checked)">
        </td>
        <td class="col-order-id">
          <span class="order-id-code">#${order.id}</span>
        </td>
        <td>
          <div class="customer-cell">
            <span class="customer-name">${escapeHtml(order.customerName)}</span>
            <span class="customer-phone">${escapeHtml(order.customerPhone)}</span>
          </div>
        </td>
        <td>
          <div class="items-snippet" title="${escapeHtml(itemSummary)}">
            ${escapeHtml(itemSummary)}
          </div>
        </td>
        <td>
          <span class="amount-text">${formatVND(order.grandTotal)}</span>
        </td>
        <td>
          <div class="payment-badge-wrap">
            <span class="pay-method-badge">${escapeHtml(order.paymentMethod)}</span>
            <span class="pay-status-badge ${order.isPaid ? 'pay-paid' : 'pay-unpaid'}">
              ${order.isPaid ? '✓ Đã thanh toán' : '⏳ Chưa thanh toán'}
            </span>
          </div>
        </td>
        <td>
          <span class="status-pill ${statusDef.css}">
            <span class="status-dot"></span>
            <span>${statusDef.label}</span>
          </span>
        </td>
        <td style="font-size: 11.5px; color: var(--text-secondary); white-space: nowrap;">
          ${timeStr}
        </td>
        <td style="text-align: right;" onclick="event.stopPropagation()">
          <button class="bulk-action-btn bulk-btn-print" onclick="selectOrder('${order.id}'); openPrintTicketModal();" title="In phiếu bếp">
            🖨️
          </button>
        </td>
      </tr>
    `;
  }).join("");

  // Update pagination info text
  document.getElementById("paginationInfoText").textContent = `Hiển thị ${filtered.length > 0 ? startIndex + 1 : 0} - ${endIndex} trên ${filtered.length} đơn hàng`;
  renderPaginationButtons(totalPages);
  updateBulkActionBar();
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
  renderOrderTable();
}

/* ==========================================================================
   5. SELECTION & BULK ACTIONS
   ========================================================================== */
function selectOrder(orderId, event) {
  selectedOrderId = orderId;
  document.querySelectorAll("#orderTableBody tr").forEach(tr => tr.classList.remove("selected-row"));
  renderOrderTable();
  renderRightPanel();
}

function toggleOrderCheck(orderId, isChecked) {
  if (isChecked) {
    checkedOrderIds.add(orderId);
  } else {
    checkedOrderIds.delete(orderId);
  }
  updateBulkActionBar();
}

function updateBulkActionBar() {
  const banner = document.getElementById("bulkActionsBanner");
  const countBadge = document.getElementById("bulkCountNumber");
  if (!banner || !countBadge) return;

  const count = checkedOrderIds.size;
  countBadge.textContent = count;

  if (count > 0) {
    banner.classList.add("active");
  } else {
    banner.classList.remove("active");
  }
}

function executeBulkAction(actionType) {
  const count = checkedOrderIds.size;
  if (count === 0) {
    showToast("Vui lòng chọn ít nhất 1 đơn hàng để thao tác hàng loạt", "warning");
    return;
  }

  if (actionType === "CONFIRM") {
    // UI Skeleton interaction
    showToast(`Đã gửi yêu cầu xác nhận hàng loạt cho ${count} đơn hàng (Chờ API kết nối)`, "info");
    // TODO: Call Backend Bulk Confirm API endpoint
  } else if (actionType === "PRINT") {
    showToast(`Đã gửi lệnh in phiếu bếp cho ${count} đơn hàng`, "info");
    // TODO: Call Backend Bulk Print API
  } else if (actionType === "CANCEL") {
    if (confirm(`Bạn có chắc chắn muốn hủy hàng loạt ${count} đơn hàng đã chọn?`)) {
      showToast(`Đã ghi nhận yêu cầu hủy hàng loạt cho ${count} đơn hàng`, "warning");
      // TODO: Call Backend Bulk Cancel API
    }
  }
}

/* ==========================================================================
   6. RIGHT DETAIL & ACTION PANEL
   ========================================================================== */
function renderRightPanel() {
  const emptyPlaceholder = document.getElementById("panelEmptyPlaceholder");
  const detailContent = document.getElementById("panelDetailContent");

  if (!selectedOrderId) {
    if (emptyPlaceholder) emptyPlaceholder.style.display = "flex";
    if (detailContent) detailContent.style.display = "none";
    return;
  }

  const order = orders.find(o => o.id === selectedOrderId);
  if (!order) {
    if (emptyPlaceholder) emptyPlaceholder.style.display = "flex";
    if (detailContent) detailContent.style.display = "none";
    return;
  }

  if (emptyPlaceholder) emptyPlaceholder.style.display = "none";
  if (detailContent) detailContent.style.display = "flex";

  const statusDef = ORDER_STATUS[order.status] || { label: order.status, css: "status-pending" };

  // Set Top Badge & Order ID
  document.getElementById("panelOrderIdCode").textContent = `#${order.id}`;
  const statusBadge = document.getElementById("panelOrderStatusBadge");
  statusBadge.className = `status-pill ${statusDef.css}`;
  statusBadge.innerHTML = `<span class="status-dot"></span><span>${statusDef.label}</span>`;

  // Customer info
  document.getElementById("panelCustomerName").textContent = order.customerName;
  document.getElementById("panelCustomerPhone").textContent = order.customerPhone;
  document.getElementById("panelCustomerAddress").textContent = order.deliveryAddress;
  
  const noteBox = document.getElementById("panelCustomerNoteWrap");
  if (order.customerNote) {
    noteBox.style.display = "block";
    document.getElementById("panelCustomerNoteText").textContent = order.customerNote;
  } else {
    noteBox.style.display = "none";
  }

  // Ordered Dishes
  const dishList = document.getElementById("panelOrderedDishList");
  dishList.innerHTML = order.items.map(item => `
    <div class="panel-dish-item">
      <div class="panel-dish-left">
        <span class="dish-qty-badge">${item.qty}x</span>
        <div class="dish-info-names">
          <span class="dish-name-main">${escapeHtml(item.name)} ${item.size ? `(${item.size})` : ''}</span>
          ${item.toppings && item.toppings.length > 0 ? `<span class="dish-meta-toppings">+ ${escapeHtml(item.toppings.join(", "))}</span>` : ''}
        </div>
      </div>
      <span class="dish-line-price">${formatVND(item.price * item.qty)}</span>
    </div>
  `).join("");

  // Price breakdown
  document.getElementById("panelSubtotalVal").textContent = formatVND(order.subtotal);
  document.getElementById("panelDiscountVal").textContent = order.discount > 0 ? `-${formatVND(order.discount)}` : "0đ";
  document.getElementById("panelShippingFeeVal").textContent = formatVND(order.shippingFee);
  document.getElementById("panelGrandTotalVal").textContent = formatVND(order.grandTotal);

  // Payment section
  document.getElementById("panelPayMethodName").textContent = order.paymentMethod;
  const payStatusBadge = document.getElementById("panelPayStatusBadge");
  payStatusBadge.className = `pay-status-badge ${order.isPaid ? 'pay-paid' : 'pay-unpaid'}`;
  payStatusBadge.textContent = order.isPaid ? "✓ Đã thanh toán" : "⏳ Chưa thanh toán";

  const btnConfirmPay = document.getElementById("btnConfirmPayment");
  if (order.isPaid) {
    btnConfirmPay.style.display = "none";
  } else {
    btnConfirmPay.style.display = "inline-flex";
  }

  // Lalamove Section
  renderLalamoveSection(order);

  // Timeline & History
  renderTimeline(order);
  renderHistoryLog(order);

  // Contextual Action Buttons
  renderContextualActions(order);
}

function renderLalamoveSection(order) {
  const lalaCard = document.getElementById("panelLalamoveCard");
  const driverBox = document.getElementById("panelDriverInfoBox");
  const statusText = document.getElementById("lalamoveStatusText");
  const codText = document.getElementById("lalamoveCODAmount");

  if (!lalaCard) return;

  codText.textContent = order.isPaid ? "0đ (Đã thanh toán Online)" : formatVND(order.grandTotal);

  if (order.driver) {
    driverBox.style.display = "flex";
    document.getElementById("driverNameText").textContent = order.driver.name;
    document.getElementById("driverPhoneText").textContent = order.driver.phone;
    document.getElementById("driverPlateText").textContent = order.driver.licensePlate;
    statusText.textContent = "Tài xế đang giao chuyến";
    statusText.style.color = "var(--success)";
  } else if (order.status === "FINDING_DRIVER") {
    driverBox.style.display = "none";
    statusText.textContent = "Đang phát tín hiệu tìm tài xế Lalamove gần nhất...";
    statusText.style.color = "#E65100";
  } else {
    driverBox.style.display = "none";
    statusText.textContent = "Chưa phát lệnh gọi tài xế";
    statusText.style.color = "var(--text-muted)";
  }
}

function renderTimeline(order) {
  const timelineBox = document.getElementById("panelTimelineSteps");
  if (!timelineBox) return;

  const steps = [
    { key: "PENDING", label: "Tiếp nhận đơn hàng" },
    { key: "CONFIRMED", label: "Quán đã xác nhận" },
    { key: "PREPARING", label: "Bếp đang chế biến" },
    { key: "DRIVER_ASSIGNED", label: "Tài xế nhận món" },
    { key: "DELIVERING", label: "Đang giao tận nơi" },
    { key: "COMPLETED", label: "Giao thành công" }
  ];

  // Map order status to progress index
  const statusWeights = {
    PENDING: 0,
    CONFIRMED: 1,
    PREPARING: 2,
    FINDING_DRIVER: 2.5,
    DRIVER_ASSIGNED: 3,
    DELIVERING: 4,
    COMPLETED: 5,
    CANCELED: -1,
    FAILED: -1
  };

  const currentWeight = statusWeights[order.status] ?? 0;

  if (order.status === "CANCELED" || order.status === "FAILED") {
    timelineBox.innerHTML = `
      <div class="timeline-step-item step-current">
        <div class="timeline-step-dot" style="background: var(--danger);"></div>
        <span class="step-label" style="color: var(--danger);">${order.status === 'CANCELED' ? 'Đơn hàng đã hủy' : 'Giao hàng thất bại'}</span>
        <span class="step-time">Đã dừng tiến trình đơn</span>
      </div>
    `;
    return;
  }

  timelineBox.innerHTML = steps.map((s, idx) => {
    let stepClass = "";
    if (idx < currentWeight) stepClass = "step-done";
    else if (idx === Math.floor(currentWeight)) stepClass = "step-current";

    return `
      <div class="timeline-step-item ${stepClass}">
        <div class="timeline-step-dot"></div>
        <span class="step-label">${s.label}</span>
      </div>
    `;
  }).join("");
}

function renderHistoryLog(order) {
  const logBox = document.getElementById("panelHistoryList");
  if (!logBox) return;

  const logs = order.history || [
    { time: new Date(order.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'}), text: "Đơn hàng mới được tạo từ hệ thống" }
  ];

  logBox.innerHTML = logs.map(l => `
    <div style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.4; margin-bottom: 6px;">
      <span style="font-weight: 700; color: var(--brand-burgundy);">${l.time}</span>: ${escapeHtml(l.text)}
    </div>
  `).join("");
}

function renderContextualActions(order) {
  const footer = document.getElementById("panelActionsFooter");
  if (!footer) return;

  let buttonsHtml = "";

  // Status transitions based on workflow
  if (order.status === "PENDING") {
    buttonsHtml += `
      <button class="btn-order-action btn-primary-burgundy" onclick="transitionOrderStatus('CONFIRMED')">
        ✓ Xác nhận đơn hàng
      </button>
      <button class="btn-order-action btn-secondary-action" onclick="openPrintTicketModal()">
        🖨️ In phiếu bếp
      </button>
      <button class="btn-order-action btn-danger-outline" onclick="openCancelOrderModal()">
        ✕ Hủy đơn hàng
      </button>
    `;
  } else if (order.status === "CONFIRMED") {
    buttonsHtml += `
      <button class="btn-order-action btn-primary-burgundy" onclick="transitionOrderStatus('PREPARING')">
        🍳 Bắt đầu chế biến
      </button>
      <button class="btn-order-action btn-secondary-action" onclick="transitionOrderStatus('FINDING_DRIVER')">
        🛵 Tìm tài xế Lalamove
      </button>
      <button class="btn-order-action btn-secondary-action" onclick="openPrintTicketModal()">
        🖨️ In phiếu bếp
      </button>
      <button class="btn-order-action btn-danger-outline" onclick="openCancelOrderModal()">
        ✕ Hủy đơn hàng
      </button>
    `;
  } else if (order.status === "PREPARING") {
    buttonsHtml += `
      <button class="btn-order-action btn-primary-burgundy" onclick="transitionOrderStatus('FINDING_DRIVER')">
        🛵 Bếp xong - Gọi tài xế
      </button>
      <button class="btn-order-action btn-secondary-action" onclick="openPrintTicketModal()">
        🖨️ In lại phiếu bếp
      </button>
      <button class="btn-order-action btn-danger-outline" onclick="openCancelOrderModal()">
        ✕ Hủy đơn hàng
      </button>
    `;
  } else if (order.status === "FINDING_DRIVER") {
    buttonsHtml += `
      <button class="btn-order-action btn-secondary-action" onclick="retryDriverRequest()">
        🔄 Thử lại tìm tài xế Lalamove
      </button>
      <button class="btn-order-action btn-danger-outline" onclick="openCancelOrderModal()">
        ✕ Hủy đơn hàng
      </button>
    `;
  } else if (order.status === "DRIVER_ASSIGNED" || order.status === "DELIVERING") {
    buttonsHtml += `
      <button class="btn-order-action btn-primary-burgundy" onclick="transitionOrderStatus('COMPLETED')">
        ✓ Xác nhận hoàn thành đơn
      </button>
      <button class="btn-order-action btn-secondary-action" onclick="openPrintTicketModal()">
        🖨️ In phiếu giao hàng
      </button>
      <button class="btn-order-action btn-danger-outline" onclick="transitionOrderStatus('FAILED')">
        ⚠️ Báo giao thất bại
      </button>
    `;
  } else if (order.status === "COMPLETED") {
    buttonsHtml += `
      <div style="text-align: center; color: var(--success); font-weight: 700; font-size: 13px; padding: 6px 0;">
        ✓ Đơn hàng đã hoàn thành trọn vẹn
      </div>
      <button class="btn-order-action btn-secondary-action" onclick="openPrintTicketModal()">
        🖨️ In lại hóa đơn
      </button>
    `;
  } else if (order.status === "CANCELED" || order.status === "FAILED") {
    buttonsHtml += `
      <div style="text-align: center; color: var(--danger); font-weight: 700; font-size: 13px; padding: 6px 0;">
        ✕ Đơn hàng đã dừng xử lý (${order.status === 'CANCELED' ? 'Đã hủy' : 'Giao thất bại'})
      </div>
      <button class="btn-order-action btn-secondary-action" onclick="openPrintTicketModal()">
        🖨️ Xem lại phiếu đơn
      </button>
    `;
  }

  footer.innerHTML = buttonsHtml;
}

/* ==========================================================================
   7. STATUS TRANSITIONS & INTEGRATION HOOKS
   ========================================================================= */
function transitionOrderStatus(nextStatus) {
  if (!selectedOrderId) return;
  const order = orders.find(o => o.id === selectedOrderId);
  if (!order) return;

  const currentLabel = ORDER_STATUS[order.status]?.label || order.status;
  const nextLabel = ORDER_STATUS[nextStatus]?.label || nextStatus;

  // Frontend UI state transition
  order.status = nextStatus;

  if (!order.history) order.history = [];
  const nowStr = new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
  order.history.unshift({
    time: nowStr,
    text: `Chuyển trạng thái từ [${currentLabel}] sang [${nextLabel}]`
  });

  renderKPIs();
  renderOrderTable();
  renderRightPanel();

  showToast(`Đã cập nhật trạng thái đơn #${order.id} sang "${nextLabel}"`, "success");

  // TODO: Call Backend Status API (e.g. PUT /api/orders/{id}/status)
}

function confirmPayment() {
  if (!selectedOrderId) return;
  const order = orders.find(o => o.id === selectedOrderId);
  if (!order) return;

  order.isPaid = true;
  if (!order.history) order.history = [];
  const nowStr = new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
  order.history.unshift({
    time: nowStr,
    text: "Xác nhận đã thanh toán tiền mặt/chuyển khoản thành công"
  });

  renderOrderTable();
  renderRightPanel();
  showToast(`Đã xác nhận thanh toán đơn #${order.id}`, "success");

  // TODO: Call Backend Payment Confirmation API
}

function retryDriverRequest() {
  showToast("Đang phát lại tín hiệu điều phối tài xế Lalamove (Mô phỏng UI)", "info");
  // TODO: Call Lalamove API dispatch
}

/* ==========================================================================
   8. MODALS (CANCEL ORDER & KITCHEN TICKET PRINT)
   ========================================================================== */
function openCancelOrderModal() {
  if (!selectedOrderId) return;
  const modal = document.getElementById("cancelOrderModal");
  if (!modal) return;

  document.getElementById("cancelOrderIdTarget").textContent = `#${selectedOrderId}`;
  document.getElementById("cancelReasonSelect").value = "";
  document.getElementById("cancelReasonDetails").value = "";

  modal.classList.add("active");
}

function closeCancelOrderModal() {
  const modal = document.getElementById("cancelOrderModal");
  if (modal) modal.classList.remove("active");
}

function submitCancelOrder() {
  const reasonSelect = document.getElementById("cancelReasonSelect");
  const reasonDetails = document.getElementById("cancelReasonDetails");

  if (!reasonSelect.value) {
    alert("Vui lòng chọn lý do hủy đơn hàng");
    reasonSelect.focus();
    return;
  }

  const reason = reasonSelect.value + (reasonDetails.value.trim() ? ` - ${reasonDetails.value.trim()}` : "");

  if (!selectedOrderId) return;
  const order = orders.find(o => o.id === selectedOrderId);
  if (order) {
    order.status = "CANCELED";
    if (!order.history) order.history = [];
    const nowStr = new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
    order.history.unshift({
      time: nowStr,
      text: `Đã hủy đơn: ${reason}`
    });
  }

  closeCancelOrderModal();
  renderKPIs();
  renderOrderTable();
  renderRightPanel();

  showToast(`Đã hủy đơn hàng #${selectedOrderId}`, "danger");

  // TODO: Call Backend Cancel API
}

// Print Kitchen Ticket Modal
function openPrintTicketModal() {
  if (!selectedOrderId) return;
  const order = orders.find(o => o.id === selectedOrderId);
  if (!order) return;

  const modal = document.getElementById("printTicketModal");
  if (!modal) return;

  document.getElementById("ticketOrderId").textContent = `#${order.id}`;
  document.getElementById("ticketCustomerName").textContent = order.customerName;
  document.getElementById("ticketCustomerPhone").textContent = order.customerPhone;
  document.getElementById("ticketCustomerAddress").textContent = order.deliveryAddress;
  document.getElementById("ticketCustomerNote").textContent = order.customerNote || "(Không có ghi chú)";

  const d = new Date(order.createdAt);
  document.getElementById("ticketPrintTime").textContent = `${d.getHours()}:${d.getMinutes()} - ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;

  const tableBody = document.getElementById("ticketItemsBody");
  tableBody.innerHTML = order.items.map(it => `
    <tr>
      <td>
        <strong>${escapeHtml(it.name)}</strong> ${it.size ? `(${it.size})` : ''}
        ${it.toppings && it.toppings.length ? `<div style="font-size: 10.5px;">+ ${it.toppings.join(", ")}</div>` : ''}
      </td>
      <td style="text-align: center;">${it.qty}</td>
      <td style="text-align: right;">${formatVND(it.price * it.qty)}</td>
    </tr>
  `).join("");

  document.getElementById("ticketTotalAmount").textContent = formatVND(order.grandTotal);
  document.getElementById("ticketPaymentStatus").textContent = order.isPaid ? "ĐÃ THANH TOÁN" : "THU TIỀN TẬN NƠI (COD)";

  modal.classList.add("active");
}

function closePrintTicketModal() {
  const modal = document.getElementById("printTicketModal");
  if (modal) modal.classList.remove("active");
}

function triggerNativePrint() {
  window.print();
}

/* ==========================================================================
   9. NOTIFICATIONS & TOAST SYSTEM
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

/* Navigation click handler */
function handleNavClick(module) {
  if (module === 'don-hang') {
    showToast("Bạn đang ở trang Quản lý đơn hàng", "info");
  } else if (module === 'mon-an') {
<<<<<<< HEAD
    window.location.href = "adminpage.html";
  } else if (module === 'khuyen-mai') {
    window.location.href = "Promotions.html";
  } else if (module === 'tai-khoan' || module === 'quan-ly-khac') {
    window.location.href = "accounts.html";
=======
    window.location.href = "/admin/products";
  } else if (module === 'khuyen-mai') {
    window.location.href = "/admin/promotions";
  } else if (module === 'tai-khoan' || module === 'quan-ly-khac') {
    window.location.href = "/admin/accounts";
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
  }
}

/* ==========================================================================
   10. OPTIONAL TESTING HELPER (LOAD DEMO DATA FOR UI VERIFICATION IN LIVE SERVER)
   ========================================================================== */
/**
 * Developer helper: Allows testing all table interactions, checkboxes,
 * right panel rendering, timeline, and modals without backend.
 */
function loadDemoOrdersForTesting() {
  orders = [
    {
      id: "DH-1025",
      customerName: "Nguyễn Văn An",
      customerPhone: "0908 123 456",
      deliveryAddress: "Tòa nhà Bitexco, 2 Hải Triều, P. Bến Nghé, Quận 1, TP.HCM",
      customerNote: "Ít cơm, nhiều mỡ hành, nước mắm để riêng giùm em.",
      status: "PENDING",
      paymentMethod: "Chuyển khoản VietQR",
      isPaid: true,
      shippingFee: 18000,
      discount: 10000,
      subtotal: 90000,
      grandTotal: 98000,
      createdAt: new Date().toISOString(),
      items: [
        { name: "Cơm sườn bì chả", size: "Lớn", qty: 2, price: 45000, toppings: ["Trứng ốp la", "Canh chua"] }
      ],
      history: [
        { time: "11:45", text: "Khách đặt hàng qua website và thanh toán VietQR thành công" }
      ]
    },
    {
      id: "DH-1024",
      customerName: "Trần Thị Bích Ngọc",
      customerPhone: "0912 888 999",
      deliveryAddress: "123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM",
      customerNote: "Giao trước 12h trưa nhé quán ơi.",
      status: "PREPARING",
      paymentMethod: "Tiền mặt khi nhận (COD)",
      isPaid: false,
      shippingFee: 20000,
      discount: 0,
      subtotal: 103000,
      grandTotal: 123000,
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      items: [
        { name: "Cơm gà xối mỡ đùi góc tư", size: "Tiêu chuẩn", qty: 1, price: 48000, toppings: ["Trứng ốp la"] },
        { name: "Cơm bò lúc lắc khoai tây", size: "Tiêu chuẩn", qty: 1, price: 55000, toppings: [] }
      ],
      history: [
        { time: "11:20", text: "Đơn hàng được tiếp nhận" },
        { time: "11:22", text: "Quán xác nhận đơn & chuyển vào bếp chế biến" }
      ]
    },
    {
      id: "DH-1023",
      customerName: "Lê Hoàng Long",
      customerPhone: "0934 555 777",
      deliveryAddress: "45 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
      customerNote: "Gọi trước khi tới 5 phút.",
      status: "DELIVERING",
      paymentMethod: "Ví MoMo",
      isPaid: true,
      shippingFee: 16000,
      discount: 15000,
      subtotal: 87000,
      grandTotal: 88000,
      createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      items: [
        { name: "Cơm thịt kho tàu trứng cút", size: "Tiêu chuẩn", qty: 1, price: 38000, toppings: ["Canh rong biển"] },
        { name: "Cơm sườn non ram mặn ngọt", size: "Lớn", qty: 1, price: 49000, toppings: [] }
      ],
      driver: {
        name: "Phạm Quốc Tuấn",
        phone: "0977 334 221",
        licensePlate: "59-P1 688.22"
      },
      history: [
        { time: "10:55", text: "Khách tạo đơn hàng" },
        { time: "11:00", text: "Quán xác nhận đơn" },
        { time: "11:15", text: "Tài xế Lalamove Phạm Quốc Tuấn nhận chuyến" },
        { time: "11:30", text: "Tài xế lấy món và đang giao" }
      ]
    },
    {
      id: "DH-1022",
      customerName: "Đỗ Minh Quân",
      customerPhone: "0988 112 334",
      deliveryAddress: "72 Nguyễn Thị Minh Khai, Quận 3, TP.HCM",
      customerNote: "",
      status: "COMPLETED",
      paymentMethod: "Chuyển khoản VietQR",
      isPaid: true,
      shippingFee: 22000,
      discount: 0,
      subtotal: 55000,
      grandTotal: 77000,
      createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      items: [
        { name: "Cơm bò né trứng ốp pate", size: "Tiêu chuẩn", qty: 1, price: 55000, toppings: [] }
      ],
      driver: {
        name: "Võ Văn Hùng",
        phone: "0903 445 112",
        licensePlate: "59-B2 432.19"
      },
      history: [
        { time: "09:55", text: "Tạo đơn hàng" },
        { time: "10:10", text: "Tài xế nhận đơn" },
        { time: "10:35", text: "Khách đã nhận cơm và hoàn thành" }
      ]
    }
  ];

  selectedOrderId = orders[0].id;
  renderKPIs();
  renderOrderTable();
  renderRightPanel();
  playNotificationChime();
  showToast("Đã nạp 4 đơn hàng mẫu để kiểm thử UI Live Server", "success");
}

/* ==========================================================================
   11. UTILITIES
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
