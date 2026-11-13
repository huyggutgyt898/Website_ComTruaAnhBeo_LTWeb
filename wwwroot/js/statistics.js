/**
 * Cơm Trưa Anh Béo - Statistics & Reports Module (Thống kê & Báo cáo)
 * File: wwwroot/js/statistics.js
 * Frontend Integration with Backend ASP.NET Core API (/api/admin/statistics/*)
 */

// =============================================================================
// 1. STATE & INTEGRATION CONFIGURATION
// =============================================================================
const StatsState = {
  currentTab: 'revenue',         // 'revenue' | 'top-dishes' | 'reviews'
  chartPeriod: 'day',            // 'day' | 'month'
  topDishLimit: 5,               // 5 | 10
  reviewStarFilter: 'ALL',       // 'ALL' | '5' | '4' | '3' | '2' | '1'
  selectedReviewId: null,
  preset: 'this_month',          // 'today' | '7days' | 'this_month' | 'last_month' | null
  fromDate: null,
  toDate: null,
  excludeCanceled: true,
  separatePaymentStatus: true,
  isLoading: false
};

// =============================================================================
// 2. INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initDefaultDates();
  initSoundToggle();

  // Tải dữ liệu ban đầu từ Backend API cho tab mặc định (Doanh thu)
  loadCurrentTabData();

  console.log('Statistics & Reports module initialized and connected to Backend API.');
});

// Helper: Định dạng tiền tệ VNĐ
function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
}

// Helper: Lấy query string chung từ bộ lọc hiện tại
function getFilterQueryParams(extraParams = {}) {
  const params = new URLSearchParams();
  if (StatsState.preset) {
    params.append('preset', StatsState.preset);
  } else {
    if (StatsState.fromDate) params.append('fromDate', StatsState.fromDate);
    if (StatsState.toDate) params.append('toDate', StatsState.toDate);
  }

  for (const [key, val] of Object.entries(extraParams)) {
    if (val !== undefined && val !== null && val !== '') {
      params.append(key, val);
    }
  }

  return params.toString();
}

// Tải dữ liệu theo tab đang hiển thị
function loadCurrentTabData() {
  switch (StatsState.currentTab) {
    case 'revenue':
      loadRevenueData();
      break;
    case 'top-dishes':
      loadTopDishesData();
      break;
    case 'reviews':
      loadReviewsData();
      break;
  }
}

// =============================================================================
// 3. TAB NAVIGATION (4 MAIN MODULE TABS)
// =============================================================================
function switchStatsTab(tabName) {
  StatsState.currentTab = tabName;

  // Cập nhật tab buttons
  document.querySelectorAll('.stats-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  const activeBtn = document.getElementById(`tabBtn-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');

  // Cập nhật tab panes
  document.querySelectorAll('.stats-tab-pane').forEach(pane => {
    pane.classList.remove('active');
  });
  const activePane = document.getElementById(`pane-${tabName}`);
  if (activePane) activePane.classList.add('active');

  // Điều chỉnh khung chi tiết review bên phải
  const reviewDetailSection = document.getElementById('reviewDetailSection');
  if (reviewDetailSection) {
    reviewDetailSection.style.display = (tabName === 'reviews') ? 'block' : 'none';
  }

  // Tải dữ liệu backend cho tab vừa chọn
  loadCurrentTabData();
}

// =============================================================================
// 4. TAB 1: REVENUE STATISTICS & CHART
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

  loadRevenueData();
}

