/**
 * Cơm Trưa Anh Béo - Common Admin Shared Component Script
 * File: wwwroot/js/admin-common.js
 * Centralizes Header, Navigation, Avatar Dropdown, Sound, Notifications, and Modals.
 * Strictly follows AGENTS.md rules.
 */

// Embedded Fallback Template String for instant local rendering & zero-CORS latency
const SHARED_COMPONENTS_TEMPLATE = `
<!-- SHARED ADMIN HEADER -->
<header class="admin-header" id="sharedAdminHeader">
  <div class="header-left">
    <div class="brand-logo-icon">
      <svg viewBox="0 0 24 24" width="28" height="28" fill="var(--brand-yellow)">
        <path d="M12 2C11.5 2 11 2.5 11 3C11 3.5 11.5 4 12 4C13 4 14 5 14 6C14 7 13 8 12 8C11.45 8 11 8.45 11 9C11 9.55 11.45 10 12 10C14.21 10 16 8.21 16 6C16 3.79 14.21 2 12 2M7.5 4C7 4 6.5 4.5 6.5 5C6.5 5.5 7 6 7.5 6C8.33 6 9 6.67 9 7.5C9 8.33 8.33 9 7.5 9C6.95 9 6.5 9.45 6.5 10C6.5 10.55 6.95 11 7.5 11C9.43 11 11 9.43 11 7.5C11 5.57 9.43 4 7.5 4M2 13C2 17.42 5.58 21 10 21H14C18.42 21 22 17.42 22 13V12H2V13M10 22.5C9.45 22.5 9 22.95 9 23.5C9 23.78 9.22 24 9.5 24H14.5C14.78 24 15 23.78 15 23.5C15 22.95 14.55 22.5 14 22.5H10Z"/>
      </svg>
    </div>
    <div class="brand-text-container">
      <span class="brand-title">CƠM TRƯA ANH BÉO</span>
      <span class="brand-subtitle">Hệ thống quản lý bán cơm</span>
    </div>
  </div>

  <div class="header-right">
    <!-- Sound Alert Toggle Button -->
    <button type="button" class="sound-toggle-btn" id="soundToggleBtn" title="Âm thanh thông báo: ĐANG BẬT" aria-label="Bật/tắt âm thanh chuông báo">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5 9.77l-4.5-4.5H3v6h4l4.5 4.5v-6zm5 0c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
    </button>

    <!-- Notification Bell with Unread Badge & Dropdown -->
    <div class="notification-wrapper">
      <button type="button" class="notification-btn" id="notiBtn" title="Thông báo hệ thống">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
        </svg>
        <span class="notification-badge" id="notiBadgeCount">3</span>
      </button>

      <div class="notification-dropdown" id="notiDropdown">
        <div class="dropdown-header">
          <h4>Thông báo hệ thống</h4>
          <span class="badge-unread">3 mới</span>
        </div>
        <div class="dropdown-list">
          <div class="noti-item unread">
            <span class="noti-item-icon">🔔</span>
            <div class="noti-item-text">
              <strong>Đơn hàng mới #DH-1025</strong>
              <p>Khách hàng vừa đặt 2 phần cơm sườn bì chả nướng than.</p>
              <span class="noti-time">Vừa xong</span>
            </div>
          </div>
          <div class="noti-item unread">
            <span class="noti-item-icon">🛵</span>
            <div class="noti-item-text">
              <strong>Tài xế Lalamove đã nhận đơn</strong>
              <p>Tài xế đang đến nhận đơn #DH-1023 tại quán.</p>
              <span class="noti-time">10 phút trước</span>
            </div>
          </div>
          <div class="noti-item unread">
            <span class="noti-item-icon">⭐</span>
            <div class="noti-item-text">
              <strong>Đánh giá 5 sao từ khách hàng</strong>
              <p>Cơm nóng hổi, sườn ướp đậm đà rất vừa miệng!</p>
              <span class="noti-time">25 phút trước</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Profile with Dropdown Menu -->
    <div class="admin-profile-wrapper">
      <div class="admin-profile" id="adminProfileBtn" title="Tài khoản quản trị">
        <div class="profile-avatar">QT</div>
        <div class="profile-info">
          <span class="profile-name">Quản trị viên</span>
          <span class="profile-role">Quản trị viên</span>
        </div>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" class="profile-chevron">
          <path d="M7.41 8.59L12 13.17L16.59 8.59L18 10L12 16L6 10L7.41 8.59Z"/>
        </svg>
      </div>

      <!-- Admin Profile Dropdown Menu -->
      <div class="admin-profile-dropdown" id="adminProfileDropdown" role="menu" aria-label="Menu tài khoản quản trị">
        <div class="profile-dropdown-header">
          <strong>Quản trị viên</strong>
          <span></span>
        </div>
        <div class="profile-dropdown-divider"></div>
        <a href="/" target="_blank" rel="noopener noreferrer" class="profile-dropdown-item" role="menuitem" title="Mở trang bán hàng cho khách xem thử (tab mới)">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 19H5V5H12V3H5C3.89 3 3 3.89 3 5V19C3 20.1 3.89 21 5 21H19C20.1 21 21 20.1 21 19V12H19V19M14 3V5H17.59L7.76 14.83L9.17 16.24L19 6.41V10H21V3H14Z"/>
          </svg>
          <span>Xem trang bán hàng</span>
          <span class="external-pill">Mới ↗</span>
        </a>
        <div class="profile-dropdown-divider"></div>
        <button type="button" class="profile-dropdown-item item-logout" role="menuitem" onclick="openLogoutModal()" title="Đăng xuất khỏi hệ thống quản trị">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M17 7L15.59 8.41L18.17 11H8V13H18.17L15.59 15.58L17 17L22 12L17 7M4 5H12V3H4C2.9 3 2 3.9 2 5V19C2 20.1 2.9 21 4 21H12V19H4V5Z"/>
          </svg>
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  </div>
</header>

<!-- SHARED ADMIN SIDEBAR -->
<aside class="admin-sidebar" id="sharedAdminSidebar">
  <nav class="sidebar-nav">
<<<<<<< HEAD
    <a class="sidebar-nav-item" data-nav="orders" href="orders.html" title="Trang Quản lý đơn hàng">
=======
    <a class="sidebar-nav-item" data-nav="orders" href="/admin/orders" title="Trang Quản lý đơn hàng">
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19M17 12H7V10H17V12M13 16H7V14H13V16M17 8H7V6H17V8Z"/>
      </svg>
      <span>Quản lý đơn hàng</span>
    </a>

<<<<<<< HEAD
    <a class="sidebar-nav-item" data-nav="dishes" href="adminpage.html" title="Trang Quản lý món ăn">
=======
    <a class="sidebar-nav-item" data-nav="dishes" href="/admin/products" title="Trang Quản lý món ăn">
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M18.06 22.99H5.94C4.33 22.99 3 21.66 3 20.05V13.88C3 13.06 3.67 12.39 4.49 12.39H19.51C20.33 12.39 21 13.06 21 13.88V20.05C21 21.66 19.67 22.99 18.06 22.99M12 2C10.9 2 10 2.9 10 4V10H14V4C14 2.9 13.1 2 12 2M6 4C4.9 4 4 4.9 4 6V10H8V6C8 4.9 7.1 4 6 4M18 4C16.9 4 16 4.9 16 6V10H20V6C20 4.9 19.1 4 18 4Z"/>
      </svg>
      <span>Quản lý món ăn</span>
    </a>

<<<<<<< HEAD
    <a class="sidebar-nav-item" data-nav="promotions" href="Promotions.html" title="Quản lý khuyến mãi">
=======
    <a class="sidebar-nav-item" data-nav="promotions" href="/admin/promotions" title="Quản lý khuyến mãi">
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
      </svg>
      <span>Quản lý khuyến mãi</span>
    </a>

<<<<<<< HEAD
    <a class="sidebar-nav-item" data-nav="accounts" href="accounts.html" title="Quản lý tài khoản">
=======
    <a class="sidebar-nav-item" data-nav="accounts" href="/admin/accounts" title="Quản lý tài khoản">
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      <span>Quản lý tài khoản</span>
    </a>

<<<<<<< HEAD
    <a class="sidebar-nav-item" data-nav="statistics" href="statistics.html" title="Thống kê & Báo cáo">
=======
    <a class="sidebar-nav-item" data-nav="statistics" href="/admin/statistics" title="Thống kê & Báo cáo">
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3M19 19H5V5H19V19M7 10H9V17H7V10M11 7H13V17H11V7M15 13H17V17H15V13Z"/>
      </svg>
      <span>Thống kê & báo cáo</span>
    </a>

<<<<<<< HEAD
    <a class="sidebar-nav-item" data-nav="delivery" href="delivery.html" title="Cấu hình giao hàng">
=======
    <a class="sidebar-nav-item" data-nav="delivery" href="/admin/delivery" title="Cấu hình giao hàng">
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M18 18.5C18 19.33 17.33 20 16.5 20C15.67 20 15 19.33 15 18.5C15 17.67 15.67 17 16.5 17C17.33 17 18 17.67 18 18.5M19.5 9.5L21.46 12H17V9.5H19.5M6 18.5C6 19.33 5.33 20 4.5 20C3.67 20 3 19.33 3 18.5C3 17.67 3.67 17 4.5 17C5.33 17 6 17.67 6 18.5M20 8H17V4H3C1.89 4 1 4.89 1 6V17H3C3 18.66 4.34 20 6 20C7.66 20 9 18.66 9 17H15C15 18.66 16.34 20 18 20C19.66 20 21 18.66 21 17H23V12L20 8Z"/>
      </svg>
      <span>Cấu hình giao hàng</span>
    </a>
  </nav>

  <div class="sidebar-footer-info">
    <div><strong>Cơm Trưa Anh Béo</strong></div>
    <div>Phiên bản v2.6.4 Pro</div>
  </div>
</aside>

<!-- SHARED LOGOUT CONFIRMATION MODAL -->
<div class="admin-modal-backdrop" id="logoutConfirmModal" style="display: none;">
  <div class="admin-modal-box" style="max-width: 440px;">
    <div class="admin-modal-header">
      <h3>XÁC NHẬN ĐĂNG XUẤT</h3>
      <button type="button" class="btn-modal-close" onclick="closeLogoutModal()">✕</button>
    </div>
    <div class="admin-modal-body" style="padding: 24px 20px; text-align: center;">
      <div style="font-size: 40px; margin-bottom: 12px;">👋</div>
      <p style="font-size: 14.5px; font-weight: 700; color: var(--brand-burgundy); margin-bottom: 6px;">
        Bạn có chắc chắn muốn đăng xuất?
      </p>
      <p style="font-size: 12.5px; color: var(--text-secondary); margin: 0;">
        Phiên làm việc hiện tại của tài khoản quản trị <strong>Anh Béo</strong> sẽ kết thúc an toàn.
      </p>
    </div>
    <div class="admin-modal-footer">
      <button type="button" class="bulk-action-btn bulk-btn-print" onclick="closeLogoutModal()">
        Hủy bỏ
      </button>
      <button type="button" class="bulk-action-btn bulk-btn-cancel" onclick="confirmLogout()">
        Xác nhận đăng xuất
      </button>
    </div>
  </div>
</div>
`;

