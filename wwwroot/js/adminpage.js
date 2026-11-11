/**
 * Cơm Trưa Anh Béo - Food Management Module (Kết nối SQL Server trực tiếp)
 * Script file: wwwroot/js/adminpage.js
 */

let dishes = [];
let selectedDishId = null;
let isCreateMode = false;
let currentPage = 1;
const itemsPerPage = 8;
let filteredDishes = [];

function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'đ');
}

// 1. Nạp danh sách món ăn từ SQL Server
async function fetchDishesFromDb() {
    try {
        const res = await fetch('/admin/api/products');
        if (res.ok) {
            const data = await res.json();

            // Lấy danh sách ID các món bị ẩn từ localStorage (không cần đụng database)
            const hiddenIds = JSON.parse(localStorage.getItem("HIDDEN_DISH_IDS") || "[]");

            dishes = data.map(d => ({
                ...d,
                // Nếu ID món có trong danh sách ẩn thì visible = false
                visible: !hiddenIds.includes(d.rawId)
            }));

            renderKPIs();
            handleSearchFilter();
            if (dishes.length > 0 && !selectedDishId) {
                selectDish(dishes[0].id);
            }
        }
    } catch (err) {
        console.error("Lỗi tải món ăn:", err);
    }
}

// 2. Thống kê KPI
function renderKPIs() {
    const total = dishes.length;
    const active = dishes.filter(d => d.available).length;
    const soldout = dishes.filter(d => !d.available).length;
    const hidden = dishes.filter(d => !d.visible).length;

    const elTotal = document.getElementById("statTotalDishes");
    const elActive = document.getElementById("statActiveDishes");
    const elSoldout = document.getElementById("statSoldOutDishes");
    const elHidden = document.getElementById("statHiddenDishes");

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = active;
    if (elSoldout) elSoldout.textContent = soldout;
    if (elHidden) elHidden.textContent = hidden;
}

// 3. Tìm kiếm và Lọc
function handleSearchFilter() {
    const searchInput = document.getElementById("searchInput");
    const filterCat = document.getElementById("filterCategory");
    const filterStat = document.getElementById("filterStatus");

    const q = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const cat = filterCat ? filterCat.value : "ALL";
    const stat = filterStat ? filterStat.value : "ALL";

    filteredDishes = dishes.filter(item => {
        const matchName = item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q);
        if (!matchName) return false;

        if (cat !== "ALL" && item.category !== cat) return false;

        if (stat === "AVAILABLE" && !item.available) return false;
        if (stat === "SOLDOUT" && item.available) return false;
        if (stat === "VISIBLE" && !item.visible) return false;
        if (stat === "HIDDEN" && item.visible) return false;

        return true;
    });

    currentPage = 1;
    renderTable();
}

// 4. Vẽ bảng món ăn
function renderTable() {
    const tbody = document.getElementById("dishTableBody");
    const emptyState = document.getElementById("dishEmptyState");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (filteredDishes.length === 0) {
        if (emptyState) emptyState.style.display = "block";
        const pInfo = document.getElementById("paginationInfo");
        if (pInfo) pInfo.textContent = "Không tìm thấy món ăn nào";
        return;
    }

    if (emptyState) emptyState.style.display = "none";

    const totalItems = filteredDishes.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * itemsPerPage;
    const end = Math.min(start + itemsPerPage, totalItems);
    const pageItems = filteredDishes.slice(start, end);

    pageItems.forEach(dish => {
        const isSelected = (!isCreateMode && dish.id === selectedDishId);
        const tr = document.createElement("tr");
        if (isSelected) tr.classList.add("selected-row");

        tr.onclick = (e) => {
            if (e.target.closest('button') || e.target.closest('.badge-status')) return;
            selectDish(dish.id);
        };

        tr.innerHTML = `
      <td>
        <img src="${dish.image}" alt="${dish.name}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover;" onerror="this.src='/images/thumb_suon.jpg';">
      </td>
      <td>
        <div style="font-weight: 700; color: #431407;">${dish.name}</div>
        <small style="color: #78716c;">${dish.id}</small>
      </td>
      <td><span class="food-category-tag">${dish.category}</span></td>
      <td><strong style="color: #7c2d12;">${formatVND(dish.price)}</strong></td>
      <td>
        <button type="button" class="badge-status ${dish.available ? 'badge-available' : 'badge-out-of-stock'}" onclick="quickToggleStatus(${dish.rawId}, event)" style="cursor: pointer; border: none;">
          ${dish.available ? '🟢 Còn món' : '⚠️ Hết món'}
        </button>
      </td>
      <td>
        <button type="button"
                class="badge-status ${dish.visible ? 'badge-visible' : 'badge-hidden'}" 
                onclick="quickToggleVisibility(${dish.rawId}, event)" 
                style="cursor: pointer; border: none; font-size: 12px; font-weight: 600; padding: 4px 8px; border-radius: 6px; background: ${dish.visible ? '#ecfdf5' : '#fef2f2'}; color: ${dish.visible ? '#059669' : '#dc2626'};">
          ${dish.visible ? '👁️ Đang hiện' : '🔒 Đang ẩn'}
        </button>
      </td>
      <td style="text-align: right;">
        <button type="button" class="btn-secondary" style="padding: 4px 8px; font-size: 12px;" onclick="selectDish('${dish.id}')">Sửa</button>
      </td>
    `;
        tbody.appendChild(tr);
    });

    const pInfo = document.getElementById("paginationInfo");
    if (pInfo) pInfo.textContent = `Hiển thị ${start + 1} - ${end} trên ${totalItems} món ăn`;

    renderPagination(totalPages);
}

