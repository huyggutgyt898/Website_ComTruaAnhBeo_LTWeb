/**
 * Cơm Trưa Anh Béo - Delivery Management Module (Quản lý giao hàng & Vận chuyển)
 * File: wwwroot/js/delivery.js
 * Đồng bộ trực tiếp với Backend VanChuyenController, VanChuyenService, LalamoveService.
 * Nguyên tắc: Backend là chuẩn chức năng, không sử dụng dữ liệu giả hoặc giả lập thành công.
 */

// =============================================================================
// 1. STATE QUẢN LÝ DỮ LIỆU
// =============================================================================
let deliveryOrders = [];
let selectedOrder = null;

// =============================================================================
// 2. KHỞI TẠO KHI TẢI TRANG
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initNotificationControls();
  initSoundToggle();
  loadDeliveryData();
});

// =============================================================================
// 3. TẢI DỮ LIỆU TỪ BACKEND
// =============================================================================
async function loadDeliveryData() {
  const refreshBtn = document.getElementById('btnRefreshDelivery');
  if (refreshBtn) refreshBtn.classList.add('loading');

  try {
    // 1. Lấy thông tin cấu hình và trạng thái API
    await loadApiInformation();

    // 2. Lấy danh sách đơn vận chuyển từ Database
    await loadDeliveryList();
  } catch (err) {
    console.error('Lỗi khi tải dữ liệu giao vận:', err);
    showToast('Lỗi khi tải dữ liệu vận chuyển từ máy chủ: ' + err.message, 'error');
  } finally {
    if (refreshBtn) refreshBtn.classList.remove('loading');
  }
}

/**
 * Gọi GET /api/van-chuyen/thong-tin
 */
async function loadApiInformation() {
  try {
    const res = await fetch('/api/van-chuyen/thong-tin', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!res.ok) {
      console.warn('Không thể lấy thông tin cấu hình:', res.status);
      return;
    }

    const data = await res.json();

    // 1. Google Maps status card
    const valGg = document.getElementById('valStatusGoogleMaps');
    const subGg = document.getElementById('subStatusGoogleMaps');
    if (valGg && data.googleMaps) {
      if (data.googleMaps.daCauHinh) {
        valGg.textContent = 'HOẠT ĐỘNG';
        valGg.className = 'delivery-card-value status-success';
        if (subGg) subGg.textContent = 'Google Maps API đã kết nối';
      } else {
        valGg.textContent = 'CHƯA CÓ KEY';
        valGg.className = 'delivery-card-value status-warning';
        if (subGg) subGg.textContent = 'Chưa thể Geocode & Routes thật';
      }
    }

    // 2. Lalamove status card
    const valLala = document.getElementById('valStatusLalamove');
    const subLala = document.getElementById('subStatusLalamove');
    if (valLala && data.lalamove) {
      if (data.lalamove.trangThai === 'STUB') {
        valLala.textContent = 'BẢN MẪU (STUB)';
        valLala.className = 'delivery-card-value status-warning';
        if (subLala) subLala.textContent = 'Chưa tích hợp gọi tài xế thật';
      } else if (data.lalamove.daCauHinh) {
        valLala.textContent = 'SẴN SÀNG';
        valLala.className = 'delivery-card-value status-success';
        if (subLala) subLala.textContent = 'API Lalamove đã sẵn sàng';
      }
    }

    // 3. Ngưỡng freeship
    const valFreeShip = document.getElementById('valFreeShip');
    if (valFreeShip && data.vanChuyen?.nguongMienPhiShip) {
      valFreeShip.textContent = formatVND(data.vanChuyen.nguongMienPhiShip);
    }

    // 4. Phạm vi phục vụ
    const valScope = document.getElementById('valDeliveryScope');
    if (valScope && data.vanChuyen?.phamViPhucVu) {
      valScope.textContent = data.vanChuyen.phamViPhucVu;
    }

  } catch (err) {
    console.warn('Lỗi loadApiInformation:', err);
  }
}

/**
 * Gọi GET /api/van-chuyen/danh-sach
 */