async function loadRevenueData() {
  showTableLoading('revenueTableBody', 5);

  const query = getFilterQueryParams();
  const chartQuery = getFilterQueryParams({ period: StatsState.chartPeriod });

  try {
    // 1. Gọi API KPI Tổng quan doanh thu
    const resSummary = await fetch(`/api/admin/statistics/revenue?${query}`);
    if (resSummary.ok) {
      const summary = await resSummary.json();
      const elRevenue = document.getElementById('kpiTotalRevenue');
      const elOrders = document.getElementById('kpiCompletedOrders');
      const elAOV = document.getElementById('kpiAOV');

      if (elRevenue) elRevenue.textContent = formatCurrency(summary.tongDoanhThu);
      if (elOrders) elOrders.textContent = (summary.tongSoDonHoanThanh || 0).toLocaleString('vi-VN');
      if (elAOV) elAOV.textContent = formatCurrency(summary.giaTriDonTrungBinh);
    }

    // 2. Gọi API Biểu đồ doanh thu
    const resChart = await fetch(`/api/admin/statistics/revenue-chart?${chartQuery}`);
    if (resChart.ok) {
      const chartData = await resChart.json();
      renderRevenueChart(chartData);
      renderRevenueTable(chartData.items || []);
    } else {
      renderRevenueChart(null);
      renderRevenueEmptyTable();
    }
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu doanh thu:', err);
    renderRevenueChart(null);
    renderRevenueEmptyTable();
    showToast('Không thể kết nối đến máy chủ để tải dữ liệu doanh thu.', 'warning');
  }
}

function renderRevenueTable(items) {
  const tableBody = document.getElementById('revenueTableBody');
  if (!tableBody) return;

  const validItems = (items || []).filter(i => i.soDon > 0 || i.doanhThu > 0);
  if (validItems.length === 0) {
    renderRevenueEmptyTable();
    return;
  }

  tableBody.innerHTML = validItems.map(item => `
    <tr>
      <td><strong>${escapeHtml(item.timeLabel)}</strong></td>
      <td>
        <span style="font-weight: 700; color: var(--text-primary);">${item.soDon.toLocaleString('vi-VN')} đơn</span>
      </td>
      <td style="color: #2E7D32; font-weight: 700;">${formatCurrency(item.daThuTien)}</td>
      <td style="color: #E65100; font-weight: 700;">${formatCurrency(item.choThanhToan)}</td>
      <td style="text-align: right; font-weight: 800; color: var(--brand-burgundy); font-size: 14px;">${formatCurrency(item.doanhThu)}</td>
    </tr>
  `).join('');
}

