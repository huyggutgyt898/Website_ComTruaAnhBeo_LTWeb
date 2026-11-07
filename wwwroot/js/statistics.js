/**
 * Cơm Trưa Anh Béo - Statistics & Reports Module (Thống kê & Báo cáo)
 * File: wwwroot/js/statistics.js
 * Frontend UI Architecture & Backend Integration Placeholders
 * Strictly follows AGENTS.md: No fake database seeding, honest empty states.
 */

// =============================================================================
// 1. STATE & INTEGRATION CONFIGURATION
// =============================================================================
const StatsState = {
  currentTab: 'revenue',         // 'revenue' | 'top-dishes' | 'reviews' | 'lalamove'
  chartPeriod: 'day',            // 'day' | 'month'
  topDishLimit: 5,               // 5 | 10
  reviewStarFilter: 'ALL',       // 'ALL' | '5' | '4' | '3' | '2' | '1'
  selectedReviewId: null,
  fromDate: null,
  toDate: null,
  excludeCanceled: true,
  separatePaymentStatus: true
};

// =============================================================================
// 2. INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initDefaultDates();
  initNotificationControls();
  initSoundToggle();

  // Load initial view (Center starts with honest empty states as required by AGENTS.md)
  renderRevenueView();
  renderTopDishesView();
  renderReviewsView();
  renderLalamoveView();

  console.log('Statistics & Reports module initialized in Live Server / UI preview mode.');
});