// =============================================================================
// 1. AUTO-LOAD SHARED COMPONENTS & NAVIGATION HIGHLIGHTING
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initSharedComponents();
});

function injectSharedTemplate(htmlContent) {
  const headerContainer = document.getElementById('appHeader');
  const sidebarContainer = document.getElementById('appSidebar');

  if (headerContainer || sidebarContainer) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;

    const headerEl = tempDiv.querySelector('#sharedAdminHeader');
    const sidebarEl = tempDiv.querySelector('#sharedAdminSidebar');
    const logoutModalEl = tempDiv.querySelector('#logoutConfirmModal');

    if (headerContainer && headerEl) {
      headerContainer.replaceWith(headerEl);
    }
    if (sidebarContainer && sidebarEl) {
      sidebarContainer.replaceWith(sidebarEl);
    }
    if (logoutModalEl && !document.getElementById('logoutConfirmModal')) {
      document.body.appendChild(logoutModalEl);
    }
  }

  highlightActiveNavigation();
  bindSharedHeaderEvents();
}

async function initSharedComponents() {
<<<<<<< HEAD
  // Step 1: Instantly and synchronously inject embedded template with zero async delay
  injectSharedTemplate(SHARED_COMPONENTS_TEMPLATE);

  // Step 2: In background, try fetching external _shared-header.html if running on web server
  try {
    const response = await fetch('_shared-header.html');
    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 0 && text !== SHARED_COMPONENTS_TEMPLATE) {
        const currentHeader = document.getElementById('sharedAdminHeader');
        const currentSidebar = document.getElementById('sharedAdminSidebar');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;

        const newHeader = tempDiv.querySelector('#sharedAdminHeader');
        const newSidebar = tempDiv.querySelector('#sharedAdminSidebar');

        if (currentHeader && newHeader) currentHeader.replaceWith(newHeader);
        if (currentSidebar && newSidebar) currentSidebar.replaceWith(newSidebar);

        highlightActiveNavigation();
        bindSharedHeaderEvents();
      }
    }
  } catch (e) {
    // Graceful fallback: embedded template already actively rendered
=======
  // If rendered by Razor partial view (_AdminHeader.cshtml), elements already exist in DOM
  const existingHeader = document.getElementById('sharedAdminHeader');
  const existingSidebar = document.getElementById('sharedAdminSidebar');

  if (existingHeader || existingSidebar) {
    highlightActiveNavigation();
    bindSharedHeaderEvents();
  } else {
    // Fallback if legacy mount targets exist
    injectSharedTemplate(SHARED_COMPONENTS_TEMPLATE);
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
  }

  await updateAdminProfile();
}

