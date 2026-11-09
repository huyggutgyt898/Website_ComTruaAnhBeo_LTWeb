// =========================================================================
    // 1. DỮ LIỆU CƠ SỞ DỮ LIỆU SQL SERVER (ĐẦY ĐỦ 44 MÓN ĂN, TÀI KHOẢN, ĐƠN HÀNG)
    // =========================================================================
    const STORE_INFO = {
      MaCuaHang: 1,
      TenCuaHang: "CƠM TRƯA ANH BÉO",
      Slogan: "Cùng Anh Béo thưởng thức cơm trưa nóng hổi mỗi ngày. Ghé ngay Cơm trưa Anh Béo để trải nghiệm.",
      DiaChi: "450 Lê Văn Việt, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh",
      DienThoai: "0775058143",
      NguoiDaiDien: "Mr. Khoa",
      SoZalo: "0775058143",
      LinkTikTok: "https://www.tiktok.com/@hoanghieu7258",
      ViDo: 10.844200,
      KinhDo: 106.791700
    };

    let MENU_ITEMS = [];
    let SIDE_ITEMS = [];
    let sideMenuLoadState = "idle";
    let sideMenuLoadPromise = null;
    let currentProductId = null;
    let appliedCoupon = null;
    let selectedDeliveryLocation = null;
    const SHIPPING_FEE = 20000;

    // =========================================================================
    // 2. STATE ỨNG DỤNG (GIỎ HÀNG, BỘ LỌC, TÀI KHOẢN ĐANG ĐĂNG NHẬP)
    // =========================================================================
    let cart = {};
    let checkoutStep = 1;
    let activeCategory = "ALL";
    let searchQuery = "";
    let menuLoadState = "loading";
    let currentUser = null;
    let authRequestInProgress = false;
    let registrationChallengeId = null;
    let registrationCooldownTimer = null;

    // Định dạng tiền VNĐ
    function formatVND(amount) {
      return Number(amount || 0).toLocaleString("vi-VN") + "đ";
    }

    // Hiển thị Toast
    let toastTimer = null;
    function showToast(msg) {
      const toast = document.getElementById("toastNotification");
      const text = document.getElementById("toastMessageText");
      text.textContent = msg;
      toast.classList.remove("hidden");
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.add("hidden");
      }, 3200);
    }

    // =========================================================================
    // 4. TẢI VÀ RENDER THỰC ĐƠN MÓN CHÍNH
    // =========================================================================
    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[character]);
    }

    function renderCategoryFilters() {
      const filterBar = document.getElementById("categoryFilterBar");
      const categories = [...new Set(MENU_ITEMS.map(item => item.catId))]
        .sort((left, right) => left.localeCompare(right, "vi"));
      const totalCount = MENU_ITEMS.length;

      document.getElementById("menuItemCount").textContent =
        `${totalCount} món chính đang phục vụ`;
      const allSelectedClass = activeCategory === "ALL"
        ? "font-extrabold bg-plt-brown text-plt-gold shadow-sm"
        : "font-bold bg-stone-100 text-stone-700 hover:bg-amber-100";
      filterBar.innerHTML = `
        <button type="button" data-cat="ALL" class="cat-filter-btn px-4 py-2 rounded-xl text-xs sm:text-sm ${allSelectedClass} transition">
          Tất cả (${totalCount})
        </button>
        ${categories.map(category => {
          const count = MENU_ITEMS.filter(item => item.catId === category).length;
          const selectedClass = activeCategory === category
            ? "font-extrabold bg-plt-brown text-plt-gold shadow-sm"
            : "font-bold bg-stone-100 text-stone-700 hover:bg-amber-100";
          return `
            <button type="button" data-cat="${escapeHtml(category)}" class="cat-filter-btn px-4 py-2 rounded-xl text-xs sm:text-sm ${selectedClass} transition">
              ${escapeHtml(category)} (${count})
            </button>
          `;
        }).join("")}
      `;
    }

    async function loadMenuItems() {
      menuLoadState = "loading";
      renderMenuGrid();

      try {
        const response = await fetch("/api/menu", {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error(`Tải thực đơn thất bại (HTTP ${response.status}).`);
        }

        const dishes = await response.json();
        if (!Array.isArray(dishes)) {
          throw new Error("Dữ liệu thực đơn không hợp lệ.");
        }

        MENU_ITEMS = dishes.map(dish => ({
          id: Number(dish.id),
          catId: String(dish.category || "Khác"),
          name: String(dish.name || ""),
          desc: String(dish.description || ""),
          img: String(dish.imageUrl || ""),
          price: Number(dish.price),
          totalOrdered: Number(dish.totalOrdered || 0),
          popularRank: Number(dish.popularRank) || null,
          unit: "Phần"
        }));
        menuLoadState = "loaded";
        renderCategoryFilters();
        renderMenuGrid();
      } catch (error) {
        console.error("Không thể tải thực đơn món chính từ database:", error);
        menuLoadState = "error";
        document.getElementById("menuItemCount").textContent = "Không tải được thực đơn";
        document.getElementById("categoryFilterBar").innerHTML =
          '<span class="text-sm text-red-700" role="status">Không tải được danh mục món chính.</span>';
        renderMenuGrid();
      }
    }

    async function loadSideItems() {
      if (sideMenuLoadState === "loaded") return;
      if (sideMenuLoadPromise) return sideMenuLoadPromise;

      sideMenuLoadState = "loading";
      renderProductDetail();
      sideMenuLoadPromise = (async () => {
        try {
          const response = await fetch("/api/menu/extras", {
            headers: { Accept: "application/json" },
            cache: "no-store"
          });
          if (!response.ok) {
            throw new Error(`Tải món ăn kèm thất bại (HTTP ${response.status}).`);
          }

          const dishes = await response.json();
          if (!Array.isArray(dishes)) {
            throw new Error("Dữ liệu món ăn kèm không hợp lệ.");
          }

          SIDE_ITEMS = dishes.map(dish => ({
            id: Number(dish.id),
            catId: String(dish.category || "Món ăn kèm"),
            name: String(dish.name || ""),
            desc: String(dish.description || ""),
            img: String(dish.imageUrl || ""),
            price: Number(dish.price),
            unit: "Phần"
          }));
          sideMenuLoadState = "loaded";
        } catch (error) {
          console.error("Không thể tải món ăn kèm từ database:", error);
          sideMenuLoadState = "error";
          throw error;
        } finally {
          sideMenuLoadPromise = null;
          renderProductDetail();
        }
      })();

      return sideMenuLoadPromise;
    }

    function findDishById(id) {
      return MENU_ITEMS.find(item => item.id === id) || SIDE_ITEMS.find(item => item.id === id);
    }

    function addDishToCart(id) {
      const dish = findDishById(id);
      if (!dish) return;

      cart[id] = (cart[id] || 0) + 1;
      renderMenuGrid();
      updateCartAndCheckoutUI();
      renderProductDetail();
      showToast(`Đã thêm "${dish.name}" vào giỏ hàng.`);
    }

    function renderProductDetail() {
      const container = document.getElementById("productDetailContent");
      const dish = MENU_ITEMS.find(item => item.id === currentProductId);
      if (!container || !dish) return;

      const fallbackImage = "/images/card_menu.jpg";
      const sideContent = sideMenuLoadState === "loading" || sideMenuLoadState === "idle"
        ? `<p class="sm:col-span-2 lg:col-span-3 rounded-xl bg-stone-50 p-5 text-center text-sm text-stone-600" role="status">Đang tải món ăn kèm...</p>`
        : sideMenuLoadState === "error"
          ? `<div class="sm:col-span-2 lg:col-span-3 rounded-xl border border-red-200 bg-red-50 p-5 text-center text-sm text-red-700" role="alert">
              Không tải được món ăn kèm. <button type="button" class="btn-retry-side-menu font-bold underline">Thử lại</button>
            </div>`
          : SIDE_ITEMS.length === 0
            ? `<p class="sm:col-span-2 lg:col-span-3 rounded-xl bg-stone-50 p-5 text-center text-sm text-stone-600">Hiện chưa có món ăn kèm.</p>`
            : SIDE_ITEMS.map(item => `
                <article class="overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <img src="${escapeHtml(item.img || fallbackImage)}" alt="${escapeHtml(item.name)}"
                       onerror="this.onerror=null;this.src='${fallbackImage}'"
                       class="h-36 w-full bg-stone-100 object-cover" />
                  <div class="space-y-2 p-3.5">
                    <h4 class="font-brand font-extrabold text-sm text-plt-brown">${escapeHtml(item.name)}</h4>
                    <p class="line-clamp-2 min-h-8 text-xs text-stone-500">${escapeHtml(item.desc)}</p>
                    <div class="flex items-center justify-between gap-2">
                      <strong class="text-sm text-plt-brown">${formatVND(item.price)}</strong>
                      <button type="button" data-add-side="${item.id}"
                              class="rounded-lg bg-plt-brown px-3 py-2 text-xs font-bold text-plt-gold hover:bg-amber-900">
                        + Thêm món
                      </button>
                    </div>
                  </div>
                </article>
              `).join("");

      container.innerHTML = `
        <div class="mb-5">
          <button type="button" id="btnBackToMenuFromProduct" class="text-sm font-bold text-plt-brown hover:underline">← Quay lại thực đơn</button>
        </div>
        <article class="grid grid-cols-1 gap-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6 lg:grid-cols-2 lg:gap-8">
          <img src="${escapeHtml(dish.img || fallbackImage)}" alt="${escapeHtml(dish.name)}"
               onerror="this.onerror=null;this.src='${fallbackImage}'"
               class="aspect-[4/3] w-full rounded-xl bg-stone-100 object-cover" />
          <div class="flex flex-col justify-center">
            <p class="text-xs font-extrabold uppercase tracking-widest text-amber-700">${escapeHtml(dish.catId)}</p>
            <h1 class="mt-2 font-brand text-2xl font-black text-plt-brown sm:text-3xl">${escapeHtml(dish.name)}</h1>
            <p class="mt-4 whitespace-pre-line text-sm leading-7 text-stone-600">${escapeHtml(dish.desc || "Món ăn được chuẩn bị tươi ngon mỗi ngày.")}</p>
            <strong class="mt-5 text-2xl font-black text-plt-brown">${formatVND(dish.price)}</strong>
            <button type="button" data-add-detail="${dish.id}"
                    class="mt-5 w-full rounded-xl bg-plt-brown px-5 py-3.5 font-brand text-sm font-extrabold uppercase text-plt-gold shadow hover:bg-amber-900 sm:w-fit">
              + Thêm vào giỏ
            </button>
          </div>
        </article>
        <section class="mt-8">
          <div class="mb-4">
            <h2 class="font-brand text-xl font-black uppercase text-plt-brown">Món ăn kèm</h2>
            <p class="mt-1 text-sm text-stone-600">Chọn thêm món phụ để dùng cùng món chính.</p>
          </div>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">${sideContent}</div>
        </section>
      `;
    }

    async function openProductDetail(id) {
      currentProductId = id;
      renderProductDetail();
      switchView("product-detail");
      try {
        await loadSideItems();
      } catch {
        showToast("Không thể tải danh sách món ăn kèm. Vui lòng thử lại.");
      }
    }

    function renderMenuGrid() {
      const container = document.getElementById("menuGridContainer");
      if (menuLoadState === "loading") {
        container.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-10 text-center border border-stone-200" role="status">
            <div class="font-brand font-bold text-lg text-plt-brown">Đang tải thực đơn món chính...</div>
          </div>
        `;
        return;
      }
      if (menuLoadState === "error") {
        container.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-10 text-center border border-stone-200" role="alert">
            <div class="font-brand font-bold text-lg text-plt-brown">Không thể tải thực đơn</div>
            <p class="text-sm text-stone-600 mt-2">Vui lòng thử lại sau.</p>
            <button type="button" class="btn-retry-menu mt-4 px-4 py-2 rounded-xl bg-plt-brown text-plt-gold font-bold">Thử lại</button>
          </div>
        `;
        return;
      }

      const q = searchQuery.trim().toLowerCase();

      const filtered = MENU_ITEMS.filter(item => {
        const matchCat = (activeCategory === "ALL") || (String(item.catId) === String(activeCategory));
        const matchQuery = !q || item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
        return matchCat && matchQuery;
      });

      if (filtered.length === 0) {
        const isEmptyMenu = MENU_ITEMS.length === 0;
        container.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-10 text-center border border-stone-200">
            <div class="text-4xl mb-2">🍚</div>
            <div class="font-brand font-bold text-lg text-plt-brown">${isEmptyMenu ? "Hiện chưa có món chính nào đang phục vụ" : "Không tìm thấy món chính phù hợp"}</div>
            <p class="text-xs text-stone-500 mt-1">${isEmptyMenu ? "Vui lòng quay lại sau." : "Hãy thử từ khóa khác hoặc chọn tất cả món chính."}</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(item => {
        const inCartQty = cart[item.id] || 0;
        const fallbackImage = "/images/card_menu.jpg";
        return `
          <div class="dish-card bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <button type="button" data-open-product="${item.id}" aria-label="Xem chi tiết ${escapeHtml(item.name)}"
                      class="group relative block h-44 w-full overflow-hidden bg-stone-100 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-plt-brown">
                <img src="${escapeHtml(item.img || fallbackImage)}"
                     data-fallback="${escapeHtml(fallbackImage)}"
                     alt="${escapeHtml(item.name)}"
                     onerror="this.onerror=null;this.src=this.dataset.fallback"
                     class="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                <span class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span class="px-2.5 py-0.5 rounded-full bg-plt-brown/90 text-plt-gold font-extrabold text-[11px] shadow">
                    #${item.id}
                  </span>
                  ${item.popularRank ? `
                    <span class="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-950 font-extrabold text-[11px] shadow" title="Đã đặt ${item.totalOrdered} phần">
                      🔥 Bán chạy #${item.popularRank}
                    </span>
                  ` : ""}
                </span>
                <span class="absolute bottom-2 right-2 px-3 py-1 rounded-xl bg-plt-gold text-amber-950 font-brand font-black text-sm shadow-md border border-amber-950/15">
                  ${formatVND(item.price)}${item.unit === 'Viên' ? '/viên' : item.unit === 'Chai' ? '/chai' : ''}
                </span>
              </button>
              <div class="p-4 space-y-1.5">
                <h3 class="font-brand font-extrabold text-sm sm:text-base text-plt-brown leading-snug line-clamp-2" title="${escapeHtml(item.name)}">
                  ${escapeHtml(item.name)}
                </h3>
                <p class="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  ${escapeHtml(item.desc)}
                </p>
              </div>
            </div>

            <div class="px-4 pb-4 pt-1">
              <button type="button" data-add-cart="${item.id}"
                      class="btn-add-cart w-full rounded-xl bg-amber-100 px-3 py-2.5 text-xs font-extrabold text-plt-brown transition hover:bg-plt-gold border border-amber-300">
                + Thêm vào giỏ ${inCartQty > 0 ? `(${inCartQty})` : ``}
              </button>
            </div>
          </div>
        `;
      }).join("");
    }

    // =========================================================================
    // 5. CẬP NHẬT GIỎ HÀNG & BẢNG TÍNH TỔNG BILL
    // =========================================================================
    function calculateCouponDiscount(subtotal, shippingFee = SHIPPING_FEE) {
      if (!appliedCoupon || subtotal < Number(appliedCoupon.minOrderValue || 0)) return 0;

      const discountBase = appliedCoupon.appliesToShipping ? shippingFee : subtotal;
      const rawDiscount = appliedCoupon.discountType === "PERCENT"
        ? Math.floor(discountBase * Number(appliedCoupon.discountValue) / 100)
        : Number(appliedCoupon.discountValue);
      const cappedDiscount = Number(appliedCoupon.maxDiscount) > 0
        ? Math.min(rawDiscount, Number(appliedCoupon.maxDiscount))
        : rawDiscount;
      return Math.max(0, Math.min(discountBase, cappedDiscount));
    }

    async function applyCoupon() {
      const code = document.getElementById("couponCodeInput").value.trim().toUpperCase();
      const phone = document.getElementById("orderPhone").value.trim();
      const { subtotal } = getCartSummary();
      if (!code) throw new Error("Vui lòng nhập mã giảm giá.");

      const response = await fetch("/api/promotions/validate", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ code, phone, subtotal }),
        cache: "no-store"
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message || `Không thể kiểm tra mã giảm giá (HTTP ${response.status}).`);
      }

      appliedCoupon = result;
      document.getElementById("couponCodeInput").value = result.code;
      document.getElementById("couponStatus").textContent = `Đã áp dụng mã ${result.code}.`;
      updateCartAndCheckoutUI();
      return result;
    }

    async function refreshAppliedCoupon() {
      const code = document.getElementById("couponCodeInput").value.trim();
      if (!code) {
        appliedCoupon = null;
        return null;
      }
      if (!appliedCoupon || code.toUpperCase() !== appliedCoupon.code.toUpperCase()) {
        throw new Error("Vui lòng bấm Áp dụng để kiểm tra mã giảm giá.");
      }
      try {
        return await applyCoupon();
      } catch (error) {
        appliedCoupon = null;
        document.getElementById("couponStatus").textContent = error.message;
        updateCartAndCheckoutUI();
        throw error;
      }
    }

    function getCartSummary() {
      let totalQty = 0;
      let subtotal = 0;
      const detailedItems = [];

      Object.keys(cart).forEach(idStr => {
        const qty = cart[idStr];
        if (qty > 0) {
          const dish = findDishById(Number(idStr));
          if (dish) {
            totalQty += qty;
            const lineTotal = dish.price * qty;
            subtotal += lineTotal;
            detailedItems.push({ ...dish, qty, lineTotal });
          }
        }
      });

      return { totalQty, subtotal, detailedItems };
    }

    function setCheckoutStep(step) {
      checkoutStep = step;
      document.getElementById("customerStepPanel").classList.toggle("hidden", step !== 1);
      document.getElementById("orderDetailsStepPanel").classList.toggle("hidden", step !== 2);
      document.getElementById("paymentStepPanel").classList.toggle("hidden", step !== 3);

      [1, 2, 3].forEach(number => {
        const badge = document.getElementById(`stepBadge${number}`);
        badge.className = number === step
          ? "rounded-md bg-plt-brown px-2 py-2 text-plt-gold"
          : number < step
            ? "rounded-md bg-amber-100 px-2 py-2 text-amber-900"
            : "rounded-md px-2 py-2 text-stone-600";
      });
    }

    function updateCartAndCheckoutUI() {
      const { totalQty, subtotal, detailedItems } = getCartSummary();

      // Badge trên Header & Sticky bar
      document.getElementById("cartCountBadge").textContent = totalQty;
      document.getElementById("stickyCartCount").textContent = `${totalQty} món`;
      document.getElementById("stickyCartTotal").textContent = formatVND(subtotal);
      document.getElementById("checkoutItemCount").textContent = `${totalQty} món`;
      document.getElementById("cartCountBadge").setAttribute("aria-label", `${totalQty} món trong giỏ`);
      const shippingFee = totalQty > 0 ? SHIPPING_FEE : 0;
      const discount = calculateCouponDiscount(subtotal, shippingFee);
      const grandTotal = subtotal + shippingFee - discount;
      if (appliedCoupon) {
        const couponStatus = document.getElementById("couponStatus");
        couponStatus.textContent = totalQty === 0
          ? "Thêm món vào giỏ để tiếp tục áp dụng mã."
          : subtotal < Number(appliedCoupon.minOrderValue || 0)
            ? `Đơn hàng cần đạt tối thiểu ${formatVND(appliedCoupon.minOrderValue)} để dùng mã này.`
            : `Đã áp dụng mã ${appliedCoupon.code}.`;
      }

      // Danh sách món ăn trong giao diện Đặt hàng
      const listEl = document.getElementById("checkoutCartItemsList");
      if (detailedItems.length === 0) {
        listEl.innerHTML = `
          <div class="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-stone-300 space-y-2">
            <div class="text-2xl">🍱</div>
            <div class="text-xs font-bold text-stone-700">Chưa có món ăn nào trong đơn đặt hàng</div>
            <button type="button" id="btnEmptyCartGoMenu" class="px-3.5 py-1.5 rounded-lg bg-plt-gold text-amber-950 font-bold text-xs">
              + Chọn món từ Thực đơn
            </button>
          </div>
        `;
      } else {
        listEl.innerHTML = detailedItems.map(item => `
          <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-50 border border-stone-200">
            <img src="${escapeHtml(item.img || "/images/card_menu.jpg")}" alt="${escapeHtml(item.name)}" class="w-14 h-14 rounded-lg object-cover shrink-0 border border-stone-200" />
            <div class="flex-grow min-w-0">
              <div class="font-bold text-xs sm:text-sm text-stone-900 truncate" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
              <div class="text-xs text-stone-500">${formatVND(item.price)} × ${item.qty} = <strong class="text-plt-brown">${formatVND(item.lineTotal)}</strong></div>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              <button type="button" data-qty-change="${item.id}|-1" class="btn-qty-change w-7 h-7 rounded-lg bg-white border border-stone-300 hover:bg-stone-200 font-bold text-sm flex items-center justify-center">−</button>
              <span class="w-6 text-center font-extrabold text-xs">${item.qty}</span>
              <button type="button" data-qty-change="${item.id}|1" class="btn-qty-change w-7 h-7 rounded-lg bg-plt-brown text-plt-gold hover:bg-amber-900 font-bold text-sm flex items-center justify-center">+</button>
            </div>
          </div>
        `).join("");
      }

      // Cập nhật bảng tổng kết bên phải
      document.getElementById("summarySubtotal").textContent = formatVND(subtotal);
      document.getElementById("summaryShippingFee").textContent = formatVND(shippingFee);
      document.getElementById("summaryDiscount").textContent = discount > 0 ? `-${formatVND(discount)}` : "0đ";
      document.getElementById("summaryGrandTotal").textContent = formatVND(grandTotal);

      document.getElementById("reviewName").textContent =
        document.getElementById("orderFullName").value.trim() || "--";
      document.getElementById("reviewPhone").textContent =
        document.getElementById("orderPhone").value.trim() || "--";
      document.getElementById("reviewEmail").textContent =
        document.getElementById("orderEmail").value.trim() || "Không cung cấp";
      document.getElementById("reviewAddress").textContent =
        document.getElementById("orderAddress").value.trim() || "--";
      document.getElementById("reviewNote").textContent =
        document.getElementById("orderNote").value.trim() || "Không có";
      document.getElementById("btnConfirmOrderStep1").disabled = totalQty === 0;
      document.getElementById("btnProceedToPayment").disabled = totalQty === 0;
      document.getElementById("btnCompletePaymentFinal").disabled = totalQty === 0;
    }

    // =========================================================================
    // 6. CHUYỂN ĐỔI VIEW / TAB TRONG TRANG WEB
    // =========================================================================
    function switchView(viewName, scrollToMenu = false) {
      const actualView = viewName === "menu" ? "home" : viewName;
      const checkoutWasHidden = document.getElementById("view-checkout").classList.contains("hidden");
      const views = ["home", "product-detail", "checkout", "coupon", "reviews"];
      views.forEach(v => {
        const el = document.getElementById(`view-${v}`);
        if (el) {
          if (v === actualView) {
            el.classList.remove("hidden");
          } else {
            el.classList.add("hidden");
          }
        }
      });

      // Highlight nav button
      document.querySelectorAll(".nav-tab-btn").forEach(btn => {
        const target = btn.getAttribute("data-nav");
        if (target === viewName) {
          btn.classList.add("text-plt-gold", "border-plt-gold");
          btn.classList.remove("text-white", "border-transparent");
        } else {
          btn.classList.remove("text-plt-gold", "border-plt-gold");
          btn.classList.add("text-white", "border-transparent");
        }
      });

      // Đóng mobile menu nếu đang mở
      document.getElementById("mobileNavMenu").classList.add("hidden");
      document.getElementById("floatingContactLinks").classList.toggle("hidden", actualView === "checkout");

      if (viewName === "reviews") {
        setTimeout(() => {
          document.getElementById("view-reviews").scrollIntoView({ behavior: "smooth" });
        }, 60);
      } else if (viewName === "coupon") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (viewName === "menu" || scrollToMenu) {
        setTimeout(() => {
          const menuAnchor = document.getElementById("menuSectionAnchor");
          if (menuAnchor) menuAnchor.scrollIntoView({ behavior: "smooth" });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      if (actualView === "checkout") {
        if (checkoutWasHidden) {
          setCheckoutStep(1);
          document.getElementById("orderPlacedPanel").classList.add("hidden");
          document.getElementById("checkoutSummary").classList.remove("hidden");
        }
        updateCartAndCheckoutUI();
      }
    }

    // =========================================================================
    // 9. KHỞI TẠO SỰ KIỆN TƯƠNG TÁC
    // =========================================================================
    function initializeStorefront() {
      // Render thực đơn & giỏ hàng ban đầu
      renderMenuGrid();
      loadMenuItems();
      updateCartAndCheckoutUI();

      setCheckoutStep(1);

      // 1. Sự kiện thanh điều hướng Header & Footer
      document.getElementById("btnLogoHome").addEventListener("click", () => switchView("home"));
      document.getElementById("btnMobileMenu").addEventListener("click", () => {
        document.getElementById("mobileNavMenu").classList.toggle("hidden");
      });

      document.querySelectorAll(".nav-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const target = btn.getAttribute("data-nav");
          switchView(target, target === "menu");
        });
      });

      document.querySelectorAll("[data-copy-promotion]").forEach(button => {
        button.addEventListener("click", async () => {
          const code = button.getAttribute("data-copy-promotion");
          try {
            await navigator.clipboard.writeText(code);
            showToast(`Đã sao chép mã mẫu ${code}.`);
          } catch {
            showToast("Không thể sao chép mã. Vui lòng thử lại hoặc sao chép thủ công.");
          }
        });
      });

      // 2. Giỏ hàng trên Header mở thẳng quy trình đặt hàng.
      document.getElementById("btnHeaderCart").addEventListener("click", () => {
        switchView("checkout");
      });

      document.getElementById("btnHeroWatchMenu").addEventListener("click", () => {
        switchView("menu", true);
      });

      // 3. Lọc danh mục & Tìm kiếm món ăn
      document.getElementById("categoryFilterBar").addEventListener("click", event => {
        const filterButton = event.target.closest(".cat-filter-btn");
        if (!filterButton) return;

        activeCategory = filterButton.getAttribute("data-cat");
        renderCategoryFilters();
        renderMenuGrid();
      });

      document.getElementById("inputSearchMenu").addEventListener("input", (e) => {
        searchQuery = e.target.value || "";
        renderMenuGrid();
      });

      // 4. Mở chi tiết món từ ảnh hoặc thêm món trực tiếp vào giỏ.
      document.getElementById("menuGridContainer").addEventListener("click", (e) => {
        if (e.target.closest(".btn-retry-menu")) {
          loadMenuItems();
          return;
        }

        const detailButton = e.target.closest("[data-open-product]");
        if (detailButton) {
          openProductDetail(Number(detailButton.getAttribute("data-open-product")));
          return;
        }

        const addBtn = e.target.closest(".btn-add-cart");
        if (addBtn) {
          addDishToCart(Number(addBtn.getAttribute("data-add-cart")));
        }
      });

      document.getElementById("productDetailContent").addEventListener("click", event => {
        const backButton = event.target.closest("#btnBackToMenuFromProduct");
        if (backButton) {
          switchView("menu", true);
          return;
        }

        const retryButton = event.target.closest(".btn-retry-side-menu");
        if (retryButton) {
          sideMenuLoadState = "idle";
          loadSideItems().catch(() => {
            showToast("Không thể tải danh sách món ăn kèm. Vui lòng thử lại.");
          });
          return;
        }

        const addButton = event.target.closest("[data-add-side], [data-add-detail]");
        if (addButton) {
          addDishToCart(Number(addButton.getAttribute("data-add-side") || addButton.getAttribute("data-add-detail")));
        }
      });

      document.getElementById("btnStickyGoCheckout").addEventListener("click", () => {
        switchView("checkout");
      });

      document.getElementById("btnBackToMenuFromCheckout").addEventListener("click", () => {
        switchView("menu", true);
      });

      // 5. Tăng giảm số lượng món trong trang Đặt hàng
      document.getElementById("checkoutCartItemsList").addEventListener("click", (e) => {
        const goMenuBtn = e.target.closest("#btnEmptyCartGoMenu");
        if (goMenuBtn) {
          switchView("menu", true);
          return;
        }
        const qtyBtn = e.target.closest(".btn-qty-change");
        if (qtyBtn) {
          const [idStr, deltaStr] = qtyBtn.getAttribute("data-qty-change").split("|");
          const dishId = Number(idStr);
          const delta = Number(deltaStr);
          const nextQty = (cart[dishId] || 0) + delta;
          if (nextQty <= 0) {
            delete cart[dishId];
          } else {
            cart[dishId] = nextQty;
          }
          renderMenuGrid();
          updateCartAndCheckoutUI();
        }
      });

      document.getElementById("btnClearCart").addEventListener("click", () => {
        cart = {};
        renderMenuGrid();
        updateCartAndCheckoutUI();
        showToast("🗑️ Đã làm trống giỏ hàng.");
      });

      document.getElementById("orderAddress").addEventListener("input", event => {
        if (selectedDeliveryLocation && event.target.value.trim() !== "Vị trí hiện tại") {
          selectedDeliveryLocation = null;
          document.getElementById("deliveryLocationStatus").textContent =
            "Đã chuyển sang nhập địa chỉ thủ công.";
        }
        updateCartAndCheckoutUI();
      });

      ["orderFullName", "orderPhone", "orderEmail"].forEach(id => {
        document.getElementById(id).addEventListener("input", () => {
          if (id === "orderPhone" && appliedCoupon) {
            appliedCoupon = null;
            document.getElementById("couponStatus").textContent =
              "Số điện thoại đã thay đổi. Hãy áp dụng lại mã giảm giá.";
          }
          updateCartAndCheckoutUI();
        });
      });
      document.getElementById("orderNote").addEventListener("input", updateCartAndCheckoutUI);

      document.getElementById("btnUseCurrentLocation").addEventListener("click", event => {
        const button = event.currentTarget;
        const status = document.getElementById("deliveryLocationStatus");
        if (!navigator.geolocation) {
          status.textContent = "Trình duyệt này không hỗ trợ lấy vị trí. Vui lòng nhập địa chỉ.";
          return;
        }

        button.disabled = true;
        status.textContent = "Đang lấy vị trí hiện tại...";
        navigator.geolocation.getCurrentPosition(
          position => {
            selectedDeliveryLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            document.getElementById("orderAddress").value = "Vị trí hiện tại";
            status.textContent = `Đã chọn vị trí hiện tại (${selectedDeliveryLocation.latitude.toFixed(5)}, ${selectedDeliveryLocation.longitude.toFixed(5)}).`;
            button.disabled = false;
            updateCartAndCheckoutUI();
          },
          error => {
            const message = error.code === error.PERMISSION_DENIED
              ? "Bạn chưa cấp quyền truy cập vị trí. Vui lòng nhập địa chỉ."
              : error.code === error.TIMEOUT
                ? "Lấy vị trí quá thời gian chờ. Vui lòng thử lại hoặc nhập địa chỉ."
                : "Không lấy được vị trí hiện tại. Vui lòng nhập địa chỉ.";
            status.textContent = message;
            button.disabled = false;
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
        );
      });

      document.getElementById("couponCodeInput").addEventListener("input", event => {
        if (appliedCoupon && event.target.value.trim().toUpperCase() !== appliedCoupon.code.toUpperCase()) {
          appliedCoupon = null;
          document.getElementById("couponStatus").textContent = "Mã đã thay đổi. Bấm Áp dụng để kiểm tra.";
          updateCartAndCheckoutUI();
        }
      });

      document.getElementById("btnApplyCoupon").addEventListener("click", async event => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          await applyCoupon();
          showToast("Đã áp dụng mã giảm giá.");
        } catch (error) {
          appliedCoupon = null;
          document.getElementById("couponStatus").textContent = error.message;
          updateCartAndCheckoutUI();
          showToast(error.message);
        } finally {
          button.disabled = false;
        }
      });

      document.getElementById("btnConfirmOrderStep1").addEventListener("click", async event => {
        const error = document.getElementById("checkoutFormError");
        const nameInput = document.getElementById("orderFullName");
        const phoneInput = document.getElementById("orderPhone");
        const emailInput = document.getElementById("orderEmail");
        const addressInput = document.getElementById("orderAddress");
        const phone = phoneInput.value.replace(/\D/g, "");
        phoneInput.value = phone;

        if (getCartSummary().totalQty === 0) {
          error.textContent = "Giỏ hàng đang trống. Hãy chọn món trước khi tiếp tục.";
          return;
        }
        if (!nameInput.value.trim() || !phone || !addressInput.value.trim()) {
          error.textContent = "Vui lòng nhập họ tên, số điện thoại và địa chỉ giao hàng.";
          return;
        }
        if (!/^0\d{9}$/.test(phone)) {
          error.textContent = "Số điện thoại cần gồm 10 chữ số và bắt đầu bằng số 0.";
          phoneInput.focus();
          return;
        }
        if (emailInput.value.trim() && !emailInput.checkValidity()) {
          error.textContent = "Email chưa đúng định dạng.";
          emailInput.focus();
          return;
        }

        const button = event.currentTarget;
        button.disabled = true;
        error.textContent = "";
        try {
          await refreshAppliedCoupon();
          updateCartAndCheckoutUI();
          setCheckoutStep(2);
          document.getElementById("orderDetailsStepPanel").scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (requestError) {
          error.textContent = requestError.message;
        } finally {
          button.disabled = getCartSummary().totalQty === 0;
        }
      });

      document.getElementById("btnBackToCustomer").addEventListener("click", () => setCheckoutStep(1));
      document.getElementById("btnBackToCustomerFromReview").addEventListener("click", () => setCheckoutStep(1));
      document.getElementById("btnProceedToPayment").addEventListener("click", async event => {
        const error = document.getElementById("orderStepError");
        if (getCartSummary().totalQty === 0) {
          error.textContent = "Giỏ hàng đang trống. Hãy chọn món trước khi tiếp tục.";
          return;
        }

        const button = event.currentTarget;
        button.disabled = true;
        error.textContent = "";
        try {
          await refreshAppliedCoupon();
          updateCartAndCheckoutUI();
          setCheckoutStep(3);
          document.getElementById("paymentStepPanel").scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (requestError) {
          error.textContent = requestError.message;
        } finally {
          button.disabled = getCartSummary().totalQty === 0;
        }
      });
      document.getElementById("btnBackToOrderDetails").addEventListener("click", () => setCheckoutStep(2));

      document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener("change", () => {
          document.querySelectorAll(".payment-method-card").forEach(card => {
            card.classList.remove("border-plt-brown", "bg-amber-50");
            card.classList.add("border-stone-200", "bg-white");
          });
          radio.closest(".payment-method-card").classList.add("border-plt-brown", "bg-amber-50");
          radio.closest(".payment-method-card").classList.remove("border-stone-200", "bg-white");

          const box = document.getElementById("paymentInstructionBox");
          box.innerHTML = radio.value === "MOMO"
            ? `<strong>Thanh toán qua MoMo</strong>
               <p class="mt-1">Chuyển khoản đến số 0775058143 – Mr. Khoa. Ghi nội dung chuyển khoản là số điện thoại đặt hàng.</p>
               <p class="mt-2 text-xs text-stone-600">Đơn hàng sẽ chờ quán xác nhận thanh toán. Trang này chưa kết nối cổng thanh toán trực tuyến.</p>`
            : radio.value === "COD"
              ? `<strong>Thanh toán khi nhận hàng</strong>
                 <p class="mt-1">Vui lòng thanh toán ${formatVND(getCartSummary().subtotal + SHIPPING_FEE - calculateCouponDiscount(getCartSummary().subtotal))} trực tiếp cho tài xế khi nhận món.</p>`
              : `<strong>Ví điện tử khác</strong>
                 <p class="mt-1">Quán sẽ liên hệ để hướng dẫn thanh toán và xác nhận giao dịch. Phương thức này chưa được tự động tích hợp.</p>`;
        });
      });
      document.querySelector('input[name="paymentMethod"]:checked')?.dispatchEvent(new Event("change"));

      document.getElementById("btnCompletePaymentFinal").addEventListener("click", async event => {
        const button = event.currentTarget;
        const error = document.getElementById("paymentError");
        const { totalQty, detailedItems } = getCartSummary();
        if (totalQty === 0) {
          error.textContent = "Giỏ hàng đang trống. Hãy chọn món trước khi đặt hàng.";
          return;
        }

        button.disabled = true;
        error.textContent = "";
        try {
          await refreshAppliedCoupon();
          const request = {
            customerName: document.getElementById("orderFullName").value.trim(),
            phone: document.getElementById("orderPhone").value.replace(/\D/g, ""),
            email: document.getElementById("orderEmail").value.trim() || null,
            address: document.getElementById("orderAddress").value.trim(),
            note: document.getElementById("orderNote").value.trim() || null,
            paymentMethod: document.querySelector('input[name="paymentMethod"]:checked')?.value || "MOMO",
            couponCode: appliedCoupon?.code || null,
            latitude: selectedDeliveryLocation?.latitude ?? null,
            longitude: selectedDeliveryLocation?.longitude ?? null,
            items: detailedItems.map(item => ({ dishId: item.id, quantity: item.qty }))
          };
          const response = await fetch("/api/orders", {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify(request),
            cache: "no-store"
          });
          const result = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(result?.message || `Không thể tạo đơn hàng (HTTP ${response.status}).`);
          }

          document.getElementById("orderPlacedTrackingCode").textContent = result.trackingCode;
          document.getElementById("orderPlacedTotal").textContent = formatVND(result.total);
          document.getElementById("orderPlacedPaymentStatus").textContent = result.paymentMethod === "COD"
            ? "Đã chọn thanh toán khi nhận hàng"
            : "Đơn hàng đã ghi nhận · chờ xác nhận thanh toán";
          document.getElementById("orderPlacedPaymentNote").textContent = result.paymentMethod === "MOMO"
            ? "Hãy chuyển khoản MoMo với nội dung là số điện thoại đặt hàng. Quán sẽ xác nhận sau khi nhận được thanh toán."
            : result.paymentMethod === "WALLET"
              ? "Quán sẽ liên hệ để hướng dẫn thanh toán bằng ví điện tử và xác nhận giao dịch."
              : "Vui lòng thanh toán tiền mặt cho tài xế khi nhận món.";

          document.getElementById("customerStepPanel").classList.add("hidden");
          document.getElementById("orderDetailsStepPanel").classList.add("hidden");
          document.getElementById("paymentStepPanel").classList.add("hidden");
          document.getElementById("orderPlacedPanel").classList.remove("hidden");
          document.getElementById("checkoutSummary").classList.add("hidden");
          [1, 2, 3].forEach(number => {
            document.getElementById(`stepBadge${number}`).className =
              "rounded-md bg-emerald-100 px-2 py-2 text-emerald-900";
          });
          cart = {};
          appliedCoupon = null;
          selectedDeliveryLocation = null;
          document.getElementById("couponCodeInput").value = "";
          renderMenuGrid();
          updateCartAndCheckoutUI();
          document.getElementById("couponStatus").textContent = "Nhập mã rồi bấm Áp dụng.";
        } catch (requestError) {
          error.textContent = requestError.message;
        } finally {
          button.disabled = false;
        }
      });

      document.getElementById("btnContinueShopping").addEventListener("click", () => {
        document.getElementById("orderPlacedPanel").classList.add("hidden");
        document.getElementById("checkoutSummary").classList.remove("hidden");
        switchView("menu", true);
      });
      // 10. Đăng nhập, đăng ký và đăng xuất tài khoản khách
      const modalAuth = document.getElementById("modalAuth");
      function setAuthTab(tabName) {
        document.querySelectorAll(".auth-tab-btn").forEach(btn => {
          if (btn.getAttribute("data-authtab") === tabName) {
            btn.className = "auth-tab-btn py-2 rounded-lg bg-plt-brown text-plt-gold";
          } else {
            btn.className = "auth-tab-btn py-2 rounded-lg text-stone-600 hover:bg-stone-200";
          }
        });
        document.getElementById("formLogin").classList.toggle("hidden", tabName !== "login");
        document.getElementById("formRegister").classList.toggle("hidden", tabName !== "register");
        document.getElementById("formForgotBox").classList.toggle("hidden", tabName !== "forgot");
      }

      document.getElementById("btnHeaderAuth").addEventListener("click", () => {
        modalAuth.classList.remove("hidden");
      });
      document.getElementById("btnCloseAuthModal").addEventListener("click", () => {
        modalAuth.classList.add("hidden");
      });
      document.querySelectorAll(".auth-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => setAuthTab(btn.getAttribute("data-authtab")));
      });
      document.getElementById("btnJumpForgotFromLogin").addEventListener("click", () => {
        setAuthTab("forgot");
      });
      document.getElementById("btnBackLoginFromForgot").addEventListener("click", () => {
        setAuthTab("login");
      });

      function updateAuthHeaderState() {
        const label = document.getElementById("headerAuthLabel");
        const authButton = document.getElementById("btnHeaderAuth");
        const profileBox = document.getElementById("loggedInProfileBox");
        const authTabs = document.getElementById("authTabs");
        const loginForm = document.getElementById("formLogin");
        const registerForm = document.getElementById("formRegister");
        const forgotBox = document.getElementById("formForgotBox");
        if (currentUser) {
          const userLabel = currentUser.name.split(" ").slice(-2).join(" ");
          label.textContent = userLabel;
          authButton.setAttribute("aria-label", userLabel);
          profileBox.classList.remove("hidden");
          authTabs.classList.add("hidden");
          loginForm.classList.add("hidden");
          registerForm.classList.add("hidden");
          forgotBox.classList.add("hidden");
          document.getElementById("profileNameDisplay").textContent = currentUser.name;
          document.getElementById("profileEmailDisplay").textContent = currentUser.email;
          document.getElementById("profilePhoneDisplay").textContent = currentUser.phone;
          document.getElementById("profileRoleDisplay").textContent = currentUser.role;

          const adminLink = document.getElementById("btnGoToAdminPanel");
          if (adminLink) {
            if (currentUser.role === "Admin") {
              adminLink.classList.remove("hidden");
            } else {
              adminLink.classList.add("hidden");
            }
          }

          // Tự động điền thông tin khách vào form đặt hàng
          document.getElementById("orderFullName").value = currentUser.name;
          document.getElementById("orderPhone").value = currentUser.phone;
          document.getElementById("orderEmail").value = currentUser.email;
          document.getElementById("orderAddress").value = currentUser.address || "";
          selectedDeliveryLocation = null;
          updateCartAndCheckoutUI();
        } else {
          label.textContent = "Đăng nhập";
          authButton.setAttribute("aria-label", "Đăng nhập");
          profileBox.classList.add("hidden");
          authTabs.classList.remove("hidden");
          setAuthTab("login");
        }
      }

      async function postAuthForm(form, url) {
        return postAuthFormData(new FormData(form), url);
      }

      async function refreshFormTokens() {
        const response = await fetch("/auth/antiforgery", {
          cache: "no-store",
          credentials: "same-origin"
        });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.token) return null;

        document.querySelectorAll('input[name="__RequestVerificationToken"]').forEach(input => {
          input.value = data.token;
        });
        return data.token;
      }

      async function postAuthFormData(formData, url) {
        let response = await fetch(url, {
          method: "POST",
          body: formData,
          credentials: "same-origin"
        });
        if (!response.ok && response.status === 400) {
          const freshToken = await refreshFormTokens();
          if (freshToken) {
            formData.set("__RequestVerificationToken", freshToken);
            response = await fetch(url, {
              method: "POST",
              body: formData,
              credentials: "same-origin"
            });
          }
        }
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          const validationMessage = result?.errors
            ? Object.values(result.errors).flat()[0]
            : null;
          const responseMessage = response.headers.get("content-type")?.includes("application/json")
            ? "Không thể xử lý yêu cầu. Vui lòng thử lại."
            : `Máy chủ không trả về phản hồi hợp lệ (HTTP ${response.status}). Vui lòng thử lại sau.`;
          const error = new Error(result?.message || validationMessage || responseMessage);
          error.status = response.status;
          throw error;
        }
        return result;
      }

      async function submitAuthForm(event, url, successMessage) {
        event.preventDefault();
        if (authRequestInProgress) return;

        authRequestInProgress = true;
        const form = event.currentTarget;
        form.setAttribute("aria-busy", "true");
        try {
          const result = await postAuthForm(form, url);
          if (result.user?.role === "Admin") {
            window.location.assign("/admin");
            return;
          }

          currentUser = result.user;
          updateAuthHeaderState();
          form.reset();
          modalAuth.classList.add("hidden");
          showToast(successMessage(currentUser));
        } catch (error) {
          showToast(`❌ ${error.message}`);
        } finally {
          authRequestInProgress = false;
          form.removeAttribute("aria-busy");
        }
      }

      document.getElementById("formLogin").addEventListener("submit", (event) => {
        submitAuthForm(event, "/auth/login", (user) => `👋 Đăng nhập thành công: Xin chào ${user.name}!`);
      });

      const registrationForm = document.getElementById("formRegister");
      const registrationOtpInputs = [...document.querySelectorAll("[data-registration-otp]")];
      const registrationVerification = document.getElementById("registrationVerification");
      const registrationCodeError = document.getElementById("registrationCodeError");
      const registrationResendButton = document.getElementById("btnResendRegistrationCode");
      const registrationResendLabel = document.getElementById("registrationResendLabel");
      const registrationResendHint = document.getElementById("registrationResendHint");
      const registrationCodeButton = document.getElementById("btnRequestRegistrationCode");
      const registrationCodeButtonIcon = document.getElementById("registrationCodeButtonIcon");
      const registrationCodeButtonSpinner = document.getElementById("registrationCodeButtonSpinner");
      const registrationResendSpinner = document.getElementById("registrationResendSpinner");
      const registrationFields = ["FullName", "Phone", "Address", "Email", "Password"]
        .map(name => registrationForm.elements.namedItem(name));

      function clearRegistrationCodeError() {
        registrationCodeError.textContent = "";
        registrationOtpInputs.forEach(input => {
          input.classList.remove("border-red-500");
          input.classList.add("border-stone-400");
        });
      }

      function clearRegistrationOtp() {
        registrationOtpInputs.forEach(input => {
          input.value = "";
        });
        clearRegistrationCodeError();
      }

      function distributeRegistrationCode(value, startIndex = 0) {
        const digits = value.replace(/\D/g, "").slice(0, registrationOtpInputs.length);
        if (!digits) return;

        for (let index = startIndex; index < registrationOtpInputs.length; index += 1) {
          registrationOtpInputs[index].value = digits[index - startIndex] || "";
        }

        const nextIndex = Math.min(startIndex + digits.length, registrationOtpInputs.length - 1);
        registrationOtpInputs[nextIndex].focus();
        registrationOtpInputs[nextIndex].select();
      }

      registrationOtpInputs.forEach((input, index) => {
        input.addEventListener("input", () => {
          clearRegistrationCodeError();
          const digits = input.value.replace(/\D/g, "");
          input.value = "";
          if (index === 0 && digits.length > 1) {
            distributeRegistrationCode(digits);
          } else if (digits) {
            input.value = digits.slice(-1);
            if (index < registrationOtpInputs.length - 1) {
              registrationOtpInputs[index + 1].focus();
            }
          }
        });

        input.addEventListener("paste", event => {
          event.preventDefault();
          distributeRegistrationCode(event.clipboardData.getData("text"), index);
        });

        input.addEventListener("keydown", event => {
          if (event.key === "Backspace" && !input.value && index > 0) {
            registrationOtpInputs[index - 1].focus();
          }
          if (event.key === "ArrowLeft" && index > 0) {
            registrationOtpInputs[index - 1].focus();
          }
          if (event.key === "ArrowRight" && index < registrationOtpInputs.length - 1) {
            registrationOtpInputs[index + 1].focus();
          }
        });
      });

      function startRegistrationResendCountdown(seconds) {
        if (registrationCooldownTimer) clearInterval(registrationCooldownTimer);
        let remaining = seconds;
        registrationResendButton.disabled = true;
        registrationResendButton.classList.add("text-stone-400");
        registrationResendButton.classList.remove("text-plt-brown");

        const updateCountdown = () => {
          const minutes = Math.floor(remaining / 60);
          const remainder = String(remaining % 60).padStart(2, "0");
          if (remaining > 0) {
            registrationResendLabel.textContent = `Gửi lại sau ${minutes}:${remainder}`;
            remaining -= 1;
            return;
          }

          clearInterval(registrationCooldownTimer);
          registrationCooldownTimer = null;
          registrationResendButton.disabled = false;
          registrationResendLabel.textContent = "Gửi lại mã";
          registrationResendButton.classList.remove("text-stone-400");
          registrationResendButton.classList.add("text-plt-brown");
        };

        updateCountdown();
        registrationCooldownTimer = setInterval(updateCountdown, 1000);
      }

      function showRegistrationCodeStep(result) {
        registrationChallengeId = result.challengeId;
        registrationForm.querySelector("#registrationCodeNotice").textContent =
          `Mã 6 số đã được gửi đến ${result.email}. Mã có hiệu lực trong 10 phút.`;
        registrationFields.forEach(field => {
          field.readOnly = true;
        });
        registrationVerification.classList.remove("hidden");
        registrationCodeButton.classList.add("hidden");
        clearRegistrationOtp();
        startRegistrationResendCountdown(result.resendAfterSeconds);
        registrationOtpInputs[0].focus();
      }

      function resetRegistrationCodeStep() {
        if (registrationCooldownTimer) {
          clearInterval(registrationCooldownTimer);
          registrationCooldownTimer = null;
        }
        registrationChallengeId = null;
        registrationFields.forEach(field => {
          field.readOnly = false;
        });
        registrationCodeButton.classList.remove("hidden");
        registrationVerification.classList.add("hidden");
        registrationResendHint.textContent = "Chưa nhận được mã?";
        registrationResendButton.disabled = true;
        registrationResendLabel.textContent = "Gửi lại sau 1:00";
        clearRegistrationOtp();
      }

      registrationForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (registrationChallengeId) {
          document.getElementById("btnVerifyRegistrationCode").click();
          return;
        }
        if (authRequestInProgress) return;

        authRequestInProgress = true;
        registrationForm.setAttribute("aria-busy", "true");
        registrationCodeButton.setAttribute("aria-busy", "true");
        registrationCodeButton.setAttribute("aria-disabled", "true");
        registrationCodeButtonIcon.classList.add("hidden");
        registrationCodeButtonSpinner.classList.remove("hidden");
        try {
          const result = await postAuthForm(registrationForm, "/auth/register/send-code");
          showRegistrationCodeStep(result);
          showToast("📧 Mã xác nhận đã được gửi đến email của bạn.");
        } catch (error) {
          showToast(`❌ ${error.message}`);
        } finally {
          authRequestInProgress = false;
          registrationForm.removeAttribute("aria-busy");
          registrationCodeButton.setAttribute("aria-busy", "false");
          registrationCodeButton.removeAttribute("aria-disabled");
          registrationCodeButtonIcon.classList.remove("hidden");
          registrationCodeButtonSpinner.classList.add("hidden");
        }
      });

      registrationResendButton.addEventListener("click", async () => {
        if (authRequestInProgress || registrationResendButton.disabled) return;

        authRequestInProgress = true;
        registrationResendButton.setAttribute("aria-busy", "true");
        registrationResendButton.setAttribute("aria-disabled", "true");
        registrationResendButton.disabled = true;
        registrationResendSpinner.classList.remove("hidden");
        try {
          const result = await postAuthForm(registrationForm, "/auth/register/send-code");
          showRegistrationCodeStep(result);
          showToast("📧 Mã xác nhận mới đã được gửi.");
        } catch (error) {
          showToast(`❌ ${error.message}`);
        } finally {
          authRequestInProgress = false;
          registrationResendButton.removeAttribute("aria-busy");
          registrationResendButton.removeAttribute("aria-disabled");
          registrationResendSpinner.classList.add("hidden");
          if (!registrationCooldownTimer) {
            registrationResendButton.disabled = false;
          }
        }
      });

      document.getElementById("btnEditRegistration").addEventListener("click", () => {
        resetRegistrationCodeStep();
        registrationForm.elements.namedItem("Email").focus();
      });

      document.getElementById("btnVerifyRegistrationCode").addEventListener("click", async event => {
        if (authRequestInProgress) return;

        const code = registrationOtpInputs.map(input => input.value).join("");
        if (!/^\d{6}$/.test(code)) {
          registrationCodeError.textContent = code
            ? "Mã còn thiếu số, vui lòng nhập đủ 6 số."
            : "Vui lòng nhập mã xác nhận.";
          registrationOtpInputs.forEach(input => {
            input.classList.toggle("border-red-500", !input.value);
            input.classList.toggle("border-stone-400", Boolean(input.value));
          });
          registrationOtpInputs.find(input => !input.value)?.focus();
          return;
        }

        authRequestInProgress = true;
        const verifyButton = event.currentTarget;
        verifyButton.disabled = true;
        verifyButton.setAttribute("aria-busy", "true");
        try {
          const formData = new FormData(registrationForm);
          formData.append("ChallengeId", registrationChallengeId);
          formData.append("Code", code);
          const result = await postAuthFormData(formData, "/auth/register/verify");
          currentUser = result.user;
          updateAuthHeaderState();
          registrationForm.reset();
          resetRegistrationCodeStep();
          modalAuth.classList.add("hidden");
          showToast(`🎉 Đăng ký thành công: ${currentUser.name}!`);
        } catch (error) {
          registrationCodeError.textContent = error.message;
          registrationOtpInputs.forEach(input => {
            input.value = "";
            input.classList.remove("border-stone-400");
            input.classList.add("border-red-500");
          });
          registrationOtpInputs[0].focus();
        } finally {
          authRequestInProgress = false;
          verifyButton.disabled = false;
          verifyButton.removeAttribute("aria-busy");
        }
      });

      document.getElementById("btnLogoutAccount").addEventListener("click", async () => {
        if (authRequestInProgress) return;

        authRequestInProgress = true;
        try {
          const tokenResponse = await fetch("/auth/antiforgery", {
            credentials: "same-origin",
            cache: "no-store"
          });
          const tokenResult = await tokenResponse.json().catch(() => null);
          if (!tokenResponse.ok || !tokenResult?.token) {
            throw new Error(tokenResult?.message || "Không thể xác thực yêu cầu đăng xuất. Vui lòng tải lại trang.");
          }

          const response = await fetch("/auth/logout", {
            method: "POST",
            headers: { "RequestVerificationToken": tokenResult.token },
            credentials: "same-origin"
          });
          const result = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(result?.message || "Không thể đăng xuất. Vui lòng thử lại.");
          }

          currentUser = null;
          updateAuthHeaderState();
          showToast("🚪 Đã đăng xuất tài khoản thành công.");
        } catch (error) {
          showToast(`❌ ${error.message}`);
        } finally {
          authRequestInProgress = false;
        }
      });

      async function loadCurrentUser() {
        try {
          const response = await fetch("/auth/current", {
            credentials: "same-origin",
            cache: "no-store"
          });
          if (!response.ok) {
            throw new Error("Không thể kiểm tra trạng thái đăng nhập.");
          }

          const result = await response.json();
          if (result.user?.role === "Admin") {
            window.location.assign("/admin");
            return;
          }
          currentUser = result.user?.role === "KhachHang" ? result.user : null;
          updateAuthHeaderState();
        } catch (error) {
          console.error("Không thể tải trạng thái tài khoản:", error);
          showToast("Không thể kiểm tra trạng thái đăng nhập. Vui lòng tải lại trang.");
        }
      }

      loadCurrentUser();
    }

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initializeStorefront, { once: true });
    } else {
      initializeStorefront();
    }