async function loadDeliveryList() {
  const tbody = document.getElementById('deliveryTableBody');
  const countEl = document.getElementById('totalDeliveryCount');

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 28px; color: var(--text-muted);">
          <div style="font-size: 26px; margin-bottom: 8px;">⏳</div>
          Đang tải danh sách đơn vận chuyển từ máy chủ...
        </td>
      </tr>
    `;
  }

  try {
    const res = await fetch('/api/van-chuyen/danh-sach', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin'
    });

    if (res.status === 401 || res.status === 403 || res.redirected) {
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 28px; color: #C62828;">
              <div style="font-size: 24px; margin-bottom: 6px;">🔒</div>
              Phiên làm việc Quản trị viên đã hết hạn hoặc không có quyền truy cập.
              <div style="margin-top: 8px;">
                <a href="/admin/login" style="color: var(--brand-burgundy); font-weight: bold; text-decoration: underline;">Đăng nhập lại tại đây</a>
              </div>
            </td>
          </tr>
        `;
      }
      return;
    }

    if (!res.ok) {
      throw new Error('Máy chủ phản hồi mã lỗi ' + res.status);
    }

    const list = await res.json();
    deliveryOrders = Array.isArray(list) ? list : [];

    if (countEl) countEl.textContent = deliveryOrders.length;

    renderDeliveryTable(deliveryOrders);
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 28px; color: #C62828;">
            <div style="font-size: 24px; margin-bottom: 6px;">⚠️</div>
            Không thể tải danh sách đơn vận chuyển: ${escapeHtml(err.message)}
            <div style="margin-top: 10px;">
              <button type="button" class="btn-refresh-delivery" onclick="loadDeliveryData()" style="padding: 6px 14px; font-size: 12px; display: inline-flex;">
                🔄 Thử lại
              </button>
            </div>
          </td>
        </tr>
      `;
    }
    throw err;
  }
}

// =============================================================================
// 4. HIỂN THỊ BẢNG DANH SÁCH VẬN CHUYỂN
// =============================================================================
function renderDeliveryTable(list) {
  const tbody = document.getElementById('deliveryTableBody');
  if (!tbody) return;

  if (!list || list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 32px; color: var(--text-muted);">
          <div style="font-size: 26px; margin-bottom: 8px;">📭</div>
          Hiện chưa có dữ liệu đơn vận chuyển nào trong cơ sở dữ liệu.
        </td>
      </tr>
    `;
    resetDetailPanel();
    return;
  }

  tbody.innerHTML = list.map(item => {
    const isSelected = selectedOrder && selectedOrder.maDon === item.maDon;
    const badgeClass = getStatusBadgeClass(item.trangThai);
    const dateFormatted = item.ngayTao ? new Date(item.ngayTao).toLocaleString('vi-VN') : '--';
    const cdt = item.phiThucTe ? formatVND(item.phiThucTe) : '0đ';
    const khach = item.tenKhach || 'Khách vãng lai';
    const sdt = item.sdtKhach || '--';
    const taiXe = item.tenTaiXe ? `${item.tenTaiXe} (${item.sdttaiXe || '--'})` : (item.trangThai === 'TimTaiXe' ? 'Đang tìm tài xế...' : 'Chưa có tài xế');
    const maVcDisplay = item.maVc > 0 ? `#VC-${item.maVc}` : '<span style="color: var(--text-muted);">Chưa tạo</span>';
    const trangThaiText = getStatusDisplayName(item.trangThai);

    return `
      <tr class="${isSelected ? 'selected' : ''}" onclick="selectDeliveryOrder(${item.maDon})" style="cursor: pointer;">
        <td><strong>${maVcDisplay}</strong></td>
        <td><strong style="color: #2E7D32;">#DH-${item.maDon}</strong></td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(khach)}</div>
          <div style="font-size: 11px; color: var(--text-muted);">${escapeHtml(sdt)}</div>
        </td>
        <td style="max-width: 200px; font-size: 11.5px; white-space: normal; line-height: 1.3;" title="${escapeHtml(item.diaChiGiao || '')}">
          ${escapeHtml(item.diaChiGiao || '--')}
        </td>
        <td style="font-weight: 700; color: var(--brand-burgundy);">${cdt}</td>
        <td><span class="${badgeClass}">${escapeHtml(trangThaiText)}</span></td>
        <td style="font-size: 11.5px;">${escapeHtml(taiXe)}</td>
        <td style="font-size: 11px; color: var(--text-muted);">${dateFormatted}</td>
      </tr>
    `;
  }).join('');
}

