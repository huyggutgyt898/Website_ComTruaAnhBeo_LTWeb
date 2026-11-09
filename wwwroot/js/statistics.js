/**
 * Cơm Trưa Anh Béo - Statistics & Reports Module (Thống kê & Báo cáo)
 * File: wwwroot/js/statistics.js
 * Kết nối backend: /admin/api/reports/* (xem Controllers/ReportsController.cs)
 */

// =============================================================================
// 1. STATE & CONFIGURATION
// =============================================================================
const REPORTS_API = '/admin/api/reports';

const StatsState = {
    currentTab: 'revenue',         // 'revenue' | 'top-dishes' | 'reviews' | 'lalamove'
    chartPeriod: 'day',            // 'day' | 'month'
    topDishLimit: 5,               // 5 | 10
    reviewStarFilter: 'ALL',       // 'ALL' | '5' | '4' | '3' | '2' | '1'
    selectedReviewId: null,
    fromDate: null,
    toDate: null,
    excludeCanceled: true,
    separatePaymentStatus: true,
    reviewItems: []
};

// =============================================================================
// 2. INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initDefaultDates();
    initNotificationControls();
    initSoundToggle();

    // Hiện khung trống trước, sau đó tải dữ liệu thật từ máy chủ
    renderRevenueView(null);
    renderTopDishesView(null);
    renderReviewsView(null);
    renderLalamoveView(null);

    readFilterInputs();
    loadAllReports();
});

// =============================================================================
// 3. API HELPERS
// =============================================================================
async function reportsApi(path, params) {
    const query = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') query.set(key, String(value));
    });

    const response = await fetch(`${REPORTS_API}/${path}?${query.toString()}`, {
        credentials: 'same-origin',
        cache: 'no-store'
    });

    // Hết phiên đăng nhập: server chuyển hướng về trang đăng nhập (HTML)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error('Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại.');
    }

    const result = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(result?.message || 'Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
    }
    return result;
}

function dateParams() {
    return { from: StatsState.fromDate, to: StatsState.toDate };
}

function readFilterInputs() {
    StatsState.fromDate = document.getElementById('filterFromDate')?.value || null;
    StatsState.toDate = document.getElementById('filterToDate')?.value || null;

    const excludeCanceled = document.getElementById('chkExcludeCanceled');
    const separatePayment = document.getElementById('chkSeparatePayment');
    if (excludeCanceled) StatsState.excludeCanceled = excludeCanceled.checked;
    if (separatePayment) StatsState.separatePaymentStatus = separatePayment.checked;
}

function reportErrorMessage(error) {
    return error instanceof Error ? error.message : 'Không thể tải dữ liệu báo cáo.';
}

async function loadRevenue() {
    try {
        const data = await reportsApi('revenue', {
            ...dateParams(),
            period: StatsState.chartPeriod,
            excludeCanceled: StatsState.excludeCanceled,
            separatePayment: StatsState.separatePaymentStatus
        });
        renderRevenueView(data);
    } catch (error) {
        showToast(reportErrorMessage(error), 'danger');
    }
}

async function loadTopDishes() {
    try {
        const data = await reportsApi('top-dishes', { ...dateParams(), limit: StatsState.topDishLimit });
        renderTopDishesView(data);
    } catch (error) {
        showToast(reportErrorMessage(error), 'danger');
    }
}

async function loadReviews() {
    try {
        const data = await reportsApi('reviews', { ...dateParams(), stars: StatsState.reviewStarFilter });
        renderReviewsView(data);
    } catch (error) {
        showToast(reportErrorMessage(error), 'danger');
    }
}

async function loadLalamove() {
    try {
        const data = await reportsApi('lalamove', dateParams());
        renderLalamoveView(data);
    } catch (error) {
        showToast(reportErrorMessage(error), 'danger');
    }
}

function loadAllReports() {
    return Promise.all([loadRevenue(), loadTopDishes(), loadReviews(), loadLalamove()]);
}