function renderPagination(totalPages) {
    const container = document.getElementById("paginationControls");
    if (!container) return;
    container.innerHTML = "";
    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { currentPage = i; renderTable(); };
        container.appendChild(btn);
    }
}

// 5. Chọn món để sửa
function selectDish(id) {
    isCreateMode = false;
    selectedDishId = id;
    const dish = dishes.find(d => d.id === id);
    if (!dish) return;

    document.getElementById("rightPanelTitle").textContent = "CHỈNH SỬA MÓN ĂN";
    document.getElementById("rightPanelSubtitle").textContent = "Chỉnh sửa thông số món được chọn";
    document.getElementById("saveBtnText").textContent = "Lưu thay đổi";

    document.getElementById("formDishId").value = dish.id;
    document.getElementById("formDishName").value = dish.name;
    document.getElementById("formDishCategory").value = dish.category;
    document.getElementById("formDishPrice").value = dish.price;
    document.getElementById("formDishDesc").value = dish.desc || "";
    document.getElementById("formImgPreview").src = dish.image;
    document.getElementById("formSwitchAvailable").checked = dish.available;
    document.getElementById("formSwitchVisible").checked = dish.visible;

    const btnDel = document.getElementById("btnDeleteDish");
    if (btnDel) btnDel.style.display = "inline-flex";

    const rows = document.querySelectorAll("#dishTableBody tr");
    rows.forEach(r => r.classList.remove("selected-row"));
}

// 6. Chuyển sang form Thêm món
window.triggerAddNewDish = function () {
    isCreateMode = true;
    selectedDishId = null;

    document.getElementById("rightPanelTitle").textContent = "THÊM MÓN ĂN MỚI";
    document.getElementById("rightPanelSubtitle").textContent = "Nhập thông tin món mới vào SQL Server";
    document.getElementById("saveBtnText").textContent = "+ Tạo món mới";

    document.getElementById("formDishId").value = "Tự động sinh (DB)";
    document.getElementById("formDishName").value = "";
    document.getElementById("formDishPrice").value = 40000;
    document.getElementById("formDishDesc").value = "";
    document.getElementById("formImgPreview").src = "/images/thumb_suon.jpg";
    document.getElementById("formSwitchAvailable").checked = true;
    document.getElementById("formSwitchVisible").checked = true;

    const btnDel = document.getElementById("btnDeleteDish");
    if (btnDel) btnDel.style.display = "none";

    document.getElementById("formDishName").focus();
};

// 7. Lưu món ăn (Thêm / Sửa vào Database)
window.handleSaveDish = async function () {
    const name = document.getElementById("formDishName").value.trim();
    const category = document.getElementById("formDishCategory").value;
    const price = parseFloat(document.getElementById("formDishPrice").value) || 0;
    const desc = document.getElementById("formDishDesc").value.trim();
    const available = document.getElementById("formSwitchAvailable").checked;

    // Lấy link ảnh từ thuộc tính hoặc src
    const previewImg = document.getElementById("formImgPreview");
    let image = previewImg.getAttribute("data-custom-url") || previewImg.getAttribute("src") || previewImg.src;

    // Nếu là link nội bộ bị dính tiền tố localhost thì rút gọn lại /images/...
    if (image.includes(window.location.origin)) {
        image = image.replace(window.location.origin, "");
    }

    if (!name) {
        alert("Vui lòng nhập tên món ăn!");
        return;
    }

    let rawId = 0;
    if (!isCreateMode && selectedDishId) {
        const current = dishes.find(d => d.id === selectedDishId);
        if (current) rawId = current.rawId;
    }

    try {
        const res = await fetch('/admin/api/products/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: rawId,
                name: name,
                category: category,
                price: price,
                desc: desc,
                image: image, // Gửi link ảnh mới lên Controller để ghi vào Database
                available: available
            })
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message);
            await fetchDishesFromDb(); // Tải lại bảng Admin ngay lập tức
        } else {
            alert("Lỗi: " + result.message);
        }
    } catch (err) {
        console.error("Lỗi khi lưu món:", err);
    }
};