function renderRevenueEmptyTable() {
  const tableBody = document.getElementById('revenueTableBody');
  if (tableBody) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="table-empty-row">
          <div class="empty-state-box">
            <div class="empty-icon">📊</div>
            <p class="empty-title">Chưa có dữ liệu thống kê doanh thu</p>
            <p class="empty-desc">Dữ liệu doanh thu sẽ hiển thị tự động khi có đơn hàng được hoàn tất trong kỳ báo cáo.</p>
          </div>
        </td>
      </tr>
    `;
  }
}

function renderRevenueChart(chartData) {
  const chartContainer = document.getElementById('revenueChartCanvas');
  if (!chartContainer) return;

  const items = chartData?.items || [];
  const maxRevenue = Math.max(0, ...items.map(i => i.doanhThu));

  if (!chartData || items.length === 0 || maxRevenue === 0) {
    chartContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="var(--border-light)" style="margin-bottom: 12px;">
          <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19M7 10H9V17H7V10M11 7H13V17H11V7M15 13H17V17H15V13Z"/>
        </svg>
        <div style="font-size: 13.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
          Biểu đồ doanh thu ${StatsState.chartPeriod === 'day' ? 'theo ngày' : 'theo tháng'}
        </div>
        <div style="font-size: 12px;">Chưa có dữ liệu đơn hoàn tất trong khoảng thời gian này</div>
      </div>
    `;
    return;
  }

  // Vẽ SVG biểu đồ cột trực quan
  const svgWidth = 800;
  const svgHeight = 250;
  const paddingLeft = 70;
  const paddingBottom = 40;
  const paddingTop = 25;
  const paddingRight = 20;

  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  const barCount = items.length;
  const barWidth = Math.max(8, Math.min(36, (plotWidth / barCount) * 0.65));
  const step = plotWidth / barCount;

  // Lưới giá trị trục Y (4 mốc)
  const yTicks = [0, maxRevenue * 0.33, maxRevenue * 0.66, maxRevenue];
  const gridLines = yTicks.map(val => {
    const y = paddingTop + plotHeight - (val / maxRevenue) * plotHeight;
    const label = val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : (val >= 1000 ? (val / 1000).toFixed(0) + 'k' : '0');
    return `
      <line x1="${paddingLeft}" y1="${y}" x2="${svgWidth - paddingRight}" y2="${y}" stroke="#EFE4D4" stroke-width="1" stroke-dasharray="3,3" />
      <text x="${paddingLeft - 8}" y="${y + 4}" font-size="11" font-weight="600" fill="#8C7A6B" text-anchor="end">${label}đ</text>
    `;
  }).join('');

  // Cột doanh thu
  const bars = items.map((item, idx) => {
    const x = paddingLeft + (idx * step) + (step - barWidth) / 2;
    const h = (item.doanhThu / maxRevenue) * plotHeight;
    const y = paddingTop + plotHeight - h;

    // Nhãn trục X: hiển thị cách quãng nếu có quá nhiều ngày
    const showLabel = barCount <= 12 || idx % Math.ceil(barCount / 10) === 0 || idx === barCount - 1;
    const xLabel = showLabel ? `
      <text x="${x + barWidth / 2}" y="${svgHeight - 12}" font-size="10.5" font-weight="600" fill="#8C7A6B" text-anchor="middle">
        ${StatsState.chartPeriod === 'day' ? item.timeLabel.split('/')[0] + '/' + item.timeLabel.split('/')[1] : item.timeLabel.replace('Tháng ', 'T')}
      </text>
    ` : '';

    return `
      <g class="chart-bar-group" tabindex="0">
        <rect x="${x}" y="${y}" width="${barWidth}" height="${Math.max(2, h)}" rx="3" fill="var(--brand-burgundy)" opacity="0.88">
          <title>${item.timeLabel}: ${formatCurrency(item.doanhThu)} (${item.soDon} đơn)</title>
        </rect>
        ${xLabel}
      </g>
    `;
  }).join('');

  chartContainer.innerHTML = `
    <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="chart-grid-svg" style="width: 100%; height: 100%;">
      ${gridLines}
      ${bars}
    </svg>
  `;
}

// =============================================================================
// 5. TAB 2: BEST SELLING FOOD RANKINGS (TOP DISHES)
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

  loadTopDishesData();
}

async function loadTopDishesData() {
  showTableLoading('topDishesTableBody', 6);

  const query = getFilterQueryParams({ top: StatsState.topDishLimit });

  try {
    const res = await fetch(`/api/admin/statistics/top-products?${query}`);
    if (res.ok) {
      const data = await res.json();
      renderTopDishesTable(data.items || []);
    } else {
      renderTopDishesEmptyTable();
    }
  } catch (err) {
    console.error('Lỗi khi tải danh sách món bán chạy:', err);
    renderTopDishesEmptyTable();
    showToast('Không thể kết nối đến máy chủ để tải bảng xếp hạng món.', 'warning');
  }
}

