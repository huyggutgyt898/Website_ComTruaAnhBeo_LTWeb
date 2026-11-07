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

    // Toàn bộ 44 món ăn đúng từng tên và giá tiền người dùng yêu cầu
    const MENU_ITEMS = [
      // --- NHÓM 1: 24 MÓN CƠM CHÍNH ---
      { id: 1, catId: 1, name: "Cơm tấm sườn", price: 49000, unit: "Phần", hot: true, img: "/images/thumb_suon.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/C%C6%A1m_t%E1%BA%A5m_S%C3%A0i_G%C3%B2n_(s%C6%B0%E1%BB%9Dn_tr%E1%BB%A9ng),_ng15th8n2022.jpg", desc: "Sườn cốt lết nướng than hoa thơm lừng, kèm mỡ hành, đồ chua, nước mắm kẹo." },
      { id: 2, catId: 1, name: "Cơm tấm sườn bì chả", price: 69000, unit: "Phần", hot: true, img: "/images/thumb_comtam_full.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/C%C6%A1m_t%E1%BA%A5m_s%C6%B0%E1%BB%9Dn_b%C3%AC_ch%E1%BA%A3.jpg", desc: "Combo truyền thống đầy đặn gồm sườn nướng mật ong, bì thính giòn và chả trứng hấp." },
      { id: 3, catId: 1, name: "Cơm heo quay cải chua", price: 59000, unit: "Phần", hot: true, img: "/images/thumb_heoquay_cai.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Crispy_roast_pork_belly_with_rice.jpg", desc: "Heo quay da nổ giòn rụm dùng kèm cải chua xào đậm đà chống ngấy." },
      { id: 4, catId: 1, name: "Cơm heo quay không", price: 55000, unit: "Phần", hot: false, img: "/images/thumb_heoquay.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Crispy_roast_pork_belly_with_rice.jpg", desc: "Thịt ba rọi heo quay da giòn tan, ăn cùng cơm nóng, dưa leo và nước tương ớt." },
      { id: 5, catId: 1, name: "Cơm sườn xào chua ngọt", price: 55000, unit: "Phần", hot: true, img: "/images/thumb_suonxao.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/SG_th1n2023_(c%C6%A1m_t%E1%BA%A5m_th%E1%BB%8Bt_n%C6%B0%E1%BB%9Bng)_(6).jpg", desc: "Sườn non rim sốt chua ngọt sánh quyện cùng ớt chuông, hành tây và thơm." },
      { id: 6, catId: 1, name: "Cơm cháy chà bông", price: 39000, unit: "Phần", hot: false, img: "/images/thumb_bicha.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Com_chay_cha_bong.jpg", desc: "Cơm cháy chiên giòn rụm phủ đầy chà bông heo mặn ngọt và mỡ hành thơm phức." },
      { id: 7, catId: 1, name: "Cơm thịt kho trứng", price: 49000, unit: "Phần", hot: true, img: "/images/thumb_thitkho.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Thit_kho_tau.jpg", desc: "Thịt ba chỉ kho tàu nước dừa tươi mềm rục cùng trứng vịt thấm vị miền Nam." },
      { id: 8, catId: 1, name: "Cơm gà kho sả ớt", price: 49000, unit: "Phần", hot: false, img: "/images/thumb_duiga_them.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Com_ga_kho_sa_ot.jpg", desc: "Thịt gà ta kho sả ớt cay nồng dậy mùi thơm, cực kỳ bắt cơm ngày trưa." },
      { id: 9, catId: 1, name: "Cơm đậu hủ sốt cà chua + lạc rang", price: 39000, unit: "Phần", hot: false, img: "/images/thumb_suonxao.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Dau_hu_sot_ca_chua.jpg", desc: "Đậu hủ chiên vàng sốt cà chua tươi, kèm đậu phộng (lạc) rang muối giòn bùi." },
      { id: 10, catId: 1, name: "Cơm cá chiên + canh cà chua trứng", price: 55000, unit: "Phần", hot: false, img: "/images/thumb_duiga.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Ca_chien_com_trang.jpg", desc: "Cá tươi chiên vàng giòn chấm mắm tỏi ớt, phục vụ kèm 1 tô canh cà chua trứng." },
      { id: 11, catId: 1, name: "Cơm + 1 đùi vịt quay", price: 69000, unit: "Phần", hot: true, img: "/images/thumb_duiga.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Vit_quay_com_trang.jpg", desc: "Đùi vịt quay lá mắc mật da bóng bẩy, thịt mềm ngọt kèm nước chấm gia truyền." },
      { id: 12, catId: 1, name: "Cơm bò lúc lắc", price: 59000, unit: "Phần", hot: true, img: "/images/thumb_suonxao.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Bo_luc_lac_with_rice.jpg", desc: "Thịt bò thăn áp chảo lửa lớn mềm ngọt cùng ớt chuông, hành tây sốt tiêu đen." },
      { id: 13, catId: 1, name: "Cơm thịt heo chiên xù", price: 55000, unit: "Phần", hot: false, img: "/images/thumb_heoquay.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Tonkatsu_with_rice.jpg", desc: "Thịt thăn heo tẩm bột chiên xù vàng ruộm, giòn rụm chấm tương ớt xí muội." },
      { id: 14, catId: 1, name: "Cơm đùi gà góc tư", price: 65000, unit: "Phần", hot: true, img: "/images/thumb_duiga.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Com_ga_xoi_mo.jpg", desc: "Đùi gà góc tư lớn xối mỡ da giòn rụm, thịt mọng nước ăn kèm đồ chua." },
      { id: 15, catId: 1, name: "Cơm trứng chiên + canh bầu/ bí", price: 30000, unit: "Phần", hot: false, img: "/images/thumb_trung.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Com_trung_chien.jpg", desc: "Trứng chiên hành lá vàng ươm ăn kèm canh bầu hoặc canh bí thanh mát." },
      { id: 16, catId: 1, name: "Cơm + rau luộc chấm kho quẹt + canh bầu/ bí", price: 40000, unit: "Phần", hot: false, img: "/images/thumb_rauluoc.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Rau_luoc_kho_quet.jpg", desc: "Rau củ luộc xanh mướt chấm kho quẹt tóp mỡ tôm khô, kèm canh bầu/bí." },
      { id: 17, catId: 1, name: "Cơm thịt luộc + rau luộc + canh bất kì", price: 50000, unit: "Phần", hot: false, img: "/images/thumb_heoquay_cai.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Thit_luoc_com_trang.jpg", desc: "Ba rọi heo luộc cắt lát mỏng chấm mắm tỏi ớt, kèm rau luộc và 1 canh tự chọn." },
      { id: 18, catId: 1, name: "Cơm bì chả", price: 39000, unit: "Phần", hot: false, img: "/images/thumb_bicha.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/C%C6%A1m_t%E1%BA%A5m_s%C6%B0%E1%BB%9Dn_b%C3%AC_ch%E1%BA%A3.jpg", desc: "Cơm tấm dẻo thơm ăn kèm bì heo trộn thính và chả trứng chưng mộc nhĩ." },
      { id: 19, catId: 1, name: "Cơm chả", price: 29000, unit: "Phần", hot: false, img: "/images/thumb_bicha.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/C%C6%A1m_t%E1%BA%A5m_s%C6%B0%E1%BB%9Dn_b%C3%AC_ch%E1%BA%A3.jpg", desc: "Cơm tấm ăn cùng miếng chả trứng hấp dày dặn, mỡ hành và đồ chua." },
      { id: 20, catId: 1, name: "Cơm xíu mại", price: 45000, unit: "Phần", hot: false, img: "/images/thumb_thitkho.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Xiu_mai_sot_ca.jpg", desc: "Xíu mại thịt băm viên lớn hầm sốt cà chua đậm đà, ăn kèm cơm nóng." },
      { id: 21, catId: 1, name: "Cơm tôm phủ trứng", price: 69000, unit: "Phần", hot: true, img: "/images/thumb_trung.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Shrimp_and_egg_rice.jpg", desc: "Tôm tươi bóc vỏ xào chín tới phủ lớp trứng non béo mềm tan trong miệng." },
      { id: 22, catId: 1, name: "Cơm heo quay + sườn bì chả đặc biệt + cơm thêm", price: 99000, unit: "Phần", hot: true, img: "/images/thumb_comtam_full.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/C%C6%A1m_t%E1%BA%A5m_s%C6%B0%E1%BB%9Dn_b%C3%AC_ch%E1%BA%A3.jpg", desc: "Phần đặc biệt kết hợp cả heo quay giòn bì và bộ ba sườn-bì-chả kèm cơm thêm." },
      { id: 23, catId: 1, name: "Cơm thập cẩm (1p sườn, 1p heo quay, 1p trứng chiên, 1p bì, 1p chả, 1p cải chua, 1 đùi gà nhỏ, 1 canh bất kì, 1 trà đá, cơm thêm miễn phí không giới hạn)", price: 179000, unit: "Combo", hot: true, img: "/images/hero.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/C%C6%A1m_t%E1%BA%A5m_s%C6%B0%E1%BB%9Dn_b%C3%AC_ch%E1%BA%A3.jpg", desc: "Mâm cơm siêu khổng lồ hội tụ đủ 7 món mặn + 1 canh + 1 trà đá + cơm thêm miễn phí không giới hạn!" },
      { id: 24, catId: 1, name: "Cơm bạch tuộc + kim chi ăn kèm", price: 99000, unit: "Phần", hot: true, img: "/images/thumb_suonxao.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Stir_fried_octopus_rice.jpg", desc: "Bạch tuộc tươi xào sa tế cay giòn sần sật, dùng kèm kim chi cải thảo chua cay." },

      // --- NHÓM 2: 8 MÓN CANH & RAU ---
      { id: 25, catId: 2, name: "Canh khổ qua", price: 20000, unit: "Tô", hot: true, img: "/images/thumb_canhkhoqua.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Canh_kho_qua_nhoi_thit.jpg", desc: "Khổ qua nhồi thịt băm mộc nhĩ hầm nước xương ngọt thanh, giải nhiệt." },
      { id: 26, catId: 2, name: "Canh cà chua trứng", price: 15000, unit: "Tô", hot: false, img: "/images/thumb_canh_up.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Tomato_egg_drop_soup.jpg", desc: "Canh trứng vân mây nấu cà chua tươi và hành ngò nóng hổi." },
      { id: 27, catId: 2, name: "Canh bầu/ canh bí", price: 19000, unit: "Tô", hot: false, img: "/images/thumb_canhkhoqua.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Winter_melon_soup.jpg", desc: "Canh bầu hoặc bí xanh nấu tôm thịt băm ngọt mát." },
      { id: 28, catId: 2, name: "Canh kim chi", price: 29000, unit: "Tô", hot: false, img: "/images/thumb_khoquet.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Kimchi_jjigae.jpg", desc: "Canh kim chi thịt ba chỉ đậu hủ non chua cay ấm bụng." },
      { id: 29, catId: 2, name: "Canh khoai mỡ", price: 20000, unit: "Tô", hot: true, img: "/images/thumb_canh_up.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Purple_yam_soup.jpg", desc: "Canh khoai mỡ tím sánh dẻo nấu thịt băm, thơm mùi ngò om và rau ngổ." },
      { id: 30, catId: 2, name: "Canh khoai môn", price: 20000, unit: "Tô", hot: false, img: "/images/thumb_canhkhoqua.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Taro_soup.jpg", desc: "Canh khoai môn hầm xương mềm bùi, thơm béo tự nhiên." },
      { id: 31, catId: 2, name: "Canh bắp cải", price: 19000, unit: "Tô", hot: false, img: "/images/thumb_rauluoc.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Cabbage_soup.jpg", desc: "Canh bắp cải nấu thịt băm ngọt lành, thanh đạm." },
      { id: 32, catId: 2, name: "Rau luộc kho quẹt", price: 25000, unit: "Phần", hot: true, img: "/images/thumb_rauluoc.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Rau_luoc_kho_quet.jpg", desc: "Rau củ thập cẩm luộc xanh giòn chấm nồi kho quẹt tôm khô tóp mỡ sệt kẹo." },

      // --- NHÓM 3: 8 MÓN THÊM (TOPPING) ---
      { id: 33, catId: 3, name: "Đùi gà thêm (chiên)", price: 29000, unit: "Cái", hot: false, img: "/images/thumb_duiga_them.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Fried_chicken_drumstick.jpg", desc: "Đùi tỏi gà chiên giòn nóng hổi ăn kèm." },
      { id: 34, catId: 3, name: "Đùi gà góc tư thêm (chiên)", price: 49000, unit: "Cái", hot: true, img: "/images/thumb_duiga.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Com_ga_xoi_mo.jpg", desc: "Đùi gà góc tư lớn chiên nước mắm vàng ruộm." },
      { id: 35, catId: 3, name: "Xíu mại thêm", price: 14000, unit: "Viên", hot: false, img: "/images/thumb_thitkho.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Xiu_mai_sot_ca.jpg", desc: "1 viên xíu mại thịt heo sốt cà chua đậm đà (14.000đ/viên)." },
      { id: 38, catId: 3, name: "Nước mắm thêm", price: 2000, unit: "Chén", hot: false, img: "/images/thumb_khoquet.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Nuoc_cham.jpg", desc: "Chén nước mắm kẹo tỏi ớt pha theo công thức riêng của Anh Béo." },
      { id: 39, catId: 3, name: "Cơm trắng thêm", price: 3000, unit: "Chén", hot: false, img: "/images/thumb_bicha.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Steamed_rice_in_bowl.jpg", desc: "Chén cơm tấm / cơm trắng dẻo nóng." },
      { id: 40, catId: 3, name: "Cơm chiên thêm", price: 4000, unit: "Chén", hot: false, img: "/images/thumb_trung.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Fried_rice_bowl.jpg", desc: "Chén cơm chiên tỏi trứng vàng thơm." },
      { id: 41, catId: 3, name: "Tóp mỡ thêm", price: 10000, unit: "Chén", hot: true, img: "/images/thumb_khoquet.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Pork_cracklings.jpg", desc: "Tóp mỡ ba rọi thắng giòn rụm rim mắm tỏi." },
      { id: 42, catId: 3, name: "Mỡ hành thêm", price: 3000, unit: "Chén", hot: false, img: "/images/thumb_rauluoc.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Scallion_oil.jpg", desc: "Chén mỡ hành xanh mướt thơm béo." },

      // --- NHÓM 4: 4 MÓN NƯỚC UỐNG & KHĂN LẠNH ---
      { id: 36, catId: 4, name: "Trà đá", price: 4000, unit: "Ly", hot: true, img: "/images/thumb_trada.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Tra_da_Saigon.jpg", desc: "Trà đá hương lài mát lạnh sảng khoái." },
      { id: 37, catId: 4, name: "Khăn lạnh", price: 2000, unit: "Cái", hot: false, img: "/images/thumb_trada.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Wet_wipe_packet.jpg", desc: "Khăn giấy ướt tiệt trùng mát lạnh." },
      { id: 43, catId: 4, name: "Nước ngọt (Sting, Coca, 7-Up, Sprite, Pepsi)", price: 17000, unit: "Lon/Chai", hot: true, img: "/images/thumb_trada.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Soft_drink_cans.jpg", desc: "17.000đ (Chọn: Sting, Coca, 7-Up, Sprite, Pepsi ướp lạnh)." },
      { id: 44, catId: 4, name: "Nước sâm", price: 11000, unit: "Chai", hot: true, img: "/images/thumb_trada.jpg", googleImg: "https://commons.wikimedia.org/wiki/Special:FilePath/Herbal_tea_bottle.jpg", desc: "Nước sâm bông cúc mía lau nhà nấu thanh nhiệt (11.000đ/chai)." }
    ];

    // Hàm tạo nội dung Email chuẩn xác theo đề bài
    function buildConfirmationEmailBody(customerName, paymentMethod) {
      return `CƠM TRƯA ANH BÉO xin chào,\nCảm ơn ${customerName} đã đặt hàng và thanh toán thành công bằng phương thức ${paymentMethod}. Chúng tôi đã nhận được đơn đặt hàng của bạn. Đơn hàng của bạn đang được chuẩn bị và sẽ tiến hành giao hàng trong vòng 1 tiếng. Chúc ${customerName} 1 bữa trưa ngon miệng!\nTrân trọng,\nCơm trưa Anh Béo.`;
    }

    // Bảng Đơn hàng mẫu trong SQL Server
    let sqlOrders = [
      {
        id: 1001,
        customerName: "Nguyễn Minh Tuấn",
        phone: "0909123456",
        email: "minhtuan.sgn@gmail.com",
        address: "384 Lê Văn Việt, Phường Tăng Nhơn Phú, TP.HCM",
        km: 1.2,
        subtotal: 118000,
        shipFee: 0,
        total: 118000,
        method: "MoMo",
        status: "Đang chuẩn bị (Giao trong 1 tiếng)",
        createdAt: "2026-10-24 09:30:12",
        items: "1x Cơm tấm sườn bì chả (69.000đ), 1x Cơm tấm sườn (49.000đ)"
      },
      {
        id: 1002,
        customerName: "Trần Ngọc Lan",
        phone: "0918234567",
        email: "ngoclan.tran@gmail.com",
        address: "120 Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức, TP.HCM",
        km: 3.5,
        subtotal: 84000,
        shipFee: 20000,
        total: 104000,
        method: "VNPAY",
        status: "Đang chuẩn bị (Giao trong 1 tiếng)",
        createdAt: "2026-10-24 09:48:05",
        items: "1x Cơm heo quay cải chua (59.000đ), 1x Rau luộc kho quẹt (25.000đ)"
      },
      {
        id: 1003,
        customerName: "Lê Hoàng Phúc",
        phone: "0987654321",
        email: "hoangphuc.le@gmail.com",
        address: "25 Nguyễn Thị Minh Khai, Quận 1, TP.HCM",
        km: 14.0,
        subtotal: 179000,
        shipFee: 84000,
        total: 263000,
        method: "Thanh toán khi nhận hàng (Đưa tiền cho Shipper)",
        status: "Đang chuẩn bị (Giao trong 1 tiếng)",
        createdAt: "2026-10-24 10:05:40",
        items: "1x Cơm thập cẩm đặc biệt (179.000đ)"
      }
    ];

    // Bảng Lịch sử gửi Email trong SQL Server
    let sqlEmails = [
      {
        id: 1,
        orderId: 1001,
        to: "minhtuan.sgn@gmail.com",
        subject: "[CƠM TRƯA ANH BÉO] Xác nhận đơn hàng #1001 thành công",
        body: buildConfirmationEmailBody("Nguyễn Minh Tuấn", "MoMo"),
        sentAt: "2026-10-24 09:30:13"
      },
      {
        id: 2,
        orderId: 1002,
        to: "ngoclan.tran@gmail.com",
        subject: "[CƠM TRƯA ANH BÉO] Xác nhận đơn hàng #1002 thành công",
        body: buildConfirmationEmailBody("Trần Ngọc Lan", "VNPAY"),
        sentAt: "2026-10-24 09:48:06"
      },
      {
        id: 3,
        orderId: 1003,
        to: "hoangphuc.le@gmail.com",
        subject: "[CƠM TRƯA ANH BÉO] Xác nhận đơn hàng #1003 thành công",
        body: buildConfirmationEmailBody("Lê Hoàng Phúc", "Thanh toán khi nhận hàng (Đưa tiền cho Shipper)"),
        sentAt: "2026-10-24 10:05:41"
      }
    ];

    // =========================================================================
    // 2. STATE ỨNG DỤNG (GIỎ HÀNG, BỘ LỌC, TÀI KHOẢN ĐANG ĐĂNG NHẬP)
    // =========================================================================
    let cart = {
      2: 1, // Mặc định có 1 phần Cơm tấm sườn bì chả (69.000đ) để khách dễ trải nghiệm ngay
      25: 1 // 1 tô Canh khổ qua (20.000đ)
    };
    let activeCategory = "ALL";
    let searchQuery = "";
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
    // 3. LOGIC TÍNH PHÍ SHIP TỪ 450 LÊ VĂN VIỆT & KIỂM TRA NỘI THÀNH TP.HCM
    // =========================================================================
    const NON_HCM_KEYWORDS = [
      "bình dương", "binh duong", "thuận an", "thuan an", "dĩ an", "di an", "thủ dầu một",
      "đồng nai", "dong nai", "biên hòa", "bien hoa", "long khánh",
      "long an", "tân an", "bến lức", "đức hòa",
      "vũng tàu", "vung tau", "bà rịa", "ba ria",
      "hà nội", "ha noi", "đà nẵng", "da nang", "cần thơ", "can tho",
      "hải phòng", "nha trang", "đà lạt", "bình phước", "tây ninh", "tiền giang", "bến tre", "vĩnh long"
    ];

    // Ước lượng khoảng cách thực tế từ 450 Lê Văn Việt, Tăng Nhơn Phú, TP.HCM
    function estimateDistanceFrom450LeVanViet(addressText) {
      const lower = (addressText || "").toLowerCase();
      if (!lower.trim()) return 1.5;
      if (lower.includes("450 lê văn việt") || lower.includes("450 le van viet")) return 0.2;
      if (lower.includes("lê văn việt") || lower.includes("le van viet") || lower.includes("tăng nhơn phú")) return 1.2;
      if (lower.includes("man thiện") || lower.includes("man thien") || lower.includes("đình phong phú") || lower.includes("lã xuân oai")) return 1.6;
      if (lower.includes("võ văn ngân") || lower.includes("vo van ngan") || lower.includes("bình thọ") || lower.includes("khu công nghệ cao")) return 3.2;
      if (lower.includes("đỗ xuân hợp") || lower.includes("do xuan hop") || lower.includes("phước long") || lower.includes("linh trung") || lower.includes("linh chiểu")) return 4.4;
      if (lower.includes("thủ đức") || lower.includes("thu duc") || lower.includes("quận 9") || lower.includes("quan 9") || lower.includes("hiệp phú")) return 2.8;
      if (lower.includes("quận 2") || lower.includes("quan 2") || lower.includes("thảo điền") || lower.includes("an phú")) return 8.5;
      if (lower.includes("bình thạnh") || lower.includes("binh thanh") || lower.includes("điện biên phủ")) return 11.5;
      if (lower.includes("quận 1") || lower.includes("quan 1") || lower.includes("bến nghé") || lower.includes("nguyễn thị minh khai")) return 14.0;
      if (lower.includes("quận 3") || lower.includes("quan 3") || lower.includes("phú nhuận") || lower.includes("gò vấp")) return 15.0;
      if (lower.includes("quận 7") || lower.includes("quan 7") || lower.includes("tân bình") || lower.includes("quận 10")) return 17.0;
      if (lower.includes("quận 12") || lower.includes("bình tân") || lower.includes("tân phú")) return 19.5;
      return null; // Giữ nguyên số km đang nhập nếu địa chỉ bất kỳ
    }

    function checkIsOutOfHCM() {
      const prov = document.getElementById("orderProvinceSelect").value;
      const addr = (document.getElementById("orderAddress").value || "").toLowerCase();
      if (prov !== "HCM") return true;
      for (const kw of NON_HCM_KEYWORDS) {
        if (addr.includes(kw)) return true;
      }
      return false;
    }

    // Áp dụng đúng 100% công thức phí ship đề bài yêu cầu
    function calculateShippingFee(distanceKm, orderSubtotal) {
      const km = Math.max(0, parseFloat(distanceKm) || 0);
      const subtotal = Math.max(0, parseFloat(orderSubtotal) || 0);

      // + <2km mà đơn hàng có giá trị từ 100k trở lên: MIỄN PHÍ SHIP
      // + <2km mà đơn hàng có giá trị từ 100k trở xuống: 10k phí ship
      if (km < 2) {
        if (subtotal >= 100000) {
          return { fee: 0, ruleText: `< 2km (${km}km) & Đơn ≥ 100k: MIỄN PHÍ SHIP (0đ)` };
        } else {
          return { fee: 10000, ruleText: `< 2km (${km}km) & Đơn ≤ 100k: Phí ship 10.000đ` };
        }
      }
      // + Từ 2km đến 5km mà có giá trị đơn từ 100k trở lên: 15k phí ship
      // + Từ 2-5km mà có giá trị đơn từ 100k trở xuống: 20k phí ship
      if (km >= 2 && km <= 5) {
        if (subtotal >= 100000) {
          return { fee: 15000, ruleText: `Từ 2km - 5km (${km}km) & Đơn ≥ 100k: Phí ship 15.000đ` };
        } else {
          return { fee: 20000, ruleText: `Từ 2km - 5km (${km}km) & Đơn ≤ 100k: Phí ship 20.000đ` };
        }
      }
      // + 5km trở lên (phát sinh đơn hàng nào cũng tính ship không ràng buộc giá trị đơn hàng): 6k/km
      const fee = Math.round(km * 6000);
      return {
        fee,
        ruleText: `Trên 5km (${km}km) × 6.000đ/km = ${formatVND(fee)} (Không ràng buộc giá trị đơn)`
      };
    }

    // =========================================================================
    // 4. RENDER THỰC ĐƠN 44 MÓN ĂN
    // =========================================================================
    function renderMenuGrid() {
      const container = document.getElementById("menuGridContainer");
      const q = searchQuery.trim().toLowerCase();

      const filtered = MENU_ITEMS.filter(item => {
        const matchCat = (activeCategory === "ALL") || (String(item.catId) === String(activeCategory));
        const matchQuery = !q || item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
        return matchCat && matchQuery;
      });

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="col-span-full bg-white rounded-2xl p-10 text-center border border-stone-200">
            <div class="text-4xl mb-2">🍚</div>
            <div class="font-brand font-bold text-lg text-plt-brown">Không tìm thấy món ăn phù hợp</div>
            <p class="text-xs text-stone-500 mt-1">Hãy thử từ khóa khác hoặc bấm xem “Tất cả (44 món)”.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = filtered.map(item => {
        const inCartQty = cart[item.id] || 0;
        return `
          <div class="dish-card bg-white rounded-2xl overflow-hidden border border-stone-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div class="relative h-44 bg-stone-100 overflow-hidden">
                <img src="${item.img}"
                     data-google-src="${item.googleImg}"
                     alt="${item.name}"
                     class="w-full h-full object-cover" />
                <div class="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <span class="px-2.5 py-0.5 rounded-full bg-plt-brown/90 text-plt-gold font-extrabold text-[11px] shadow">
                    #${item.id}
                  </span>
                  ${item.hot ? `<span class="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-[11px] shadow">🔥 Bán chạy</span>` : ``}
                </div>
                <div class="absolute bottom-2 right-2 px-3 py-1 rounded-xl bg-plt-gold text-amber-950 font-brand font-black text-sm shadow-md border border-amber-950/15">
                  ${formatVND(item.price)}${item.unit === 'Viên' ? '/viên' : item.unit === 'Chai' ? '/chai' : ''}
                </div>
              </div>
              <div class="p-4 space-y-1.5">
                <h3 class="font-brand font-extrabold text-sm sm:text-base text-plt-brown leading-snug line-clamp-2" title="${item.name}">
                  ${item.name}
                </h3>
                <p class="text-xs text-stone-500 line-clamp-2 leading-relaxed">
                  ${item.desc}
                </p>
              </div>
            </div>

            <div class="px-4 pb-4 pt-1 space-y-2">
              <div class="flex items-center gap-2">
                <!-- Nút Đặt hàng: bấm vào trỏ thẳng đến giao diện đặt hàng -->
                <button type="button" data-order-now="${item.id}"
                        class="btn-order-now flex-1 py-2.5 px-3 rounded-xl bg-plt-brown hover:bg-amber-900 text-plt-gold font-brand font-extrabold text-xs uppercase tracking-wide transition shadow-sm flex items-center justify-center gap-1">
                  <span>🛵 Đặt hàng</span>
                </button>
                <!-- Nút cộng thêm vào giỏ -->
                <button type="button" data-add-cart="${item.id}"
                        class="btn-add-cart py-2.5 px-3 rounded-xl bg-amber-100 hover:bg-plt-gold text-plt-brown font-extrabold text-xs transition border border-amber-300">
                  + Giỏ ${inCartQty > 0 ? `(${inCartQty})` : ``}
                </button>
              </div>
            </div>
          </div>
        `;
      }).join("");
    }

    // =========================================================================
    // 5. CẬP NHẬT GIỎ HÀNG & BẢNG TÍNH TỔNG BILL
    // =========================================================================
    function getCartSummary() {
      let totalQty = 0;
      let subtotal = 0;
      const detailedItems = [];

      Object.keys(cart).forEach(idStr => {
        const qty = cart[idStr];
        if (qty > 0) {
          const dish = MENU_ITEMS.find(m => m.id === Number(idStr));
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

    function updateCartAndCheckoutUI() {
      const { totalQty, subtotal, detailedItems } = getCartSummary();

      // Badge trên Header & Sticky bar
      document.getElementById("cartCountBadge").textContent = totalQty;
      document.getElementById("stickyCartCount").textContent = `${totalQty} món`;
      document.getElementById("stickyCartTotal").textContent = formatVND(subtotal);

      // Kiểm tra khoảng cách & nội thành TP.HCM
      const distanceInput = document.getElementById("orderDistanceKm");
      const km = parseFloat(distanceInput.value) || 1.5;
      const isOut = checkIsOutOfHCM();
      const warningBox = document.getElementById("outOfHcmWarningBox");
      const ruleBox = document.getElementById("shippingRuleResultBox");

      if (isOut) {
        warningBox.classList.remove("hidden");
        ruleBox.innerHTML = `<span class="text-red-600 font-extrabold">🚫 Địa chỉ ngoài nội thành TP.HCM: Chú ý không được đặt hàng!</span>`;
      } else {
        warningBox.classList.add("hidden");
      }

      const shipCalc = calculateShippingFee(km, subtotal);
      const grandTotal = subtotal + shipCalc.fee;

      if (!isOut) {
        ruleBox.innerHTML = `✅ <strong>${shipCalc.ruleText}</strong> → Tổng cộng vào bill: <strong class="text-red-600">${formatVND(grandTotal)}</strong>`;
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
            <img src="${item.img}" alt="${item.name}" class="w-14 h-14 rounded-lg object-cover shrink-0 border border-stone-200" />
            <div class="flex-grow min-w-0">
              <div class="font-bold text-xs sm:text-sm text-stone-900 truncate" title="${item.name}">${item.name}</div>
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
      document.getElementById("summaryTotalQty").textContent = `${totalQty} phần`;
      document.getElementById("summarySubtotal").textContent = formatVND(subtotal);
      document.getElementById("summaryDistanceLabel").textContent = `${km} km`;
      document.getElementById("summaryShippingFee").textContent = shipCalc.fee === 0 ? "0đ (MIỄN PHÍ SHIP)" : formatVND(shipCalc.fee);
      document.getElementById("summaryGrandTotal").textContent = formatVND(grandTotal);

      const hintEl = document.getElementById("summaryFreeShipHint");
      if (km < 2 && subtotal > 0 && subtotal < 100000) {
        hintEl.textContent = `💡 Mua thêm ${formatVND(100000 - subtotal)} nữa để đạt 100k và được MIỄN PHÍ SHIP (<2km)!`;
      } else if (km < 2 && subtotal >= 100000) {
        hintEl.textContent = `🎉 Đơn hàng <2km từ 100k trở lên: Bạn được MIỄN PHÍ SHIP!`;
      } else if (km >= 2 && km <= 5 && subtotal < 100000) {
        hintEl.textContent = `💡 Mua thêm ${formatVND(100000 - subtotal)} để giảm phí ship từ 20.000đ xuống 15.000đ (2-5km)!`;
      } else {
        hintEl.textContent = `🛵 Áp dụng đúng quy định phí ship từ 450 Lê Văn Việt (${shipCalc.ruleText}).`;
      }

      // Cập nhật luôn bảng tóm tắt ở Bước 2 (Giao diện thanh toán) nếu đang mở
      document.getElementById("paySumName").textContent = document.getElementById("orderFullName").value || "Khách hàng";
      document.getElementById("paySumPhone").textContent = document.getElementById("orderPhone").value || "--";
      document.getElementById("paySumEmail").textContent = document.getElementById("orderEmail").value || "--";
      document.getElementById("paySumAddress").textContent = document.getElementById("orderAddress").value || "--";
      document.getElementById("paySumSubtotal").textContent = formatVND(subtotal);
      document.getElementById("paySumKm").textContent = km;
      document.getElementById("paySumShip").textContent = shipCalc.fee === 0 ? "MIỄN PHÍ (0đ)" : formatVND(shipCalc.fee);
      document.getElementById("paySumTotal").textContent = formatVND(grandTotal);
    }

    // =========================================================================
    // 6. CHUYỂN ĐỔI VIEW / TAB TRONG TRANG WEB
    // =========================================================================
    function switchView(viewName, scrollToMenu = false) {
      const actualView = viewName === "menu" ? "home" : viewName;
      const views = ["home", "checkout", "coupon", "reviews"];
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
        updateCartAndCheckoutUI();
      }
    }

    // =========================================================================
    // 7. CẬP NHẬT BẢN ĐỒ GOOGLE MAPS TỪ 450 LÊ VĂN VIỆT ĐẾN ĐỊA CHỈ KHÁCH
    // =========================================================================
    function updateGoogleMapsRoute() {
      const dest = (document.getElementById("orderAddress").value || "").trim();
      const isOut = checkIsOutOfHCM();

      if (dest) {
        const estimatedKm = estimateDistanceFrom450LeVanViet(dest);
        if (estimatedKm !== null) {
          document.getElementById("orderDistanceKm").value = estimatedKm;
        }
        document.getElementById("mapDestLabel").textContent = dest;
        const encodedOrigin = encodeURIComponent("450 Lê Văn Việt, Phường Tăng Nhơn Phú, Thành phố Hồ Chí Minh");
        const encodedDest = encodeURIComponent(dest);
        document.getElementById("linkOpenGoogleMapsRoute").href = `https://www.google.com/maps/dir/${encodedOrigin}/${encodedDest}`;
        document.getElementById("googleMapEmbedFrame").src = `https://maps.google.com/maps?q=${encodedDest}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
      }

      updateCartAndCheckoutUI();
      if (isOut) {
        showToast("🚫 CHÚ Ý: Cơm Trưa Anh Béo chỉ ship trong nội thành TP.HCM, không giao qua tỉnh thành khác!");
      } else {
        const { subtotal } = getCartSummary();
        const km = parseFloat(document.getElementById("orderDistanceKm").value) || 1.5;
        const shipCalc = calculateShippingFee(km, subtotal);
        showToast(`📍 Đã tính phí ship (${km}km): ${formatVND(shipCalc.fee)} - Cộng vào tổng bill!`);
      }
    }

    // =========================================================================
    // 9. KHỞI TẠO SỰ KIỆN TƯƠNG TÁC
    // =========================================================================
    window.addEventListener("DOMContentLoaded", () => {
      // Render thực đơn & giỏ hàng ban đầu
      renderMenuGrid();
      updateCartAndCheckoutUI();

      // Điền sẵn thông tin mẫu thuận tiện để người dùng test ngay hoặc sửa tùy ý
      document.getElementById("orderFullName").value = "Nguyễn Minh Tuấn";
      document.getElementById("orderPhone").value = "0909123456";
      document.getElementById("orderEmail").value = "minhtuan.sgn@gmail.com";
      document.getElementById("orderAddress").value = "380 Lê Văn Việt, Phường Tăng Nhơn Phú, TP.HCM";
      document.getElementById("orderDistanceKm").value = "0.8";
      updateCartAndCheckoutUI();

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

      // 2. Giỏ hàng trên Header: "khi bấm vào trỏ tới menu của quán"
      document.getElementById("btnHeaderCart").addEventListener("click", () => {
        switchView("menu", true);
        showToast("🍚 Đã chuyển tới Thực đơn 44 món của Cơm Trưa Anh Béo!");
      });

      document.getElementById("btnHeroWatchMenu").addEventListener("click", () => {
        switchView("menu", true);
      });

      // 3. Lọc danh mục & Tìm kiếm món ăn
      document.querySelectorAll(".cat-filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          activeCategory = btn.getAttribute("data-cat");
          document.querySelectorAll(".cat-filter-btn").forEach(b => {
            b.className = "cat-filter-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-stone-100 text-stone-700 hover:bg-amber-100 transition";
          });
          btn.className = "cat-filter-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold bg-plt-brown text-plt-gold shadow-sm transition";
          renderMenuGrid();
        });
      });

      document.getElementById("inputSearchMenu").addEventListener("input", (e) => {
        searchQuery = e.target.value || "";
        renderMenuGrid();
      });

      // 4. Sự kiện bấm vào nút Đặt hàng hoặc + Giỏ trên từng món ăn (Event Delegation)
      document.getElementById("menuGridContainer").addEventListener("click", (e) => {
        const orderBtn = e.target.closest(".btn-order-now");
        if (orderBtn) {
          const dishId = Number(orderBtn.getAttribute("data-order-now"));
          cart[dishId] = (cart[dishId] || 0) + 1;
          const dish = MENU_ITEMS.find(m => m.id === dishId);
          renderMenuGrid();
          updateCartAndCheckoutUI();
          // Trỏ thẳng đến giao diện đặt hàng theo đúng yêu cầu
          switchView("checkout");
          showToast(`🛵 Đã chọn "${dish ? dish.name : 'Món ăn'}" và chuyển tới Giao diện Đặt hàng!`);
          return;
        }

        const addBtn = e.target.closest(".btn-add-cart");
        if (addBtn) {
          const dishId = Number(addBtn.getAttribute("data-add-cart"));
          cart[dishId] = (cart[dishId] || 0) + 1;
          const dish = MENU_ITEMS.find(m => m.id === dishId);
          renderMenuGrid();
          updateCartAndCheckoutUI();
          showToast(`✅ Đã thêm "${dish ? dish.name : 'Món ăn'}" vào giỏ hàng!`);
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

      document.querySelectorAll(".quick-add-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          const dishId = Number(btn.getAttribute("data-quick-add"));
          cart[dishId] = (cart[dishId] || 0) + 1;
          renderMenuGrid();
          updateCartAndCheckoutUI();
          const dish = MENU_ITEMS.find(m => m.id === dishId);
          showToast(`+ Đã thêm ${dish ? dish.name : 'món phụ'} vào đơn hàng!`);
        });
      });

      document.getElementById("btnClearCart").addEventListener("click", () => {
        cart = {};
        renderMenuGrid();
        updateCartAndCheckoutUI();
        showToast("🗑️ Đã làm trống giỏ hàng.");
      });

      // 6. Sự kiện Định tuyến Google Maps & Nút Tính Phí Ship
      document.getElementById("orderQuickLandmark").addEventListener("change", (e) => {
        const val = e.target.value;
        if (!val) return;
        const [addr, kmStr] = val.split("|");
        document.getElementById("orderAddress").value = addr;
        document.getElementById("orderDistanceKm").value = kmStr;
        if (addr.toLowerCase().includes("bình dương")) {
          document.getElementById("orderProvinceSelect").value = "BINH_DUONG";
        } else {
          document.getElementById("orderProvinceSelect").value = "HCM";
        }
        updateGoogleMapsRoute();
      });

      document.getElementById("orderProvinceSelect").addEventListener("change", () => {
        updateCartAndCheckoutUI();
      });

      document.getElementById("orderDistanceKm").addEventListener("input", () => {
        updateCartAndCheckoutUI();
      });

      document.getElementById("orderAddress").addEventListener("input", () => {
        updateCartAndCheckoutUI();
      });

      document.getElementById("btnCalculateShipFee").addEventListener("click", () => {
        updateGoogleMapsRoute();
      });

      // 7. Nút Xác nhận Đặt hàng (Bước 1 -> Hiện ra Giao diện Thanh toán Bước 2)
      document.getElementById("btnConfirmOrderStep1").addEventListener("click", () => {
        const { totalQty } = getCartSummary();
        if (totalQty === 0) {
          showToast("⚠️ Vui lòng chọn ít nhất 1 món ăn trước khi xác nhận đặt hàng!");
          return;
        }
        const name = document.getElementById("orderFullName").value.trim();
        const phone = document.getElementById("orderPhone").value.trim();
        const email = document.getElementById("orderEmail").value.trim();
        const address = document.getElementById("orderAddress").value.trim();

        if (!name || !phone || !email || !address) {
          showToast("⚠️ Vui lòng nhập đầy đủ Họ tên, SĐT, Email và Địa chỉ nhận hàng!");
          return;
        }

        if (checkIsOutOfHCM()) {
          showToast("🚫 CHÚ Ý KHÔNG ĐƯỢC ĐẶT HÀNG: Quán chỉ ship trong nội thành TP.HCM!");
          document.getElementById("outOfHcmWarningBox").scrollIntoView({ behavior: "smooth" });
          return;
        }

        updateCartAndCheckoutUI();
        const payPanel = document.getElementById("paymentStepPanel");
        payPanel.classList.remove("hidden");
        document.getElementById("stepBadge2").className = "px-3 py-1.5 rounded-full bg-plt-brown text-plt-gold";
        payPanel.scrollIntoView({ behavior: "smooth" });
        showToast("✅ Đã xác nhận thông tin! Vui lòng chọn phương thức thanh toán bên dưới.");
      });

      // 8. Chọn phương thức thanh toán (MoMo, VNPAY, Thanh toán khi nhận hàng)
      document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener("change", () => {
          const val = radio.value;
          const box = document.getElementById("paymentInstructionBox");
          document.querySelectorAll(".payment-method-card").forEach(card => {
            card.classList.remove("border-pink-600", "bg-pink-50/50", "border-blue-600", "bg-blue-50/50", "border-amber-600", "bg-amber-50/50");
            card.classList.add("border-stone-200", "bg-white");
          });
          const activeCard = radio.closest(".payment-method-card");
          if (val === "MoMo") {
            activeCard.classList.replace("border-stone-200", "border-pink-600");
            box.className = "rounded-xl p-4 bg-pink-50 border border-pink-200 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4";
            box.innerHTML = `
              <div class="space-y-1">
                <div class="font-extrabold text-pink-800 uppercase">📱 Thanh toán bằng Ví điện tử MoMo</div>
                <p class="text-stone-700">Chuyển khoản hoặc quét QR MoMo tới SĐT: <strong>0775058143 – Mr. Khoa (Cơm Trưa Anh Béo)</strong></p>
                <p class="text-xs text-stone-500">Hệ thống tự động xác nhận ngay sau khi bấm hoàn tất.</p>
              </div>
              <div class="w-24 h-24 rounded-xl bg-white border-2 border-pink-500 flex flex-col items-center justify-center p-2 shrink-0 shadow-sm">
                <div class="text-2xl">📲</div>
                <div class="text-[10px] font-black text-pink-700 uppercase mt-1">QR MoMo</div>
                <div class="text-[9px] font-bold text-stone-500">0775058143</div>
              </div>
            `;
          } else if (val === "VNPAY") {
            activeCard.classList.replace("border-stone-200", "border-blue-600");
            box.className = "rounded-xl p-4 bg-blue-50 border border-blue-200 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4";
            box.innerHTML = `
              <div class="space-y-1">
                <div class="font-extrabold text-blue-800 uppercase">🏦 Thanh toán qua cổng VNPAY-QR</div>
                <p class="text-stone-700">Quét mã VNPAY trên ứng dụng Ngân hàng / VNPAY Wallet để thanh toán tổng hóa đơn.</p>
                <p class="text-xs text-stone-500">Thụ hưởng: CƠM TRƯA ANH BÉO (Mr. Khoa - 0775058143)</p>
              </div>
              <div class="w-24 h-24 rounded-xl bg-white border-2 border-blue-600 flex flex-col items-center justify-center p-2 shrink-0 shadow-sm">
                <div class="text-2xl">💳</div>
                <div class="text-[10px] font-black text-blue-700 uppercase mt-1">VNPAY-QR</div>
                <div class="text-[9px] font-bold text-stone-500">ANH BEO</div>
              </div>
            `;
          } else {
            activeCard.classList.replace("border-stone-200", "border-amber-600");
            box.className = "rounded-xl p-4 bg-amber-50 border border-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-center justify-between gap-4";
            box.innerHTML = `
              <div class="space-y-1">
                <div class="font-extrabold text-amber-900 uppercase">🛵 Thanh toán khi nhận hàng (Đưa tiền cho Shipper)</div>
                <p class="text-stone-700">Quý khách kiểm tra phần cơm nóng hổi và thanh toán tiền mặt trực tiếp cho Shipper khi nhận hàng trong vòng 1 tiếng.</p>
              </div>
              <div class="w-24 h-24 rounded-xl bg-white border-2 border-amber-600 flex flex-col items-center justify-center p-2 shrink-0 shadow-sm">
                <div class="text-2xl">💵</div>
                <div class="text-[10px] font-black text-amber-800 uppercase mt-1">COD</div>
                <div class="text-[9px] font-bold text-stone-500">Giao 1 tiếng</div>
              </div>
            `;
          }
        });
      });

      // 9. Nút Hoàn tất Thanh toán -> Lưu vào SQL Server & Gửi Email đúng mẫu
      document.getElementById("btnCompletePaymentFinal").addEventListener("click", () => {
        if (checkIsOutOfHCM()) {
          showToast("🚫 CHÚ Ý KHÔNG ĐƯỢC ĐẶT HÀNG: Chỉ giao trong nội thành TP.HCM!");
          return;
        }
        const { totalQty, subtotal, detailedItems } = getCartSummary();
        if (totalQty === 0) {
          showToast("⚠️ Giỏ hàng đang trống!");
          return;
        }

        const customerName = document.getElementById("orderFullName").value.trim() || "Quý khách";
        const phone = document.getElementById("orderPhone").value.trim() || "0909123456";
        const email = document.getElementById("orderEmail").value.trim() || "khachhang@gmail.com";
        const address = document.getElementById("orderAddress").value.trim() || "TP. Hồ Chí Minh";
        const km = parseFloat(document.getElementById("orderDistanceKm").value) || 1.5;
        const shipCalc = calculateShippingFee(km, subtotal);
        const grandTotal = subtotal + shipCalc.fee;
        const selectedRadio = document.querySelector('input[name="paymentMethod"]:checked');
        const paymentMethod = selectedRadio ? selectedRadio.value : "MoMo";

        const newOrderId = 1000 + sqlOrders.length + 1;
        const nowStr = new Date().toISOString().slice(0, 19).replace("T", " ");
        const itemsSummary = detailedItems.map(i => `${i.qty}x ${i.name} (${formatVND(i.lineTotal)})`).join(", ");

        // Lưu vào bảng DonHang
        sqlOrders.push({
          id: newOrderId,
          customerName,
          phone,
          email,
          address,
          km,
          subtotal,
          shipFee: shipCalc.fee,
          total: grandTotal,
          method: paymentMethod,
          status: "Đang chuẩn bị (Giao trong 1 tiếng)",
          createdAt: nowStr,
          items: itemsSummary
        });

        // Tạo nội dung Email xác nhận đúng từng chữ theo yêu cầu
        const emailBody = buildConfirmationEmailBody(customerName, paymentMethod);
        const emailSubject = `[CƠM TRƯA ANH BÉO] Xác nhận đơn hàng #${newOrderId} thành công`;

        sqlEmails.push({
          id: sqlEmails.length + 1,
          orderId: newOrderId,
          to: email,
          subject: emailSubject,
          body: emailBody,
          sentAt: nowStr
        });

        document.getElementById("stepBadge3").className = "px-3 py-1.5 rounded-full bg-emerald-600 text-white";

        // Hiển thị Modal Email xác nhận
        document.getElementById("emailModalRecipient").textContent = email;
        document.getElementById("emailModalSubject").textContent = emailSubject;
        document.getElementById("emailModalBodyText").textContent = emailBody;
        document.getElementById("emailModalOrderId").textContent = `#${newOrderId}`;
        document.getElementById("emailModalMethod").textContent = paymentMethod;
        document.getElementById("emailModalTotal").textContent = formatVND(grandTotal);
        document.getElementById("modalOrderSuccessEmail").classList.remove("hidden");
      });

      const closeSuccessModal = () => {
        document.getElementById("modalOrderSuccessEmail").classList.add("hidden");
      };
      document.getElementById("btnCloseSuccessModalTop").addEventListener("click", closeSuccessModal);
      document.getElementById("btnCloseSuccessModalBottom").addEventListener("click", () => {
        closeSuccessModal();
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
        try {
          const res = await fetch("/auth/antiforgery", { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (data?.token) {
              document.querySelectorAll('input[name="__RequestVerificationToken"]').forEach(el => {
                el.value = data.token;
              });
              return data.token;
            }
          }
        } catch (_) {}
        return null;
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

      function submitAdminLoginForm(customerForm) {
        const adminForm = document.createElement("form");
        adminForm.method = "post";
        adminForm.action = "/admin/login";
        adminForm.classList.add("hidden");

        for (const name of ["Identifier", "Password", "__RequestVerificationToken", "returnUrl"]) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = name;
          input.value = name === "returnUrl" ? "/admin" : customerForm.elements[name]?.value ?? "";
          adminForm.appendChild(input);
        }

        document.body.appendChild(adminForm);
        adminForm.submit();
      }

      async function submitAuthForm(event, url, successMessage) {
        event.preventDefault();
        if (authRequestInProgress) return;

        authRequestInProgress = true;
        const form = event.currentTarget;
        form.setAttribute("aria-busy", "true");
        try {
          const result = await postAuthForm(form, url);
          currentUser = result.user;
          updateAuthHeaderState();
          form.reset();
          modalAuth.classList.add("hidden");
          showToast(successMessage(currentUser));
        } catch (error) {
          if (error.status === 403) {
            submitAdminLoginForm(form);
            return;
          }
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
          currentUser = result.user || null;
          updateAuthHeaderState();
        } catch (error) {
          console.error("Không thể tải trạng thái tài khoản:", error);
          showToast("Không thể kiểm tra trạng thái đăng nhập. Vui lòng tải lại trang.");
        }
      }

      loadCurrentUser();

    });