// =============================================================================
// 4. TAB NAVIGATION (4 MAIN MODULE TABS)
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
// 5. TAB 1: REVENUE STATISTICS
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

    loadRevenue();
}

function renderRevenueView(data) {
    const kpi = data?.kpi;
    setText('kpiTotalRevenue', formatVND(kpi?.totalRevenue || 0));
    setText('kpiCompletedOrders', String(kpi?.completedOrders || 0));
    setText('kpiAOV', formatVND(kpi?.aov || 0));

    const rows = data?.rows || [];
    const tableBody = document.getElementById('revenueTableBody');
    if (tableBody) {
        if (rows.length === 0) {
            tableBody.innerHTML = emptyRow(5, '📊', 'Chưa có dữ liệu thống kê doanh thu',
                'Dữ liệu doanh thu sẽ hiển thị tự động khi có đơn hàng được hoàn tất.');
        } else {
            const separate = StatsState.separatePaymentStatus;
            tableBody.innerHTML = rows.map(r => `
        <tr>
          <td><strong>${escapeHtml(r.label)}</strong></td>
          <td>${r.orders}</td>
          <td>${separate ? `${r.paidOrders} đơn · ${formatVND(r.paidAmount)}` : '—'}</td>
          <td>${separate ? `${r.pendingOrders} đơn · ${formatVND(r.pendingAmount)}` : '—'}</td>
          <td style="text-align: right; font-weight: 800; color: var(--brand-burgundy);">${formatVND(r.revenue)}</td>
        </tr>
      `).join('');
        }
    }

    renderRevenueChart(rows, data?.period || StatsState.chartPeriod);
}

