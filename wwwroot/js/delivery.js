/**
 * Cơm Trưa Anh Béo - Delivery Settings Module (Cấu hình giao hàng)
 * File: wwwroot/js/delivery.js
 * Frontend UI Architecture & Backend Integration Placeholders
 * Strictly follows AGENTS.md: Honest feedback, validation before saving, no fake mock persistence.
 */

// =============================================================================
// 1. DELIVERY CONFIGURATION STATE
// =============================================================================
const DeliveryState = {
  deliveryEnabled: true,
  deliveryArea: "TP. Hồ Chí Minh",
  minOrderValue: 50000,           // 50.000đ
  freeShippingThreshold: 200000   // 200.000đ
};

// =============================================================================
// 2. INITIALIZATION
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initFormValues();
  updateOverviewCards();
  initEventListeners();
  initNotificationControls();
  initSoundToggle();
  runOrderSimulation();

  console.log('Delivery Settings module initialized in Live Server / UI preview mode.');
});

// =============================================================================
// 3. FORM SYNC & CENTER WORKSPACE DISPLAY
// =============================================================================
function initFormValues() {
  const switchEnabled = document.getElementById('switchDelivery');
  const inputMinOrder = document.getElementById('inputMinOrder');
  const inputFreeShip = document.getElementById('inputFreeShip');

  if (switchEnabled) switchEnabled.checked = DeliveryState.deliveryEnabled;
  if (inputMinOrder) inputMinOrder.value = DeliveryState.minOrderValue;
  if (inputFreeShip) inputFreeShip.value = DeliveryState.freeShippingThreshold;
}

function updateOverviewCards() {
  // 1. Status Card
  const statusCard = document.getElementById('cardDeliveryStatus');
  const statusValue = document.getElementById('valDeliveryStatus');
  const statusSubtext = document.getElementById('subDeliveryStatus');

  if (statusCard && statusValue && statusSubtext) {
    if (DeliveryState.deliveryEnabled) {
      statusCard.className = 'delivery-summary-card card-status-enabled';
      statusValue.textContent = 'ĐANG MỞ GIAO HÀNG';
      statusValue.style.color = 'var(--success)';
      statusSubtext.textContent = 'Phục vụ các quận/huyện TP. Hồ Chí Minh';
    } else {
      statusCard.className = 'delivery-summary-card card-status-disabled';
      statusValue.textContent = 'TẠM NGƯNG GIAO HÀNG';
      statusValue.style.color = 'var(--danger)';
      statusSubtext.textContent = 'Hệ thống tạm thời không nhận đơn mới';
    }
  }

  // 2. Min Order Card
  const minOrderValue = document.getElementById('valMinOrder');
  if (minOrderValue) {
    minOrderValue.textContent = formatVND(DeliveryState.minOrderValue);
  }

  // 3. Free Shipping Threshold Card
  const freeShipValue = document.getElementById('valFreeShip');
  if (freeShipValue) {
    freeShipValue.textContent = formatVND(DeliveryState.freeShippingThreshold);
  }

  // Sync simulator
  runOrderSimulation();
}

function initEventListeners() {
  // Delivery toggle switch
  const switchEnabled = document.getElementById('switchDelivery');
  if (switchEnabled) {
    switchEnabled.addEventListener('change', (e) => {
      DeliveryState.deliveryEnabled = e.target.checked;
      updateOverviewCards();
    });
  }

  // Simulator input
  const simInput = document.getElementById('simOrderAmount');
  if (simInput) {
    simInput.addEventListener('input', runOrderSimulation);
  }
}