// 8. Đổi nhanh trạng thái Còn / Hết món
window.quickToggleStatus = async function (rawId, event) {
    if (event) event.stopPropagation();
    try {
        const res = await fetch(`/admin/api/products/toggle-status/${rawId}`, { method: 'POST' });
        if (res.ok) {
            await fetchDishesFromDb();
        }
    } catch (err) {
        console.error("Lỗi đổi trạng thái:", err);
    }
};

// Đổi trạng thái Ẩn / Hiện trên Website (Không dùng database)
window.quickToggleVisibility = function (rawId, event) {
    if (event) event.stopPropagation();

    let hiddenIds = JSON.parse(localStorage.getItem("HIDDEN_DISH_IDS") || "[]");

    if (hiddenIds.includes(rawId)) {
        // Nếu đang ẩn thì gỡ ra để hiện lại
        hiddenIds = hiddenIds.filter(id => id !== rawId);
    } else {
        // Nếu đang hiện thì thêm vào danh sách ẩn
        hiddenIds.push(rawId);
    }

    // Lưu lại vào trình duyệt
    localStorage.setItem("HIDDEN_DISH_IDS", JSON.stringify(hiddenIds));

    // Cập nhật lại giao diện Admin ngay lập tức
    const dish = dishes.find(d => d.rawId === rawId);
    if (dish) {
        dish.visible = !dish.visible;
        renderKPIs();
        renderTable();
        if (selectedDishId === dish.id) {
            document.getElementById("formSwitchVisible").checked = dish.visible;
        }
    }
};

// 9. Xóa món ăn
window.openDeleteConfirmModal = function () {
    if (!selectedDishId) return;
    const dish = dishes.find(d => d.id === selectedDishId);
    if (!dish) return;

    document.getElementById("deleteTargetDishName").textContent = dish.name;
    document.getElementById("deleteConfirmModal").classList.add("active");
};

window.closeDeleteConfirmModal = function () {
    document.getElementById("deleteConfirmModal").classList.remove("active");
};

window.confirmDeleteDish = async function () {
    if (!selectedDishId) return;
    const dish = dishes.find(d => d.id === selectedDishId);
    if (!dish) return;

    try {
        const res = await fetch(`/admin/api/products/delete/${dish.rawId}`, { method: 'POST' });
        const result = await res.json();
        alert(result.message);
        closeDeleteConfirmModal();
        selectedDishId = null;
        await fetchDishesFromDb();
    } catch (err) {
        console.error("Lỗi xóa món:", err);
    }
};

// Chuyển Tab
window.switchMainTab = function (tab) {
    document.querySelectorAll(".tab-button").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-view-content").forEach(c => c.classList.remove("active"));

    if (tab === 'dishes') {
        document.getElementById("tabBtnDishes").classList.add("active");
        document.getElementById("tabViewDishes").classList.add("active");
    } else {
        document.getElementById("tabBtnSizes").classList.add("active");
        document.getElementById("tabViewSizes").classList.add("active");
    }
};

window.promptImageURL = function () {
    const current = document.getElementById("formImgPreview").getAttribute("src") || "";
    const url = prompt("Dán liên kết hình ảnh trực tiếp (link kết thúc bằng .jpg, .png, .webp hoặc link ảnh trực tiếp):", current);
    if (url && url.trim()) {
        const cleanUrl = url.trim();
        const previewImg = document.getElementById("formImgPreview");
        previewImg.src = cleanUrl;
        previewImg.setAttribute("data-custom-url", cleanUrl); // Lưu giữ link gốc không bị trình duyệt thêm localhost
    }
};

window.handleImageFileSelected = function (input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById("formImgPreview").src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// Khởi chạy khi DOM tải xong
window.addEventListener("DOMContentLoaded", () => {
    fetchDishesFromDb();

    const searchInput = document.getElementById("searchInput");
    const filterCat = document.getElementById("filterCategory");
    const filterStat = document.getElementById("filterStatus");

    if (searchInput) searchInput.addEventListener("input", handleSearchFilter);
    if (filterCat) filterCat.addEventListener("change", handleSearchFilter);
    if (filterStat) filterStat.addEventListener("change", handleSearchFilter);
});