function renderTopDishesTable(items) {
  const tableBody = document.getElementById('topDishesTableBody');
  if (!tableBody) return;

  if (!items || items.length === 0) {
    renderTopDishesEmptyTable();
    return;
  }

  tableBody.innerHTML = items.map(item => {
    const rankClass = item.hang === 1 ? 'rank-1' : (item.hang === 2 ? 'rank-2' : (item.hang === 3 ? 'rank-3' : 'rank-other'));

    return `
      <tr>
        <td style="text-align: center;">
          <span class="rank-badge ${rankClass}">${item.hang}</span>
        </td>
        <td>
          <div class="dish-cell-meta">
            <strong>${escapeHtml(item.tenMon)}</strong>
            <span>Mã món: #${item.maMon}</span>
          </div>
        </td>
        <td>
          <span style="font-size: 13px; color: var(--text-secondary); font-weight: 600;">${escapeHtml(item.danhMuc || 'Món chính')}</span>
        </td>
        <td style="text-align: center; font-weight: 800; color: var(--brand-burgundy); font-size: 14.5px;">
          ${item.soLuongBan.toLocaleString('vi-VN')}
        </td>
        <td style="text-align: right; font-weight: 700; color: #2E7D32; font-size: 13.5px;">
          ${formatCurrency(item.doanhThuMon)}
        </td>
        <td>
          <div style="font-size: 12.5px; font-weight: 700; color: var(--brand-burgundy); margin-bottom: 2px;">
            ${item.tyTrong.toFixed(1)}%
          </div>
          <div class="share-bar-container">
            <div class="share-bar-fill" style="width: ${Math.min(100, Math.max(2, item.tyTrong))}%;"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderTopDishesEmptyTable() {
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

  loadReviewsData();
}

async function loadReviewsData() {
  showTableLoading('reviewsTableBody', 5);

  const summaryQuery = getFilterQueryParams();
  const listQuery = getFilterQueryParams({
    soSao: StatsState.reviewStarFilter === 'ALL' ? null : StatsState.reviewStarFilter,
    page: 1,
    pageSize: 50
  });

  try {
    // 1. Thống kê điểm số trung bình & tổng lượt
    const resSummary = await fetch(`/api/admin/statistics/reviews?${summaryQuery}`);
    if (resSummary.ok) {
      const summary = await resSummary.json();
      const elScore = document.getElementById('avgReviewScore');
      const elTotal = document.getElementById('totalReviewCount');

      if (elScore) elScore.textContent = summary.diemTrungBinh ? summary.diemTrungBinh.toFixed(1) : '0.0';
      if (elTotal) elTotal.textContent = `Dựa trên ${(summary.tongLuotDanhGia || 0).toLocaleString('vi-VN')} lượt đánh giá`;
    }

    // 2. Danh sách nhận xét
    const resList = await fetch(`/api/admin/statistics/recent-reviews?${listQuery}`);
    if (resList.ok) {
      const paged = await resList.json();
      renderReviewsTable(paged.items || []);
    } else {
      renderReviewsEmptyTable();
    }
  } catch (err) {
    console.error('Lỗi khi tải đánh giá khách hàng:', err);
    renderReviewsEmptyTable();
    showToast('Không thể kết nối đến máy chủ để tải đánh giá.', 'warning');
  }
}

function renderReviewsTable(items) {
  const tableBody = document.getElementById('reviewsTableBody');
  if (!tableBody) return;

  if (!items || items.length === 0) {
    renderReviewsEmptyTable();
    return;
  }

  tableBody.innerHTML = items.map(item => {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += (i <= item.soSao) ? '★' : '☆';
    }

    const dateFormatted = new Date(item.ngayDg).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const escapedComment = escapeHtml(item.nhanXet || 'Khách không để lại nhận xét');
    const custName = `Khách hàng #${item.maTk}`;

    return `
      <tr class="review-item-row" id="review-row-${item.maDg}" onclick="selectReview(${item.maDg}, '${custName}', ${item.soSao}, 'Cơm trưa Anh Béo', '${escapedComment.replace(/'/g, "\\'")}', '${dateFormatted}')">
        <td>
          <strong style="color: var(--brand-burgundy);">${custName}</strong>
        </td>
        <td>
          <span style="color: #FFC400; font-size: 15px; font-weight: 800; letter-spacing: 1px;">${starsHtml}</span>
        </td>
        <td>
          <div style="font-size: 13px; color: var(--text-primary); line-height: 1.4; max-width: 450px;">
            "${escapedComment}"
          </div>
        </td>
        <td style="font-size: 12.5px; color: var(--text-muted);">${dateFormatted}</td>
        <td style="text-align: center;">
          <span style="font-size: 11px; padding: 3px 8px; border-radius: 9999px; background: #E8F5E9; color: #2E7D32; font-weight: 700;">Hợp lệ</span>
        </td>
      </tr>
    `;
  }).join('');
}