// =============================================================================
// 4. VALIDATION & SAVE SETTINGS
// =============================================================================
function saveDeliverySettings() {
  clearValidationErrors();

  const switchEnabled = document.getElementById('switchDelivery');
  const inputMinOrder = document.getElementById('inputMinOrder');
  const inputFreeShip = document.getElementById('inputFreeShip');

  const isEnabled = switchEnabled ? switchEnabled.checked : true;
  const rawMinOrder = inputMinOrder ? inputMinOrder.value.trim() : '';
  const rawFreeShip = inputFreeShip ? inputFreeShip.value.trim() : '';

  let hasError = false;

  // Validate Minimum Order Value
  const minOrder = Number(rawMinOrder);
  if (rawMinOrder === '' || isNaN(minOrder)) {
    showFieldError('errorMinOrder', 'Vui lòng nhập giá trị đơn hàng tối thiểu.');
    hasError = true;
  } else if (minOrder < 0) {
    showFieldError('errorMinOrder', 'Giá trị đơn tối thiểu không được là số âm.');
    hasError = true;
  }

  // Validate Free Shipping Threshold
  const freeShip = Number(rawFreeShip);
  if (rawFreeShip === '' || isNaN(freeShip)) {
    showFieldError('errorFreeShip', 'Vui lòng nhập giá trị đơn được miễn phí vận chuyển.');
    hasError = true;
  } else if (freeShip < 0) {
    showFieldError('errorFreeShip', 'Ngưỡng miễn phí giao hàng không được là số âm.');
    hasError = true;
  }

  // Logical sanity check: Freeship threshold should not be lower than min order
  if (!hasError && freeShip > 0 && freeShip < minOrder) {
    showFieldError('errorFreeShip', 'Ngưỡng miễn phí giao hàng nên lớn hơn hoặc bằng giá trị đơn tối thiểu.');
    hasError = true;
  }

  if (hasError) {
    showToast('Vui lòng kiểm tra lại các trường thông tin cấu hình!', 'danger');
    return;
  }

  // Update local UI state
  DeliveryState.deliveryEnabled = isEnabled;
  DeliveryState.minOrderValue = minOrder;
  DeliveryState.freeShippingThreshold = freeShip;

  updateOverviewCards();

  // Honest feedback for UI Testing (Per AGENTS.md: do not pretend backend saved)
  showToast('Đã lưu cấu hình giao hàng trên giao diện thành công! (Chờ kết nối API Backend để lưu vĩnh viễn)', 'success');

  // Non-executing backend integration hook
  // TODO: Connect C# Controller API:
  // POST /api/delivery/settings
  // Headers: { 'Content-Type': 'application/json' }
  // Body: JSON.stringify({
  //   deliveryEnabled: DeliveryState.deliveryEnabled,
  //   deliveryArea: DeliveryState.deliveryArea,
  //   minOrderValue: DeliveryState.minOrderValue,
  //   freeShippingThreshold: DeliveryState.freeShippingThreshold
  // })
  console.log('Delivery settings ready for backend persistence:', DeliveryState);
}

function resetDeliveryDefaults() {
  DeliveryState.deliveryEnabled = true;
  DeliveryState.minOrderValue = 50000;
  DeliveryState.freeShippingThreshold = 200000;

  initFormValues();
  clearValidationErrors();
  updateOverviewCards();

  showToast('Đã khôi phục thông số giao hàng về mặc định (50.000đ - 200.000đ)!', 'info');
}

function showFieldError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.classList.add('visible');
  }
}

function clearValidationErrors() {
  document.querySelectorAll('.field-error-msg').forEach(el => {
    el.textContent = '';
    el.classList.remove('visible');
  });
}

// =============================================================================
// 5. INTERACTIVE ORDER SIMULATOR
// =============================================================================
function runOrderSimulation() {
  const simInput = document.getElementById('simOrderAmount');
  const resultStatus = document.getElementById('simResultStatus');
  const resultHint = document.getElementById('simResultHint');

  if (!simInput || !resultStatus || !resultHint) return;

  const testAmount = Number(simInput.value) || 0;

  if (!DeliveryState.deliveryEnabled) {
    resultStatus.innerHTML = '<span style="color: var(--danger);">❌ TẠM NGƯNG GIAO HÀNG</span>';
    resultHint.textContent = 'Hệ thống đang tắt tính năng giao hàng, không thể đặt đơn lúc này.';
    return;
  }

  if (testAmount < DeliveryState.minOrderValue) {
    const missingAmount = DeliveryState.minOrderValue - testAmount;
    resultStatus.innerHTML = `<span style="color: var(--danger);">⚠️ Chưa đạt đơn tối thiểu</span>`;
    resultHint.innerHTML = `Cần mua thêm <strong>${formatVND(missingAmount)}</strong> để đủ điều kiện đặt giao hàng (Tối thiểu: ${formatVND(DeliveryState.minOrderValue)}).`;
  } else if (testAmount >= DeliveryState.freeShippingThreshold) {
    resultStatus.innerHTML = `<span style="color: var(--success);">🎉 Đủ điều kiện MIỄN PHÍ SHIP!</span>`;
    resultHint.innerHTML = `Đơn cơm từ <strong>${formatVND(DeliveryState.freeShippingThreshold)}</strong> được quán tài trợ 100% phí giao hàng Lalamove tại TP.HCM.`;
  } else {
    const missingForFreeship = DeliveryState.freeShippingThreshold - testAmount;
    resultStatus.innerHTML = `<span style="color: #FF9800;">🛵 Đủ điều kiện đặt (Tính phí ship chuẩn)</span>`;
    resultHint.innerHTML = `Mua thêm <strong>${formatVND(missingForFreeship)}</strong> để được hưởng ưu đãi miễn phí giao hàng.`;
  }
}

// =============================================================================
// 6. UTILITIES, TOASTS & HEADER CONTROLS
// =============================================================================
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(amount)
    .replace('₫', 'đ');
}

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