// =============================================================================
// 3. TAB NAVIGATION (4 MAIN MODULE TABS)
// =============================================================================
function switchStatsTab(tabName) {
  StatsState.currentTab = tabName;

  // Update tab buttons
  document.querySelectorAll('.stats-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`tabBtn-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Update tab panes
  document.querySelectorAll('.stats-tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  const activePane = document.getElementById(`pane-${tabName}`);
  if (activePane) activePane.classList.add('active');

  // Contextual adjustment for the right-hand panel
  const reviewDetailSection = document.getElementById('reviewDetailSection');
  if (reviewDetailSection) {
    reviewDetailSection.style.display = (tabName === 'reviews') ? 'block' : 'none';
  }
}

// =============================================================================
// 4. TAB 1: REVENUE STATISTICS
// =============================================================================
function switchChartPeriod(period) {
  StatsState.chartPeriod = period;

  const btnDay = document.getElementById('btnPeriodDay');
  const btnMonth = document.getElementById('btnPeriodMonth');

  if (period === 'day') {
    if (btnDay) btnDay.classList.add('active');
    if (btnMonth) btnMonth.classList.remove('active');
  } else {
    if (btnDay) btnDay.classList.remove('active');
    if (btnMonth) btnMonth.classList.add('active');
  }

  // TODO: Connect API endpoint: GET /api/reports/revenue?period={period}&from={from}&to={to}
  renderRevenueChart(period);
}

function renderRevenueView() {
  // Empty state rendering by default
  const tableBody = document.getElementById('revenueTableBody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty-row">
          <div class="empty-state-box">
            <div class="empty-icon">📊</div>
            <p class="empty-title">Chưa có dữ liệu thống kê doanh thu</p>
            <p class="empty-desc">Dữ liệu doanh thu sẽ hiển thị tự động khi có đơn hàng được hoàn tất.</p>
          </div>
        </td>
      </tr>
    `;
  }

  renderRevenueChart(StatsState.chartPeriod);
}

function renderRevenueChart(period) {
  const chartContainer = document.getElementById('revenueChartCanvas');
  if (!chartContainer) return;

  // Render clean SVG chart coordinate frame with empty state notice
  chartContainer.innerHTML = `
    <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--border-light)" style="margin-bottom: 12px;">
        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19M7 10H9V17H7V10M11 7H13V17H11V7M15 13H17V17H15V13Z"/>
      </svg>
      <div style="font-size: 13.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
        Biểu đồ doanh thu ${period === 'day' ? 'theo ngày' : 'theo tháng'}
      </div>
      <div style="font-size: 12px;">Chưa có dữ liệu ghi nhận từ hệ thống máy chủ</div>
    </div>
  `;
}

// =============================================================================
// 5. TAB 2: BEST SELLING FOOD RANKINGS
// =============================================================================
function setTopDishLimit(limit) {
  StatsState.topDishLimit = limit;
  
  const btnTop5 = document.getElementById('btnTop5');
  const btnTop10 = document.getElementById('btnTop10');

  if (limit === 5) {
    if (btnTop5) btnTop5.classList.add('active');
    if (btnTop10) btnTop10.classList.remove('active');
  } else {
    if (btnTop5) btnTop5.classList.remove('active');
    if (btnTop10) btnTop10.classList.add('active');
  }

  // TODO: Connect API endpoint: GET /api/reports/top-dishes?limit={limit}&from={from}&to={to}
  renderTopDishesView();
}

function renderTopDishesView() {
  const tableBody = document.getElementById('topDishesTableBody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="table-empty-row">
          <div class="empty-state-box">
            <div class="empty-icon">🍚</div>
            <p class="empty-title">Chưa có dữ liệu món bán chạy</p>
            <p class="empty-desc">Bảng xếp hạng sẽ tự động tính toán dựa trên các món ăn từ các đơn hàng hoàn tất.</p>
          </div>
        </td>
      </tr>
    `;
  }
}

// =============================================================================
// 6. TAB 3: CUSTOMER REVIEWS
// =============================================================================
function filterReviewsByStar(stars) {
  StatsState.reviewStarFilter = stars;

  document.querySelectorAll('.star-filter-chip').forEach(chip => {
    chip.classList.remove('active');
  });

  const activeChip = document.getElementById(`starChip-${stars}`);
  if (activeChip) activeChip.classList.add('active');

  // TODO: Connect API endpoint: GET /api/reports/reviews?stars={stars}&from={from}&to={to}
  renderReviewsView();
}

function renderReviewsView() {
  const tableBody = document.getElementById('reviewsTableBody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty-row">
          <div class="empty-state-box">
            <div class="empty-icon">⭐</div>
            <p class="empty-title">Chưa có đánh giá nào từ khách hàng</p>
            <p class="empty-desc">Các đánh giá 1-5 sao và phản hồi từ website bán cơm sẽ hiển thị chi tiết tại đây.</p>
          </div>
        </td>
      </tr>
    `;
  }
}

function selectReview(reviewId, custName, stars, dishName, content, date) {
  StatsState.selectedReviewId = reviewId;

  // Highlight row
  document.querySelectorAll('.review-item-row').forEach(row => row.classList.remove('selected'));
  const targetRow = document.getElementById(`review-row-${reviewId}`);
  if (targetRow) targetRow.classList.add('selected');

  // Update Right Action Panel review preview
  const reviewDetailContainer = document.getElementById('reviewDetailContent');
  if (reviewDetailContainer) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += (i <= stars) ? '★' : '☆';
    }

    reviewDetailContainer.innerHTML = `
      <div class="review-detail-card">
        <div class="review-detail-header">
          <div>
            <div class="review-detail-cust-name">${custName}</div>
            <span class="review-detail-dish">Món đã đặt: <strong>${dishName}</strong></span>
          </div>
          <span style="color: #FFC400; font-size: 16px; font-weight: 800;">${starsHtml}</span>
        </div>
        <div class="review-detail-quote">
          "${content}"
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 12px;">
          Đánh giá ngày: <strong>${date}</strong>
        </div>

        <div style="margin-top: 12px; border-top: 1px solid var(--border-light); padding-top: 10px;">
          <label style="font-size: 12px; font-weight: 700; color: var(--brand-burgundy); display: block; margin-bottom: 6px;">
            Ghi chú phản hồi của quán:
          </label>
          <textarea class="form-control" style="height: 64px; font-size: 12.5px; resize: vertical;" placeholder="Nhập nội dung chăm sóc khách hàng hoặc lời cảm ơn..."></textarea>
          <button type="button" class="btn-apply-filter" style="margin-top: 8px; height: 34px; font-size: 12px;" onclick="showToast('Chức năng lưu phản hồi cần kết nối backend!', 'warning')">
            Lưu phản hồi
          </button>
        </div>
      </div>
    `;
  }
}

// =============================================================================
// 7. TAB 4: LALAMOVE DELIVERY COSTS
// =============================================================================
function renderLalamoveView() {
  const tableBody = document.getElementById('lalamoveTableBody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty-row">
          <div class="empty-state-box">
            <div class="empty-icon">🚚</div>
            <p class="empty-title">Chưa có dữ liệu vận chuyển Lalamove</p>
            <p class="empty-desc">Thông tin cước phí giao cơm, tiền ship khách trả và tiền trợ giá của quán sẽ đối soát tại đây.</p>
          </div>
        </td>
      </tr>
    `;
  }
}

// =============================================================================
// 8. RIGHT PANEL: DATE FILTERS & REPORT ACTIONS
// =============================================================================
function initDefaultDates() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const formatDate = (d) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const fromInput = document.getElementById('filterFromDate');
  const toInput = document.getElementById('filterToDate');

  if (fromInput) fromInput.value = formatDate(firstDay);
  if (toInput) toInput.value = formatDate(today);
}