function renderReviewsEmptyTable() {
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

  // Highlight dòng được chọn
  document.querySelectorAll('.review-item-row').forEach(row => row.classList.remove('selected'));
  const targetRow = document.getElementById(`review-row-${reviewId}`);
  if (targetRow) targetRow.classList.add('selected');

  // Hiển thị khung xem chi tiết ở cột phải
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
            <div class="review-detail-cust-name">${escapeHtml(custName)}</div>
            <span class="review-detail-dish">Món đã đặt: <strong>${escapeHtml(dishName)}</strong></span>
          </div>
          <span style="color: #FFC400; font-size: 16px; font-weight: 800;">${starsHtml}</span>
        </div>
        <div class="review-detail-quote">
          "${escapeHtml(content)}"
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 12px;">
          Đánh giá ngày: <strong>${date}</strong>
        </div>

        <div style="margin-top: 12px; border-top: 1px solid var(--border-light); padding-top: 10px;">
          <label style="font-size: 12px; font-weight: 700; color: var(--brand-burgundy); display: block; margin-bottom: 6px;">
            Ghi chú chăm sóc khách hàng:
          </label>
          <textarea class="form-control" style="height: 64px; font-size: 12.5px; resize: vertical;" placeholder="Nhập ghi chú hoặc phản hồi của quán..."></textarea>
          <button type="button" class="btn-apply-filter" style="margin-top: 8px; height: 34px; font-size: 12px;" onclick="showToast('Đã lưu ghi chú chăm sóc khách hàng!', 'success')">
            Lưu ghi chú
          </button>
        </div>
      </div>
    `;
  }
}

// =============================================================================
// 7. RIGHT PANEL: DATE FILTERS & REPORT ACTIONS
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

  StatsState.preset = 'this_month';
  StatsState.fromDate = fromInput ? fromInput.value : null;
  StatsState.toDate = toInput ? toInput.value : null;
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

  StatsState.preset = preset;
  StatsState.fromDate = fromInput?.value;
  StatsState.toDate = toInput?.value;

  // Tự động tải lại dữ liệu với preset mới
  loadCurrentTabData();
}

function applyReportFilters() {
  const fromDate = document.getElementById('filterFromDate')?.value;
  const toDate = document.getElementById('filterToDate')?.value;
  const excludeCanceled = document.getElementById('chkExcludeCanceled')?.checked;
  const separatePayment = document.getElementById('chkSeparatePayment')?.checked;

  // Khi bấm áp dụng, chuyển sang chế độ tùy chỉnh ngày
  StatsState.preset = null;
  StatsState.fromDate = fromDate;
  StatsState.toDate = toDate;
  StatsState.excludeCanceled = excludeCanceled;
  StatsState.separatePaymentStatus = separatePayment;

  // Bỏ active nút quick date nếu chọn ngày tùy chỉnh
  document.querySelectorAll('.btn-quick-date').forEach(btn => btn.classList.remove('active'));

  loadCurrentTabData();
  showToast(`Đã áp dụng bộ lọc: ${fromDate || 'Đầu kỳ'} đến ${toDate || 'Hiện tại'}`, 'success');
}

function exportReportExcel() {
  let reportType = 'revenue';
  if (StatsState.currentTab === 'top-dishes') reportType = 'top-products';
  if (StatsState.currentTab === 'reviews') reportType = 'reviews';

  const query = getFilterQueryParams({
    type: reportType,
    format: 'csv',
    period: StatsState.chartPeriod,
    top: StatsState.topDishLimit,
    soSao: StatsState.reviewStarFilter === 'ALL' ? null : StatsState.reviewStarFilter
  });

  const exportUrl = `/api/admin/statistics/export?${query}`;
  showToast('Đang tạo và tải xuống file báo cáo Excel / CSV...', 'info');

  // Kích hoạt download trực tiếp từ Backend
  window.location.href = exportUrl;
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

function showTableLoading(tbodyId, colSpan) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="${colSpan}" style="text-align: center; padding: 30px; color: var(--text-secondary);">
        <div style="display: inline-block; width: 22px; height: 22px; border: 3px solid var(--border-light); border-top-color: var(--brand-burgundy); border-radius: 50%; animation: spin 0.8s linear infinite; vertical-align: middle; margin-right: 8px;"></div>
        Đang tải dữ liệu từ máy chủ...
      </td>
    </tr>
  `;
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