async function updateAdminProfile() {
  try {
    const response = await fetch('/auth/current', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.message || 'Không thể tải thông tin tài khoản quản trị.');
    }

    const user = result?.user;
    if (!user || user.role !== 'Admin') {
      window.location.assign('/admin/login');
      return;
    }

    const name = user.name || 'Quản trị viên';
    const initials = name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase() || 'QT';
    const avatar = document.querySelector('.profile-avatar');
    const profileName = document.querySelector('.profile-name');
    const dropdownName = document.querySelector('.profile-dropdown-header strong');
    const dropdownEmail = document.querySelector('.profile-dropdown-header span');

    if (avatar) avatar.textContent = initials;
    if (profileName) profileName.textContent = name;
    if (dropdownName) dropdownName.textContent = `${name} (Admin)`;
    if (dropdownEmail) dropdownEmail.textContent = user.email || '';
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Không thể tải thông tin tài khoản quản trị.', 'error');
  }
}

function highlightActiveNavigation() {
  const currentPath = window.location.pathname.toLowerCase();
  let activeKey = document.body.dataset.activeNav;

  if (!activeKey) {
    if (currentPath.includes('orders')) activeKey = 'orders';
<<<<<<< HEAD
    else if (currentPath.includes('adminpage')) activeKey = 'dishes';
=======
    else if (currentPath.includes('adminpage') || currentPath.includes('products')) activeKey = 'dishes';
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
    else if (currentPath.includes('promotions')) activeKey = 'promotions';
    else if (currentPath.includes('accounts')) activeKey = 'accounts';
    else if (currentPath.includes('statistics')) activeKey = 'statistics';
    else if (currentPath.includes('delivery')) activeKey = 'delivery';
  }

  if (activeKey) {
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      const itemKey = item.dataset.nav;
      if (itemKey === activeKey) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }
}