function setQuickDate(preset) {
  document.querySelectorAll('.btn-quick-date').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`quickDate-${preset}`);
  if (activeBtn) activeBtn.classList.add('active');

  const today = new Date();
  let fromDate = new Date();
  let toDate = new Date();

  const formatDate = (d) => {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  };

  switch (preset) {
    case 'today':
      fromDate = today;
      toDate = today;
      break;
    case '7days':
      fromDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      toDate = today;
      break;
    case 'this_month':
      fromDate = new Date(today.getFullYear(), today.getMonth(), 1);
      toDate = today;
      break;
    case 'last_month':
      fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      toDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
  }

  const fromInput = document.getElementById('filterFromDate');
  const toInput = document.getElementById('filterToDate');

  if (fromInput) fromInput.value = formatDate(fromDate);
  if (toInput) toInput.value = formatDate(toDate);
}

function applyReportFilters() {
  const fromDate = document.getElementById('filterFromDate')?.value;
  const toDate = document.getElementById('filterToDate')?.value;
  const excludeCanceled = document.getElementById('chkExcludeCanceled')?.checked;
  const separatePayment = document.getElementById('chkSeparatePayment')?.checked;

  StatsState.fromDate = fromDate;
  StatsState.toDate = toDate;
  StatsState.excludeCanceled = excludeCanceled;
  StatsState.separatePaymentStatus = separatePayment;

  // TODO: Connect API endpoint:
  // POST /api/reports/query
  // Body: { fromDate, toDate, excludeCanceled, separatePayment, currentTab: StatsState.currentTab }

  showToast(`Đã áp dụng bộ lọc: ${fromDate || 'Đầu kỳ'} đến ${toDate || 'Hiện tại'}`, 'success');
}

function exportReportExcel() {
  // TODO: Trigger real backend download: window.location.href = `/api/reports/export?from=${StatsState.fromDate}&to=${StatsState.toDate}&tab=${StatsState.currentTab}`
  showToast('Chức năng xuất báo cáo Excel đang chờ kết nối máy chủ dữ liệu!', 'warning');
}

function printReport() {
  window.print();
}

// =============================================================================
// 9. TOAST NOTIFICATIONS & SOUND ALERT CONTROLS
// =============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast-item toast-${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'danger') icon = '❌';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function initNotificationControls() {
  const notiBtn = document.getElementById('notiBtn');
  const notiDropdown = document.getElementById('notiDropdown');

  if (notiBtn && notiDropdown) {
    notiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notiDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (!notiDropdown.contains(e.target) && e.target !== notiBtn) {
        notiDropdown.classList.remove('active');
      }
    });
  }
}

function initSoundToggle() {
  const soundBtn = document.getElementById('soundToggleBtn');
  if (!soundBtn) return;

  let soundEnabled = true;
  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.title = soundEnabled ? 'Âm thanh thông báo: ĐANG BẬT' : 'Âm thanh thông báo: ĐÃ TẮT';
    soundBtn.style.opacity = soundEnabled ? '1' : '0.5';
    showToast(soundEnabled ? 'Đã bật chuông thông báo' : 'Đã tắt chuông thông báo', 'info');
  });
}

function handleNavClick(targetKey) {
  console.log(`Navigating to: ${targetKey}`);
}