function renderRevenueChart(rows, period) {
    const chartContainer = document.getElementById('revenueChartCanvas');
    if (!chartContainer) return;

    if (!rows || rows.length === 0) {
        chartContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
        <div style="font-size: 13.5px; font-weight: 700; color: var(--text-secondary); margin-bottom: 4px;">
          Biểu đồ doanh thu ${period === 'month' ? 'theo tháng' : 'theo ngày'}
        </div>
        <div style="font-size: 12px;">Chưa có dữ liệu trong khoảng thời gian đã chọn</div>
      </div>
    `;
        return;
    }

    const width = 800, height = 280;
    const pad = { top: 20, right: 16, bottom: 36, left: 64 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const maxValue = Math.max(...rows.map(r => r.revenue), 1);
    const niceMax = niceCeil(maxValue);
    const slot = plotW / rows.length;
    const barW = Math.max(4, Math.min(44, slot * 0.62));
    const labelEvery = Math.ceil(rows.length / 12);

    let grid = '';
    for (let i = 0; i <= 4; i++) {
        const value = (niceMax / 4) * i;
        const y = pad.top + plotH - (value / niceMax) * plotH;
        grid += `
      <line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="var(--border-light)" stroke-width="1"/>
      <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="var(--text-muted)">${formatCompactVND(value)}</text>
    `;
    }

    let bars = '';
    rows.forEach((r, i) => {
        const h = (r.revenue / niceMax) * plotH;
        const x = pad.left + slot * i + (slot - barW) / 2;
        const y = pad.top + plotH - h;
        bars += `
      <rect x="${x}" y="${y}" width="${barW}" height="${Math.max(h, r.revenue > 0 ? 1 : 0)}" rx="3" fill="var(--brand-burgundy)">
        <title>${escapeHtml(r.label)}: ${formatVND(r.revenue)} (${r.orders} đơn)</title>
      </rect>
    `;
        if (i % labelEvery === 0) {
            bars += `<text x="${x + barW / 2}" y="${height - 14}" text-anchor="middle" font-size="11" fill="var(--text-secondary)">${escapeHtml(shortLabel(r.label, period))}</text>`;
        }
    });

    chartContainer.innerHTML = `
    <svg class="chart-grid-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img"
         aria-label="Biểu đồ doanh thu ${period === 'month' ? 'theo tháng' : 'theo ngày'}">
      ${grid}${bars}
    </svg>
  `;
}

// =============================================================================
// 6. TAB 2: BEST SELLING FOOD RANKINGS
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

    loadTopDishes();
}

function renderTopDishesView(data) {
    const tableBody = document.getElementById('topDishesTableBody');
    if (!tableBody) return;

    const items = data?.items || [];
    if (items.length === 0) {
        tableBody.innerHTML = emptyRow(6, '🍚', 'Chưa có dữ liệu món bán chạy',
            'Bảng xếp hạng sẽ tự động tính toán dựa trên các món ăn từ các đơn hàng hoàn tất.');
        return;
    }

    tableBody.innerHTML = items.map(d => `
    <tr>
      <td style="text-align: center; font-weight: 800; color: var(--brand-burgundy);">${d.rank}</td>
      <td>
        <div class="dish-cell-meta">
          <strong>${escapeHtml(d.name)}</strong>
        </div>
      </td>
      <td>${escapeHtml(d.category || '—')}</td>
      <td style="text-align: center; font-weight: 700;">${d.quantity}</td>
      <td style="text-align: right; font-weight: 700;">${formatVND(d.revenue)}</td>
      <td>
        <span style="font-size: 12px; font-weight: 700;">${d.sharePercent}%</span>
        <div class="share-bar-container"><div class="share-bar-fill" style="width: ${Math.min(100, d.sharePercent)}%;"></div></div>
      </td>
    </tr>
  `).join('');
}

// =============================================================================
// 7. TAB 3: CUSTOMER REVIEWS
// =============================================================================
function filterReviewsByStar(stars) {
    StatsState.reviewStarFilter = stars;

    document.querySelectorAll('.star-filter-chip').forEach(chip => {
        chip.classList.remove('active');
    });

    const activeChip = document.getElementById(`starChip-${stars}`);
    if (activeChip) activeChip.classList.add('active');

    loadReviews();
}

function renderReviewsView(data) {
    const summary = data?.summary;
    const average = summary?.average || 0;
    setText('avgReviewScore', average.toFixed(1));
    setText('totalReviewCount', `Dựa trên ${summary?.total || 0} lượt đánh giá`);

    const starsRow = document.querySelector('#pane-reviews .stars-row');
    if (starsRow) starsRow.textContent = starString(Math.round(average));

    const items = data?.items || [];
    StatsState.reviewItems = items;
    StatsState.selectedReviewId = null;

    const tableBody = document.getElementById('reviewsTableBody');
    if (!tableBody) return;

    if (items.length === 0) {
        tableBody.innerHTML = emptyRow(5, '⭐', 'Chưa có đánh giá nào từ khách hàng',
            'Các đánh giá 1-5 sao và phản hồi từ website bán cơm sẽ hiển thị chi tiết tại đây.');
    } else {
        tableBody.innerHTML = items.map(r => `
      <tr class="review-item-row" id="review-row-${r.id}" onclick="selectReview(${r.id})">
        <td><strong>${escapeHtml(r.customer)}</strong></td>
        <td style="color: #FFC400; font-weight: 800; white-space: nowrap;">${starString(r.stars)}</td>
        <td style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(r.content || '(Không có nhận xét)')}</td>
        <td style="white-space: nowrap;">${escapeHtml(r.date)}</td>
        <td style="text-align: center;">${sentimentBadge(r.sentiment)}</td>
      </tr>
    `).join('');
    }

    resetReviewDetail();
}

function sentimentBadge(sentiment) {
    const colors = {
        'Tích cực': { bg: '#E8F5E9', fg: '#2E7D32' },
        'Trung lập': { bg: '#FFF8E1', fg: '#B26A00' },
        'Cần chú ý': { bg: '#FFEBEE', fg: '#C62828' }
    };
    const c = colors[sentiment] || colors['Trung lập'];
    return `<span style="display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; background: ${c.bg}; color: ${c.fg};">${escapeHtml(sentiment)}</span>`;
}

function resetReviewDetail() {
    const container = document.getElementById('reviewDetailContent');
    if (!container) return;
    container.innerHTML = `
    <div style="font-size: 12.5px; color: var(--text-secondary); text-align: center; padding: 20px 10px; background: #FFFDF9; border-radius: var(--radius-sm); border: 1px dashed var(--border-light);">
      Chọn một đánh giá từ bảng bên trái để xem đầy đủ nội dung.
    </div>
  `;
}

function selectReview(reviewId) {
    const review = StatsState.reviewItems.find(r => r.id === reviewId);
    if (!review) return;

    StatsState.selectedReviewId = reviewId;

    // Highlight row
    document.querySelectorAll('.review-item-row').forEach(row => row.classList.remove('selected'));
    const targetRow = document.getElementById(`review-row-${reviewId}`);
    if (targetRow) targetRow.classList.add('selected');

    // Update Right Action Panel review preview
    const reviewDetailContainer = document.getElementById('reviewDetailContent');
    if (reviewDetailContainer) {
        reviewDetailContainer.innerHTML = `
      <div class="review-detail-card">
        <div class="review-detail-header">
          <div>
            <div class="review-detail-cust-name">${escapeHtml(review.customer)}</div>
            <span class="review-detail-dish">${escapeHtml(review.sentiment)}</span>
          </div>
          <span style="color: #FFC400; font-size: 16px; font-weight: 800;">${starString(review.stars)}</span>
        </div>
        <div class="review-detail-quote">
          ${review.content ? `"${escapeHtml(review.content)}"` : '(Khách không để lại nhận xét)'}
        </div>
        <div style="font-size: 11.5px; color: var(--text-muted);">
          Đánh giá ngày: <strong>${escapeHtml(review.date)}</strong>
        </div>
      </div>
    `;
    }
}

function starString(count) {
    let html = '';
    for (let i = 1; i <= 5; i++) html += (i <= count) ? '★' : '☆';
    return html;
}

// =============================================================================
// 8. TAB 4: LALAMOVE DELIVERY COSTS
// =============================================================================
function renderLalamoveView(data) {
    const kpi = data?.kpi;
    setText('kpiCustomerShip', formatVND(kpi?.customerPaid || 0));
    setText('kpiActualLalamove', formatVND(kpi?.actualFee || 0));
    setText('kpiStoreSubsidy', formatVND(kpi?.storeSubsidy || 0));
    // Hệ thống chưa lưu riêng phụ phí (mưa, cao điểm) nên chưa có số liệu
    setText('kpiExtraFees', kpi && kpi.extraFees != null ? formatVND(kpi.extraFees) : '—');

    const tableBody = document.getElementById('lalamoveTableBody');
    if (!tableBody) return;

    const items = data?.items || [];
    if (items.length === 0) {
        tableBody.innerHTML = emptyRow(8, '🚚', 'Chưa có dữ liệu vận chuyển Lalamove',
            'Thông tin cước phí giao cơm, tiền ship khách trả và tiền trợ giá của quán sẽ đối soát tại đây.');
        return;
    }

    tableBody.innerHTML = items.map(i => `
    <tr>
      <td><strong>${escapeHtml(i.orderCode)}</strong></td>
      <td>${escapeHtml(i.date)}</td>
      <td>${escapeHtml(i.driver || '—')}</td>
      <td style="text-align: right;">${formatVND(i.customerPaid)}</td>
      <td style="text-align: right;">${formatVND(i.actualFee)}</td>
      <td style="text-align: right;">${i.subsidy > 0 ? formatVND(i.subsidy) : '—'}</td>
      <td style="text-align: right;">—</td>
      <td style="text-align: right; font-weight: 800; color: ${i.difference < 0 ? '#C62828' : '#2E7D32'};">${formatSignedVND(i.difference)}</td>
    </tr>
  `).join('');
}

// =============================================================================
// 9. RIGHT PANEL: DATE FILTERS & REPORT ACTIONS
// =============================================================================
function toInputDate(d) {
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
}

function initDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const fromInput = document.getElementById('filterFromDate');
    const toInput = document.getElementById('filterToDate');

    if (fromInput) fromInput.value = toInputDate(firstDay);
    if (toInput) toInput.value = toInputDate(today);
}

function setQuickDate(preset) {
    document.querySelectorAll('.btn-quick-date').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`quickDate-${preset}`);
    if (activeBtn) activeBtn.classList.add('active');

    const today = new Date();
    let fromDate = new Date();
    let toDate = new Date();

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

    if (fromInput) fromInput.value = toInputDate(fromDate);
    if (toInput) toInput.value = toInputDate(toDate);
}

async function applyReportFilters() {
    readFilterInputs();

    if (StatsState.fromDate && StatsState.toDate && StatsState.fromDate > StatsState.toDate) {
        showToast('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', 'warning');
        return;
    }

    await loadAllReports();
    showToast(`Đã áp dụng bộ lọc: ${formatInputDate(StatsState.fromDate) || 'Đầu kỳ'} đến ${formatInputDate(StatsState.toDate) || 'Hiện tại'}`, 'success');
}

function exportReportExcel() {
    readFilterInputs();

    const query = new URLSearchParams({
        tab: StatsState.currentTab,
        period: StatsState.chartPeriod,
        limit: String(StatsState.topDishLimit),
        stars: StatsState.reviewStarFilter,
        excludeCanceled: String(StatsState.excludeCanceled),
        separatePayment: String(StatsState.separatePaymentStatus)
    });
    if (StatsState.fromDate) query.set('from', StatsState.fromDate);
    if (StatsState.toDate) query.set('to', StatsState.toDate);

    // Tải file CSV (mở được bằng Excel) từ máy chủ
    window.location.href = `${REPORTS_API}/export?${query.toString()}`;
    showToast('Đang tải báo cáo (CSV) về máy...', 'info');
}

function printReport() {
    window.print();
}

// =============================================================================
// 10. FORMAT & UI HELPERS
// =============================================================================
function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function emptyRow(colspan, icon, title, desc) {
    return `
    <tr>
      <td colspan="${colspan}" class="table-empty-row">
        <div class="empty-state-box">
          <div class="empty-icon">${icon}</div>
          <p class="empty-title">${escapeHtml(title)}</p>
          <p class="empty-desc">${escapeHtml(desc)}</p>
        </div>
      </td>
    </tr>
  `;
}

function formatVND(num) {
    const value = Number(num);
    if (isNaN(value)) return '0đ';
    return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
}

function formatSignedVND(num) {
    const value = Number(num) || 0;
    if (value === 0) return '0đ';
    return (value > 0 ? '+' : '−') + formatVND(Math.abs(value));
}

function formatCompactVND(num) {
    if (num >= 1000000) return `${+(num / 1000000).toFixed(1)}tr`;
    if (num >= 1000) return `${Math.round(num / 1000)}k`;
    return String(Math.round(num));
}

function formatInputDate(value) {
    if (!value) return '';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
}

// Làm tròn lên mốc "đẹp" cho trục tung (1, 2, 2.5, 5, 10 x 10^n)
function niceCeil(value) {
    const exponent = Math.pow(10, Math.floor(Math.log10(value)));
    const fraction = value / exponent;
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
    return nice * exponent;
}

function shortLabel(label, period) {
    // 'dd/MM/yyyy' -> 'dd/MM' cho biểu đồ theo ngày; 'MM/yyyy' giữ nguyên
    return period === 'month' ? label : String(label).slice(0, 5);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// =============================================================================
// 11. TOAST NOTIFICATIONS & SOUND ALERT CONTROLS
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
    <span class="toast-msg">${escapeHtml(message)}</span>
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