// =============================================================================
// 2. SHARED EVENT HANDLERS
// =============================================================================
let isSharedGlobalEventsBound = false;

function bindSharedHeaderEvents() {
  // 1. Notification Dropdown Toggle
  const notiBtn = document.getElementById('notiBtn');
  const notiDropdown = document.getElementById('notiDropdown');

  if (notiBtn && notiDropdown) {
    notiBtn.onclick = (e) => {
      e.stopPropagation();
      closeAllDropdowns(notiDropdown);
      notiDropdown.classList.toggle('active');
    };
  }

  // 2. Admin Profile Dropdown Toggle
  const profileBtn = document.getElementById('adminProfileBtn');
  const profileDropdown = document.getElementById('adminProfileDropdown');
  const profileWrapper = document.querySelector('.admin-profile-wrapper');

<<<<<<< HEAD
  if (profileBtn && profileDropdown) {
    profileBtn.onclick = (e) => {
      e.stopPropagation();
      closeAllDropdowns(profileDropdown);
      const willBeActive = !profileDropdown.classList.contains('active');
      profileDropdown.classList.toggle('active', willBeActive);
      if (profileWrapper) profileWrapper.classList.toggle('active', willBeActive);
=======
  window.toggleAdminProfileDropdown = function(e) {
    if (e) e.stopPropagation();
    const curDropdown = document.getElementById('adminProfileDropdown');
    const curWrapper = document.querySelector('.admin-profile-wrapper');
    if (curDropdown) {
      closeAllDropdowns(curDropdown);
      const willBeActive = !curDropdown.classList.contains('active');
      curDropdown.classList.toggle('active', willBeActive);
      if (curWrapper) curWrapper.classList.toggle('active', willBeActive);
    }
  };

  if (profileBtn && profileDropdown) {
    profileBtn.onclick = (e) => {
      window.toggleAdminProfileDropdown(e);
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
    };
  }

  // 3. Sound Alert Toggle
  const soundBtn = document.getElementById('soundToggleBtn');
  if (soundBtn) {
    let soundEnabled = localStorage.getItem('adminSoundAlert') !== 'false';
    updateSoundButtonUI(soundBtn, soundEnabled);

    soundBtn.onclick = () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem('adminSoundAlert', soundEnabled);
      updateSoundButtonUI(soundBtn, soundEnabled);
      showToast(soundEnabled ? 'Đã bật chuông thông báo đơn hàng' : 'Đã tắt chuông thông báo', 'info');
    };
  }

  // 4. Modal Backdrop Click
  const logoutModal = document.getElementById('logoutConfirmModal');
  if (logoutModal) {
    logoutModal.onclick = (e) => {
      if (e.target === logoutModal) {
        closeLogoutModal();
      }
    };
  }

  // 5. Global Document Listeners (Click outside & Escape key) - bound once
  if (!isSharedGlobalEventsBound) {
    isSharedGlobalEventsBound = true;

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
      const curNotiDropdown = document.getElementById('notiDropdown');
      const curNotiBtn = document.getElementById('notiBtn');
      const curProfileDropdown = document.getElementById('adminProfileDropdown');
      const curProfileBtn = document.getElementById('adminProfileBtn');
      const curProfileWrapper = document.querySelector('.admin-profile-wrapper');

      if (curNotiDropdown && !curNotiDropdown.contains(e.target) && curNotiBtn && !curNotiBtn.contains(e.target)) {
        curNotiDropdown.classList.remove('active');
      }
      if (curProfileDropdown && !curProfileDropdown.contains(e.target) && curProfileBtn && !curProfileBtn.contains(e.target)) {
        curProfileDropdown.classList.remove('active');
        if (curProfileWrapper) curProfileWrapper.classList.remove('active');
      }
    });

    // Close dropdowns and modal when pressing Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        const curNotiDropdown = document.getElementById('notiDropdown');
        const curProfileDropdown = document.getElementById('adminProfileDropdown');
        const curProfileWrapper = document.querySelector('.admin-profile-wrapper');

        if (curProfileDropdown && curProfileDropdown.classList.contains('active')) {
          curProfileDropdown.classList.remove('active');
          if (curProfileWrapper) curProfileWrapper.classList.remove('active');
        }
        if (curNotiDropdown && curNotiDropdown.classList.contains('active')) {
          curNotiDropdown.classList.remove('active');
        }
        closeLogoutModal();
      }
    });
  }
}