function selectDeliveryOrder(maDon) {
  const item = deliveryOrders.find(x => x.maDon === maDon);
  if (!item) return;

  selectedOrder = item;

  // Cập nhật highlight dòng được chọn
  renderDeliveryTable(getFilteredOrders());

  // Hiển thị Panel chi tiết bên phải
  const emptyState = document.getElementById('panelEmptyState');
  const detailState = document.getElementById('panelDetailState');
  const subtitle = document.getElementById('panelSubtitle');

  if (emptyState) emptyState.style.display = 'none';
  if (detailState) detailState.style.display = 'block';
  if (subtitle) subtitle.textContent = `Đang chọn đơn hàng #DH-${item.maDon} ${item.maVc > 0 ? `(#VC-${item.maVc})` : ''}`;

  // Điền dữ liệu chi tiết
  setText('detMaVc', item.maVc > 0 ? `#VC-${item.maVc}` : 'Chưa tạo VC');
  setText('detMaDon', `#DH-${item.maDon}`);
  setText('detTenKhach', item.tenKhach || 'Khách vãng lai');
  setText('detSdtKhach', item.sdtKhach || '--');
  setText('detDiaChi', item.diaChiGiao || '--');
  setText('detPhiThucTe', item.phiThucTe ? formatVND(item.phiThucTe) : '0đ');
  setText('detNgayTao', item.ngayTao ? new Date(item.ngayTao).toLocaleString('vi-VN') : '--');

  const badgeEl = document.getElementById('detTrangThaiBadge');
  if (badgeEl) {
    badgeEl.textContent = getStatusDisplayName(item.trangThai);
    badgeEl.className = getStatusBadgeClass(item.trangThai);
  }

  setText('detLalamoveOrderId', item.lalamoveOrderId || 'Chưa liên kết');
  setText('detTenTaiXe', item.tenTaiXe || (item.trangThai === 'TimTaiXe' ? 'Đang chờ tài xế nhận chuyến' : 'Chưa có tài xế'));
  setText('detSdtTaiXe', item.sdttaiXe || '--');

  const rowTracking = document.getElementById('rowTrackingLink');
  const linkTracking = document.getElementById('linkTrackingLalamove');
  if (rowTracking && linkTracking) {
    if (item.linkTheoDoi && item.linkTheoDoi.startsWith('http')) {
      rowTracking.style.display = 'flex';
      linkTracking.href = item.linkTheoDoi;
    } else {
      rowTracking.style.display = 'none';
    }
  }

  // Điều khiển trạng thái nút bấm thao tác theo trạng thái vận chuyển
  const btnCall = document.getElementById('btnAdminCallDriver');
  const btnSync = document.getElementById('btnAdminSyncDriver');
  const btnCancel = document.getElementById('btnAdminCancelDelivery');

  if (item.trangThai === 'TimTaiXe' || item.trangThai === 'DangGiao') {
    if (btnCall) {
      btnCall.disabled = true;
      btnCall.innerHTML = '<span>🛵 Đang phát lệnh / Đang giao hàng</span>';
      btnCall.style.opacity = '0.6';
      btnCall.style.display = 'flex';
    }
    if (btnSync) {
      btnSync.style.display = 'flex';
      btnSync.disabled = false;
    }
    if (btnCancel) {
      btnCancel.style.display = 'flex';
      btnCancel.disabled = false;
    }
  } else if (item.trangThai === 'HoanThanh') {
    if (btnCall) {
      btnCall.disabled = true;
      btnCall.innerHTML = '<span>✓ Chuyến xe đã giao thành công</span>';
      btnCall.style.opacity = '0.6';
      btnCall.style.display = 'flex';
    }
    if (btnSync) btnSync.style.display = 'none';
    if (btnCancel) btnCancel.style.display = 'none';
  } else {
    // ChuaGoi hoặc Huy
    if (btnCall) {
      btnCall.disabled = false;
      btnCall.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
        <span>${item.trangThai === 'Huy' ? '🛵 Gọi lại tài xế Lalamove' : '🛵 Điều phối / Gọi tài xế Lalamove'}</span>`;
      btnCall.style.opacity = '1';
      btnCall.style.display = 'flex';
    }
    if (btnSync) btnSync.style.display = 'none';
    if (btnCancel) btnCancel.style.display = 'none';
  }
}

function resetDetailPanel() {
  selectedOrder = null;
  const emptyState = document.getElementById('panelEmptyState');
  const detailState = document.getElementById('panelDetailState');
  const subtitle = document.getElementById('panelSubtitle');

  if (emptyState) emptyState.style.display = 'block';
  if (detailState) detailState.style.display = 'none';
  if (subtitle) subtitle.textContent = 'Chọn đơn hàng để quản trị';
}

function applyDeliveryFilter() {
  renderDeliveryTable(getFilteredOrders());
}

function getFilteredOrders() {
  const keyword = (document.getElementById('filterDeliveryKeyword')?.value || '').trim().toLowerCase();
  if (!keyword) return deliveryOrders;

  return deliveryOrders.filter(x => {
    return (x.maVc && x.maVc.toString().includes(keyword)) ||
           (x.maDon && x.maDon.toString().includes(keyword)) ||
           (x.tenKhach && x.tenKhach.toLowerCase().includes(keyword)) ||
           (x.sdtKhach && x.sdtKhach.includes(keyword)) ||
           (x.diaChiGiao && x.diaChiGiao.toLowerCase().includes(keyword));
  });
}

// =============================================================================
// 5. CÔNG CỤ TEST BACKEND ENDPOINTS THỰC TẾ
// =============================================================================

/**
 * Test POST /api/van-chuyen/kiem-tra-dia-chi
 */
async function executeTestAddress() {
  const input = document.getElementById('testAddressInput');
  const resultBox = document.getElementById('resultTestAddress');
  const btn = document.getElementById('btnTestAddress');

  const diaChi = (input?.value || '').trim();
  if (!diaChi) {
    alert('Vui lòng nhập địa chỉ cần kiểm tra.');
    return;
  }

  if (btn) btn.disabled = true;
  if (resultBox) {
    resultBox.innerHTML = '<span style="color: var(--text-secondary);">⏳ Đang gửi yêu cầu tới POST /api/van-chuyen/kiem-tra-dia-chi...</span>';
  }

  try {
    const res = await fetch('/api/van-chuyen/kiem-tra-dia-chi', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ diaChi: diaChi })
    });

    const data = await res.json();
    const formattedJson = JSON.stringify(data, null, 2);

    if (res.ok) {
      resultBox.innerHTML = `
        <div style="color: #2E7D32; font-weight: 700; margin-bottom: 6px;">
          ✓ [HTTP ${res.status}] Địa chỉ hợp lệ & thuộc phạm vi giao hàng
        </div>
        <pre style="margin: 0; font-family: monospace; font-size: 11px; white-space: pre-wrap;">${escapeHtml(formattedJson)}</pre>
      `;
    } else {
      resultBox.innerHTML = `
        <div style="color: #C62828; font-weight: 700; margin-bottom: 6px;">
          ✕ [HTTP ${res.status}] ${data.thongBao || 'Địa chỉ không hợp lệ hoặc ngoài phạm vi'}
        </div>
        <pre style="margin: 0; font-family: monospace; font-size: 11px; white-space: pre-wrap;">${escapeHtml(formattedJson)}</pre>
      `;
    }
  } catch (err) {
    resultBox.innerHTML = `
      <div style="color: #C62828; font-weight: 700; margin-bottom: 4px;">
        ✕ Lỗi kết nối API:
      </div>
      <div>${escapeHtml(err.message)}</div>
    `;
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Test POST /api/van-chuyen/bao-gia
 */
async function executeTestQuote() {
  const inputAddr = document.getElementById('testQuoteAddressInput');
  const inputAmt = document.getElementById('testQuoteAmountInput');
  const resultBox = document.getElementById('resultTestQuote');
  const btn = document.getElementById('btnTestQuote');

  const diaChi = (inputAddr?.value || '').trim();
  const tienHang = parseFloat(inputAmt?.value || '0');

  if (!diaChi) {
    alert('Vui lòng nhập địa chỉ giao hàng.');
    return;
  }

  if (btn) btn.disabled = true;
  if (resultBox) {
    resultBox.innerHTML = '<span style="color: var(--text-secondary);">⏳ Đang gửi yêu cầu tới POST /api/van-chuyen/bao-gia...</span>';
  }

  try {
    const res = await fetch('/api/van-chuyen/bao-gia', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        diaChiGiaoHang: diaChi,
        tienHangSauGiamThuNghiem: tienHang
      })
    });

    const data = await res.json();
    const formattedJson = JSON.stringify(data, null, 2);

    if (res.ok) {
      resultBox.innerHTML = `
        <div style="color: #2E7D32; font-weight: 700; margin-bottom: 6px;">
          ✓ [HTTP ${res.status}] Báo giá vận chuyển thành công
        </div>
        <pre style="margin: 0; font-family: monospace; font-size: 11px; white-space: pre-wrap;">${escapeHtml(formattedJson)}</pre>
      `;
    } else {
      resultBox.innerHTML = `
        <div style="color: #C62828; font-weight: 700; margin-bottom: 6px;">
          ✕ [HTTP ${res.status}] ${data.thongBao || 'Lỗi lấy báo giá từ Backend'}
        </div>
        <pre style="margin: 0; font-family: monospace; font-size: 11px; white-space: pre-wrap;">${escapeHtml(formattedJson)}</pre>
      `;
    }
  } catch (err) {
    resultBox.innerHTML = `
      <div style="color: #C62828; font-weight: 700; margin-bottom: 4px;">
        ✕ Lỗi kết nối API:
      </div>
      <div>${escapeHtml(err.message)}</div>
    `;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// =============================================================================
// 6. THAO TÁC QUẢN TRỊ ADMIN (GỌI TÀI XẾ & HỦY VẬN CHUYỂN)
// =============================================================================
async function handleAdminCallDriver() {
  if (!selectedOrder) {
    alert('Vui lòng chọn một đơn hàng từ danh sách trước.');
    return;
  }

  const confirmCall = confirm(`Xác nhận yêu cầu gọi tài xế Lalamove cho đơn hàng #DH-${selectedOrder.maDon} (${selectedOrder.tenKhach})?`);
  if (!confirmCall) return;

  const btn = document.getElementById('btnAdminCallDriver');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Đang gửi yêu cầu tới Lalamove...</span>';
  }

  try {
    const res = await fetch('/api/van-chuyen/goi-tai-xe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ maDon: selectedOrder.maDon })
    });

    const data = await res.json();

    if (res.ok && data.thanhCong) {
      showToast(data.thongBao || `Gọi tài xế thành công cho đơn #DH-${selectedOrder.maDon}!`, 'success');
      const maDonTarget = selectedOrder.maDon;
      await loadDeliveryData();
      selectDeliveryOrder(maDonTarget);
    } else {
      alert(`[Từ chối từ Backend - HTTP ${res.status}]:\n\n${data.thongBao || 'Không thể thực hiện thao tác gọi tài xế.'}`);
    }
  } catch (err) {
    alert('Lỗi kết nối khi gọi tài xế: ' + err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function handleAdminCancelDelivery() {
  if (!selectedOrder) {
    alert('Vui lòng chọn một đơn vận chuyển từ danh sách trước.');
    return;
  }

  const confirmCancel = confirm(`Bạn có chắc chắn muốn hủy yêu cầu giao hàng Lalamove cho đơn #DH-${selectedOrder.maDon}?`);
  if (!confirmCancel) return;

  const btn = document.getElementById('btnAdminCancelDelivery');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Đang hủy chuyến...</span>';
  }

  try {
    const res = await fetch('/api/van-chuyen/huy-don', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ maDon: selectedOrder.maDon })
    });

    const data = await res.json();

    if (res.ok && data.thanhCong) {
      showToast(data.thongBao || 'Đã hủy yêu cầu vận chuyển thành công.', 'success');
      const maDonTarget = selectedOrder.maDon;
      await loadDeliveryData();
      selectDeliveryOrder(maDonTarget);
    } else {
      alert(`[Từ chối từ Backend - HTTP ${res.status}]:\n\n${data.thongBao || 'Không thể hủy đơn vận chuyển.'}`);
    }
  } catch (err) {
    alert('Lỗi kết nối khi hủy vận chuyển: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>✕</span><span>Hủy yêu cầu giao hàng Lalamove</span>';
    }
  }
}