function closeAllDropdowns(exceptElement) {
  const notiDropdown = document.getElementById('notiDropdown');
  const profileDropdown = document.getElementById('adminProfileDropdown');
  const profileWrapper = document.querySelector('.admin-profile-wrapper');

  if (notiDropdown && notiDropdown !== exceptElement) {
    notiDropdown.classList.remove('active');
  }
  if (profileDropdown && profileDropdown !== exceptElement) {
    profileDropdown.classList.remove('active');
    if (profileWrapper) profileWrapper.classList.remove('active');
  }
}

function updateSoundButtonUI(button, enabled) {
  button.title = enabled ? 'Âm thanh thông báo: ĐANG BẬT' : 'Âm thanh thông báo: ĐÃ TẮT';
  button.style.opacity = enabled ? '1' : '0.45';
}

// =============================================================================
// 3. SHARED LOGOUT MODAL & TOAST
// =============================================================================
function openLogoutModal() {
  const modal = document.getElementById('logoutConfirmModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
  closeAllDropdowns();
}

function closeLogoutModal() {
  const modal = document.getElementById('logoutConfirmModal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
}

<<<<<<< HEAD
async function confirmLogout() {
  closeLogoutModal();
  try {
    const tokenResponse = await fetch('/auth/antiforgery', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const tokenResult = await tokenResponse.json().catch(() => null);
    if (!tokenResponse.ok || !tokenResult?.token) {
      throw new Error(tokenResult?.message || 'Không thể xác thực yêu cầu đăng xuất. Vui lòng tải lại trang.');
    }

    const response = await fetch('/auth/logout', {
      method: 'POST',
      headers: { RequestVerificationToken: tokenResult.token },
      credentials: 'same-origin'
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(result?.message || 'Không thể đăng xuất. Vui lòng thử lại.');
    }

    window.location.assign('/admin/login');
  } catch (error) {
    showToast(error instanceof Error ? error.message : 'Không thể đăng xuất. Vui lòng thử lại.', 'error');
=======
function confirmLogout() {
  closeLogoutModal();
  const form = document.getElementById('adminLogoutForm');
  if (form) {
    form.submit();
  } else {
    window.location.assign('/admin/logout');
>>>>>>> 645e0e89fd537b30660a43f39ecf022914d59563
  }
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
    <span class="toast-msg">${message}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