async function handleAdminSyncDriver() {
  if (!selectedOrder || !selectedOrder.maDon) {
    alert('Vui lòng chọn đơn hàng cần cập nhật.');
    return;
  }

  const btn = document.getElementById('btnAdminSyncDriver');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Đang đồng bộ...</span>';
  }

  try {
    const res = await fetch(`/api/van-chuyen/cap-nhat-trang-thai/${selectedOrder.maDon}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      credentials: 'same-origin'
    });

    const data = await res.json();

    if (res.ok && data.thanhCong) {
      showToast(data.thongBao || 'Đã đồng bộ trạng thái mới nhất từ Lalamove!', 'success');
      const maDonTarget = selectedOrder.maDon;
      await loadDeliveryData();
      selectDeliveryOrder(maDonTarget);
    } else {
      showToast(data.thongBao || 'Chưa thể cập nhật từ máy chủ Lalamove.', 'warning');
    }
  } catch (err) {
    alert('Lỗi khi cập nhật trạng thái: ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🔄</span><span>Cập nhật tiến độ / Tài xế từ Lalamove</span>';
    }
  }
}

// =============================================================================
// 7. TIỆN ÍCH HỖ TRỢ GIAO DIỆN
// =============================================================================
function getStatusBadgeClass(status) {
  switch (status) {
    case 'DangGiao':
    case 'DaGoiTaiXe':
      return 'badge-status-shipping';
    case 'GiaoThanhCong':
    case 'HoanThanh':
      return 'badge-status-success';
    case 'DaHuy':
    case 'Huy':
    case 'ThatBai':
      return 'badge-status-danger';
    case 'TimTaiXe':
      return 'badge-status-warning';
    case 'ChuaGoi':
    case 'KhoiTao':
    default:
      return 'badge-status-neutral';
  }
}

function getStatusDisplayName(status) {
  switch (status) {
    case 'ChuaGoi': return 'Chưa điều phối';
    case 'TimTaiXe': return 'Đang tìm tài xế';
    case 'DangGiao': return 'Đang giao hàng';
    case 'HoanThanh': return 'Hoàn thành';
    case 'Huy': return 'Đã hủy chuyến';
    default: return status || 'Chưa điều phối';
  }
}

function formatVND(amount) {
  if (amount == null || isNaN(amount)) return '0đ';
  return Number(amount).toLocaleString('vi-VN') + 'đ';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

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
  const notifBtn = document.getElementById('btnNotification');
  const notifPopup = document.getElementById('notificationPopup');
  if (notifBtn && notifPopup) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notifPopup.classList.toggle('active');
    });
    document.addEventListener('click', (e) => {
      if (!notifPopup.contains(e.target) && !notifBtn.contains(e.target)) {
        notifPopup.classList.remove('active');
      }
    });
  }
}

function initSoundToggle() {
  const soundBtn = document.getElementById('btnSoundToggle');
  if (soundBtn) {
    let soundEnabled = true;
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundBtn.title = soundEnabled ? 'Bật âm thông báo' : 'Tắt âm thông báo';
      soundBtn.style.opacity = soundEnabled ? '1' : '0.5';
    });
  }
}
