/**
 * Cơm Trưa Anh Béo - Food Management Module (Quản lý món ăn)
 * Script file: wwwroot/js/adminpage.js
 */

/* ========================================================================
   1. DATA STRUCTURES & 44 MOCK VIETNAMESE DISHES
   ======================================================================== */
const FOOD_IMAGES = {
  suon: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop&q=80",
  ga: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400&auto=format&fit=crop&q=80",
  bo: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&auto=format&fit=crop&q=80",
  ca: "https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400&auto=format&fit=crop&q=80",
  chay: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&auto=format&fit=crop&q=80",
  dacbiet: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&auto=format&fit=crop&q=80",
  canh: "https://images.unsplash.com/photo-1547592180-85f173990554?w=400&auto=format&fit=crop&q=80"
};

let dishes = [
  // Nhóm 1: Cơm sườn & Heo (8 món)
  { id: "MON-001", name: "Cơm sườn bì chả", category: "Cơm sườn & Heo", price: 45000, available: true, visible: true, image: FOOD_IMAGES.suon, desc: "Sườn nướng mật ong than hồng, bì heo trộn thính thơm giòn và chả trứng hấp truyền thống béo bùi.", toppings: ["Chả trứng", "Bì heo", "Trứng ốp la"] },
  { id: "MON-002", name: "Cơm tấm sườn nướng mỡ hành", category: "Cơm sườn & Heo", price: 40000, available: true, visible: true, image: FOOD_IMAGES.suon, desc: "Sườn cốt lết ướp đậm đà, phủ đẫm mỡ hành béo ngậy kèm đồ chua và nước mắm ớt chua ngọt.", toppings: ["Trứng ốp la", "Bì heo"] },
  { id: "MON-003", name: "Cơm thịt kho tàu trứng cút", category: "Cơm sườn & Heo", price: 38000, available: true, visible: true, image: FOOD_IMAGES.suon, desc: "Thịt ba chỉ heo kho mềm rục nước dừa xiêm, màu cánh gián hấp dẫn cùng 3 quả trứng cút thấm vị.", toppings: ["Canh chua", "Trứng ốp la"] },
  { id: "MON-004", name: "Cơm heo quay cải chua xào", category: "Cơm sườn & Heo", price: 42000, available: true, visible: true, image: FOOD_IMAGES.suon, desc: "Heo quay da giòn rụm xào cùng dưa cải chua giòn thanh mát, nước sốt sệt sánh quyện cơm nóng.", toppings: ["Trứng ốp la", "Chả trứng"] },
  { id: "MON-005", name: "Cơm sườn non ram mặn ngọt", category: "Cơm sườn & Heo", price: 45000, available: true, visible: true, image: FOOD_IMAGES.suon, desc: "Sườn non chặt miếng vừa ăn, ram keo với nước mắm ngon tỏi ớt, chuẩn vị cơm mẹ nấu.", toppings: ["Canh rong biển"] },
  { id: "MON-006", name: "Cơm ba rọi luộc cà pháo mắm tôm", category: "Cơm sườn & Heo", price: 40000, available: true, visible: true, image: FOOD_IMAGES.suon, desc: "Ba chỉ cuộn luộc thái mỏng giòn sần sật ăn kèm cà pháo giòn tan và mắm tôm pha chanh ớt sủi bọt.", toppings: ["Canh khổ qua"] },
  { id: "MON-007", name: "Cơm xá xíu mật ong Quảng Đông", category: "Cơm sườn & Heo", price: 42000, available: false, visible: true, image: FOOD_IMAGES.suon, desc: "Thịt nạc vai ướp ngũ vị hương và mật ong rừng, nướng chín tới mọng nước thơm nức mũi.", toppings: ["Trứng ốp la"] },
  { id: "MON-008", name: "Cơm thịt băm sốt cà chua nấm", category: "Cơm sườn & Heo", price: 35000, available: true, visible: false, image: FOOD_IMAGES.suon, desc: "Thịt nạc dăm xay nhuyễn om cùng cà chua tươi chín mọng và nấm hương thanh ngọt thanh mát.", toppings: ["Trứng ốp la"] },

  // Nhóm 2: Cơm gà (7 món)
  { id: "MON-009", name: "Cơm gà xối mỡ đùi góc tư", category: "Cơm gà", price: 48000, available: true, visible: true, image: FOOD_IMAGES.ga, desc: "Đùi gà góc tư xối mỡ da giòn rụm màu hổ phách, thịt bên trong mềm ngọt mọng nước ăn với cơm đảo đỏ.", toppings: ["Trứng ốp la", "Kim chi"] },
  { id: "MON-010", name: "Cơm đùi gà nướng mật ong", category: "Cơm gà", price: 45000, available: true, visible: true, image: FOOD_IMAGES.ga, desc: "Gà ta ướp mật ong hoa nhãn nướng thơm lừng, chấm muối tiêu chanh ớt hiểm đậm đà khó cưỡng.", toppings: ["Chả trứng", "Canh chua"] },
  { id: "MON-011", name: "Cơm gà luộc lá chanh truyền thống", category: "Cơm gà", price: 42000, available: true, visible: true, image: FOOD_IMAGES.ga, desc: "Thịt gà ta thả vườn da vàng óng, thịt chắc ngọt ăn kèm lá chanh thái chỉ và nước chấm gừng tỏi.", toppings: ["Canh khổ qua"] },
  { id: "MON-012", name: "Cơm gà kho sả ớt cay nồng", category: "Cơm gà", price: 38000, available: true, visible: true, image: FOOD_IMAGES.ga, desc: "Gà kho sả ớt thái nhỏ, tiêu cay the nồng ấm bụng trong những bữa trưa văn phòng bận rộn.", toppings: ["Trứng ốp la"] },
  { id: "MON-013", name: "Cơm cánh gà chiên nước mắm tỏi ớt", category: "Cơm gà", price: 42000, available: true, visible: true, image: FOOD_IMAGES.ga, desc: "Cánh gà chiên phủ sốt nước mắm tỏi ớt kẹo dẻo thơm ngào ngạt, kích thích vị giác tối đa.", toppings: ["Trứng ốp la"] },
  { id: "MON-014", name: "Cơm gà xào nấm đông cô", category: "Cơm gà", price: 40000, available: false, visible: true, image: FOOD_IMAGES.ga, desc: "Gà phi lê áp chảo xào nấm đông cô và hành boa-rô ngập nước sốt dầu hào thơm ngậy.", toppings: ["Canh rong biển"] },
  { id: "MON-015", name: "Cơm gà sốt me chua ngọt", category: "Cơm gà", price: 42000, available: true, visible: false, image: FOOD_IMAGES.ga, desc: "Ức gà giòn sốt me chua dịu rắc đậu phộng rang giã dập và ớt lát.", toppings: ["Trứng ốp la"] },

  // Nhóm 3: Cơm bò (6 món)
  { id: "MON-016", name: "Cơm bò lúc lắc khoai tây chiên", category: "Cơm bò", price: 55000, available: true, visible: true, image: FOOD_IMAGES.bo, desc: "Thăn bò Úc mềm thái hạt lựu áp chảo lửa lớn với bơ tỏi, ớt chuông xanh đỏ và khoai tây vàng giòn.", toppings: ["Trứng ốp la", "Kim chi"] },
  { id: "MON-017", name: "Cơm bò xào bông cải xanh cần tây", category: "Cơm bò", price: 48000, available: true, visible: true, image: FOOD_IMAGES.bo, desc: "Bò mềm xào nhanh tay với súp lơ xanh giòn ngọt và cần tây thơm mát, giàu vitamin cho ngày dài.", toppings: ["Canh rong biển"] },
  { id: "MON-018", name: "Cơm bắp bò kho gừng sả", category: "Cơm bò", price: 50000, available: true, visible: true, image: FOOD_IMAGES.bo, desc: "Bắp bò hoa giòn gân hầm kỹ cùng gừng già và sả cây thơm phức, nước kho ngọt thịt tự nhiên.", toppings: ["Trứng ốp la"] },
  { id: "MON-019", name: "Cơm bò né trứng ốp pate", category: "Cơm bò", price: 52000, available: true, visible: true, image: FOOD_IMAGES.bo, desc: "Bò né bơ thơm nức kèm 1 trứng ốp la lòng đào và pate gan béo ngậy hảo hạng.", toppings: ["Chả trứng", "Bì heo"] },
  { id: "MON-020", name: "Cơm bò sốt tiêu đen Phú Quốc", category: "Cơm bò", price: 55000, available: true, visible: false, image: FOOD_IMAGES.bo, desc: "Bò thăn thái lát mỏng quyện sốt tiêu đen cay nồng thơm lừng ngào ngạt.", toppings: ["Trứng ốp la"] },
  { id: "MON-021", name: "Cơm bò xào đậu que giòn ngọt", category: "Cơm bò", price: 45000, available: true, visible: true, image: FOOD_IMAGES.bo, desc: "Bò xào đậu cô-ve xanh mướt, rắc tiêu sọ cay nhẹ, món cơm trưa thanh đạm nhẹ bụng.", toppings: ["Canh chua"] },

  // Nhóm 4: Cơm cá & Hải sản (8 món)
  { id: "MON-022", name: "Cơm cá hú kho tộ đậm đà", category: "Cơm cá & Hải sản", price: 40000, available: true, visible: true, image: FOOD_IMAGES.ca, desc: "Khúc cá hú béo ngậy kho trong tộ đất với nước mắm nhĩ và tiêu sọ, thơm nức mũi đưa cơm.", toppings: ["Canh chua"] },
  { id: "MON-023", name: "Cơm cá diêu hồng chiên xù mắm xoài", category: "Cơm cá & Hải sản", price: 42000, available: true, visible: true, image: FOOD_IMAGES.ca, desc: "Cá diêu hồng tươi sống chiên xù giòn tan ăn kèm gỏi xoài xanh băm sợi và mắm tỏi ớt.", toppings: ["Canh khổ qua"] },
  { id: "MON-024", name: "Cơm cá lóc kho thịt ba chỉ", category: "Cơm cá & Hải sản", price: 45000, available: true, visible: true, image: FOOD_IMAGES.ca, desc: "Cá lóc đồng săn chắc kho cùng những miếng thịt ba rọi béo mềm tươm mỡ đậm đà hương vị quê.", toppings: ["Canh chua"] },
  { id: "MON-025", name: "Cơm cá nục sốt cà chua hành tây", category: "Cơm cá & Hải sản", price: 38000, available: true, visible: true, image: FOOD_IMAGES.ca, desc: "Cá nục biển rim mềm thơm lừng cùng cà chua tươi và hành tây ngọt dịu, chua chua cay cay.", toppings: ["Trứng ốp la"] },
  { id: "MON-026", name: "Cơm tôm rim thịt ba rọi", category: "Cơm cá & Hải sản", price: 48000, available: true, visible: true, image: FOOD_IMAGES.ca, desc: "Tôm sú tươi lột vỏ rim kẹo bóng bẩy cùng thịt ba chỉ giòn rụm, màu đỏ gạch bắt mắt.", toppings: ["Canh rau đay"] },
  { id: "MON-027", name: "Cơm mực nhồi thịt sốt cay", category: "Cơm cá & Hải sản", price: 52000, available: false, visible: true, image: FOOD_IMAGES.ca, desc: "Mực ống tươi dày mình nhồi thịt nạc nấm mèo giòn sần sật sốt ớt chua ngọt.", toppings: ["Trứng ốp la"] },
  { id: "MON-028", name: "Cơm mực xào chua ngọt ớt chuông", category: "Cơm cá & Hải sản", price: 48000, available: true, visible: true, image: FOOD_IMAGES.ca, desc: "Mực tươi khía vảy rồng xào giòn sần sật với dứa chín, dưa leo, cà chua và cần tây.", toppings: ["Canh chua"] },
  { id: "MON-029", name: "Cơm cá bống dừa kho tiêu đen", category: "Cơm cá & Hải sản", price: 42000, available: false, visible: false, image: FOOD_IMAGES.ca, desc: "Cá bống tươi làm sạch kho kẹo sánh quyện với nhiều tiêu đen cay ấm nồng.", toppings: ["Canh khổ qua"] },

  // Nhóm 5: Cơm phần đặc biệt (6 món)
  { id: "MON-030", name: "Cơm tấm thập cẩm đại vương", category: "Cơm phần đặc biệt", price: 65000, available: true, visible: true, image: FOOD_IMAGES.dacbiet, desc: "Phần cơm đại vương gồm sườn cây nướng to, chả trứng, bì thính, ốp la, xúc xích và lạp xưởng tôm.", toppings: ["Chả trứng", "Bì heo", "Trứng ốp la"] },
  { id: "MON-031", name: "Cơm đùi vịt tiềm nấm đông cô", category: "Cơm phần đặc biệt", price: 58000, available: true, visible: true, image: FOOD_IMAGES.dacbiet, desc: "Đùi vịt tiềm thảo mộc bắc thơm dịu, da mềm thịt rục, nước súp ngọt thanh tẩm bổ sức khỏe.", toppings: ["Kim chi"] },
  { id: "MON-032", name: "Cơm chiên Dương Châu hải vị", category: "Cơm phần đặc biệt", price: 45000, available: true, visible: true, image: FOOD_IMAGES.dacbiet, desc: "Cơm hạt vàng tơi thơm phức chiên cùng tôm nõn, lạp xưởng Mai Quế Lộ, đậu Hà Lan và cà rốt.", toppings: ["Trứng ốp la"] },
  { id: "MON-033", name: "Cơm chiên cá mặn gà xé gừng hành", category: "Cơm phần đặc biệt", price: 45000, available: true, visible: true, image: FOOD_IMAGES.dacbiet, desc: "Hạt cơm giòn rụm thơm nồng vị cá mặn rút xương và ức gà xé sợi quyện hương gừng ấm.", toppings: ["Kim chi"] },
  { id: "MON-034", name: "Cơm chiên kim chi bò Mỹ trứng lòng đào", category: "Cơm phần đặc biệt", price: 50000, available: true, visible: true, image: FOOD_IMAGES.dacbiet, desc: "Cơm chiên kim chi cay cay giòn giòn, thịt ba chỉ bò Mỹ áp chảo và quả trứng ốp la béo ngậy.", toppings: ["Trứng ốp la"] },
  { id: "MON-035", name: "Cơm chiên hải sản sốt XO đặc biệt", category: "Cơm phần đặc biệt", price: 55000, available: true, visible: false, image: FOOD_IMAGES.dacbiet, desc: "Hải sản tươi tôm mực điệp chiên cùng sốt XO trứ danh thơm cay quyến rũ.", toppings: ["Trứng ốp la"] },

  // Nhóm 6: Cơm chay (5 món)
  { id: "MON-036", name: "Cơm chay nấm đùi gà kho tiêu xanh", category: "Cơm chay", price: 35000, available: true, visible: true, image: FOOD_IMAGES.chay, desc: "Nấm đùi gà tươi dai ngọt kho cùng tiêu xanh giòn cay, món ăn thanh tịnh đủ dưỡng chất.", toppings: ["Canh rong biển"] },
  { id: "MON-037", name: "Cơm đậu hũ nhồi nấm sốt cà chua", category: "Cơm chay", price: 32000, available: true, visible: true, image: FOOD_IMAGES.chay, desc: "Đậu hũ chiên vàng nhồi nấm mèo mộc nhĩ om sốt cà chua tươi sánh mịn thơm ngậy.", toppings: ["Canh chua"] },
  { id: "MON-038", name: "Cơm nấm rơm xào bông cải thập cẩm", category: "Cơm chay", price: 35000, available: true, visible: true, image: FOOD_IMAGES.chay, desc: "Nấm rơm búp xào cùng cà rốt, bắp non và súp lơ xanh giòn ngọt tự nhiên.", toppings: ["Canh khổ qua"] },
  { id: "MON-039", name: "Cơm sườn non chay rim mè rang", category: "Cơm chay", price: 35000, available: true, visible: true, image: FOOD_IMAGES.chay, desc: "Sườn chay đậu nành chiên giòn rim sốt tương ngọt và rắc mè trắng rang vàng thơm.", toppings: ["Kim chi"] },
  { id: "MON-040", name: "Cơm canh chua chay đậu hũ bắp non", category: "Cơm chay", price: 35000, available: true, visible: false, image: FOOD_IMAGES.chay, desc: "Phần cơm kèm tô canh chua bắp non đậu hũ bạc hà thơm mát đậm đà thanh vị.", toppings: ["Canh rong biển"] },

  // Nhóm 7: Canh & Đồ uống (4 món)
  { id: "MON-041", name: "Canh khổ qua dồn thịt bằm", category: "Canh & Đồ uống", price: 15000, available: true, visible: true, image: FOOD_IMAGES.canh, desc: "Khổ qua rừng đắng thanh nhồi nạc dăm hành tiêu, nước canh trong veo giải nhiệt ngày nắng.", toppings: [] },
  { id: "MON-042", name: "Canh chua cá lóc bắp chuối", category: "Canh & Đồ uống", price: 18000, available: true, visible: true, image: FOOD_IMAGES.canh, desc: "Canh chua chuẩn vị Tây Nam Bộ với khóm, cà chua, bắp chuối và ngò gai om thơm.", toppings: [] },
  { id: "MON-043", name: "Canh cua rau đay mướp hương", category: "Canh & Đồ uống", price: 18000, available: true, visible: true, image: FOOD_IMAGES.canh, desc: "Cua đồng giã tay nấu rau đay mướp hương béo bùi, món canh truyền thống dân dã.", toppings: [] },
  { id: "MON-044", name: "Trà tắc mật ong nha đam hạt chia", category: "Canh & Đồ uống", price: 15000, available: true, visible: false, image: FOOD_IMAGES.dacbiet, desc: "Trà lài ủ lạnh pha nước tắc tươi, mật ong hoa nhãn và nha đam giòn mát lịm tim.", toppings: [] }
];

// Size data for Tab 2
let sizeOptions = [
  { id: "SZ-01", name: "Size Vừa (Tiêu chuẩn)", code: "SIZE_M", price: 0, isDefault: true },
  { id: "SZ-02", name: "Size Lớn (Nhiều cơm + đồ xào)", code: "SIZE_L", price: 10000, isDefault: false },
  { id: "SZ-03", name: "Cơm thêm hạt tấm thơm", code: "EXTRA_RICE", price: 5000, isDefault: false },
  { id: "SZ-04", name: "Cơm cháy giòn rụm mỡ hành", code: "CRISPY_RICE", price: 8000, isDefault: false }
];

// Toppings / Add-ons data for Tab 2
let toppingOptions = [
  { id: "TOP-01", name: "Trứng ốp la lòng đào", subtype: "Trứng & Chả", price: 7000, available: true },
  { id: "TOP-02", name: "Chả trứng hấp thịt băm", subtype: "Trứng & Chả", price: 8000, available: true },
  { id: "TOP-03", name: "Bì heo trộn thính thơm giòn", subtype: "Món mặn thêm", price: 8000, available: true },
  { id: "TOP-04", name: "Sườn cây nướng thêm", subtype: "Món mặn thêm", price: 25000, available: true },
  { id: "TOP-05", name: "Đùi gà chiên mắm thêm", subtype: "Món mặn thêm", price: 25000, available: true },
  { id: "TOP-06", name: "Canh khổ qua nhồi thịt", subtype: "Canh thêm", price: 15000, available: true },
  { id: "TOP-07", name: "Canh chua cá lóc (phần nhỏ)", subtype: "Canh thêm", price: 18000, available: true },
  { id: "TOP-08", name: "Canh rong biển thịt bằm", subtype: "Canh thêm", price: 12000, available: true },
  { id: "TOP-09", name: "Kim chi chua cay Hàn Quốc", subtype: "Món mặn thêm", price: 6000, available: true },
  { id: "TOP-10", name: "Trà đá hoa lài tươi mát", subtype: "Đồ uống & Tráng miệng", price: 3000, available: true },
  { id: "TOP-11", name: "Trà tắc mật ong đá", subtype: "Đồ uống & Tráng miệng", price: 12000, available: true },
  { id: "TOP-12", name: "Nước ngọt lon các loại", subtype: "Đồ uống & Tráng miệng", price: 15000, available: true }
];

/* ========================================================================
   2. STATE VARIABLES
   ======================================================================== */
let selectedDishId = "MON-001";
let isCreateMode = false;
let currentPage = 1;
let itemsPerPage = 8;
let filteredDishes = [...dishes];

/* ========================================================================
   3. INITIALIZATION & CORE LIFECYCLE
   ======================================================================== */
window.addEventListener("DOMContentLoaded", () => {
  renderKPIs();
  handleSearchFilter();
  renderTab2Tables();
  selectDish("MON-001");
  setupToppingChips();
  setupNotificationHandlers();
});

/* ========================================================================
   4. FORMATTING UTILITIES
   ======================================================================== */
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount).replace('₫', 'đ');
}

function renderKPIs() {
  const total = dishes.length;
  const active = dishes.filter(d => d.visible && d.available).length;
  const hidden = dishes.filter(d => !d.visible).length;
  const out = dishes.filter(d => !d.available).length;

  document.getElementById("statTotalDishes").textContent = total;
  document.getElementById("statActiveDishes").textContent = active;
  document.getElementById("statHiddenDishes").textContent = hidden;
  document.getElementById("statOutDishes").textContent = out;

  document.getElementById("tab1Counter").textContent = total;
  document.getElementById("tab2Counter").textContent = sizeOptions.length + toppingOptions.length;
}

/* ========================================================================
   5. TAB SWITCHING (EXACTLY TWO TABS)
   ======================================================================== */
function switchMainTab(tabId) {
  document.getElementById("tabBtn1").classList.toggle("active", tabId === 'tab-danh-sach');
  document.getElementById("tabBtn2").classList.toggle("active", tabId === 'tab-size-mon-them');

  document.getElementById("tab-danh-sach").classList.toggle("active", tabId === 'tab-danh-sach');
  document.getElementById("tab-size-mon-them").classList.toggle("active", tabId === 'tab-size-mon-them');
}

/* ========================================================================
   6. TABLE FILTERING, SORTING & PAGINATION
   ======================================================================== */
function handleSearchFilter() {
  const searchInput = document.getElementById("searchInput");
  const filterCat = document.getElementById("filterCategory");
  const filterAvail = document.getElementById("filterAvailability");
  const filterVis = document.getElementById("filterVisibility");
  const sortOrd = document.getElementById("sortOrder");

  if (!searchInput) return;

  const searchVal = searchInput.value.trim().toLowerCase();
  const categoryVal = filterCat.value;
  const availVal = filterAvail.value;
  const visVal = filterVis.value;
  const sortVal = sortOrd.value;

  filteredDishes = dishes.filter(item => {
    // Search text
    const matchName = item.name.toLowerCase().includes(searchVal);
    const matchCode = item.id.toLowerCase().includes(searchVal);
    if (!matchName && !matchCode) return false;

    // Category filter
    if (categoryVal !== "all" && item.category !== categoryVal) return false;

    // Availability filter
    if (availVal === "available" && !item.available) return false;
    if (availVal === "out_of_stock" && item.available) return false;

    // Visibility filter
    if (visVal === "visible" && !item.visible) return false;
    if (visVal === "hidden" && item.visible) return false;

    return true;
  });

  // Sorting
  if (sortVal === "price-asc") {
    filteredDishes.sort((a, b) => a.price - b.price);
  } else if (sortVal === "price-desc") {
    filteredDishes.sort((a, b) => b.price - a.price);
  } else if (sortVal === "name-asc") {
    filteredDishes.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }

  currentPage = 1;
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById("foodTableBody");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (filteredDishes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <div style="font-weight: 700; font-size: 15px;">Không tìm thấy món ăn phù hợp</div>
          <div style="font-size: 13px; margin-top: 4px;">Thử thay đổi từ khóa tìm kiếm hoặc bỏ bớt các bộ lọc.</div>
        </td>
      </tr>
    `;
    document.getElementById("paginationSummary").textContent = "Không có kết quả nào";
    document.getElementById("paginationControls").innerHTML = "";
    return;
  }

  const totalItems = filteredDishes.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageItems = filteredDishes.slice(startIndex, endIndex);

  pageItems.forEach(dish => {
    const isSelected = (!isCreateMode && dish.id === selectedDishId);
    const tr = document.createElement("tr");
    if (isSelected) tr.classList.add("selected-row");

    tr.onclick = (e) => {
      if (e.target.closest('.badge-status') || e.target.closest('.action-icon-btn')) return;
      selectDish(dish.id);
    };

    tr.innerHTML = `
      <td style="font-weight: 700; color: var(--brand-burgundy); font-size: 12.5px;">${dish.id}</td>
      <td>
        <div class="food-cell-meta">
          <div class="food-thumb-box">
            <img src="${dish.image}" alt="${dish.name}" onerror="this.src='${FOOD_IMAGES.suon}'">
          </div>
          <div class="food-text-details">
            <span class="food-name-strong">${dish.name}</span>
            <span class="food-category-tag">${dish.category}</span>
          </div>
        </div>
      </td>
      <td>
        <span class="food-price-text">${formatVND(dish.price)}</span>
      </td>
      <td style="text-align: center;">
        <span class="badge-status ${dish.available ? 'badge-available' : 'badge-out-of-stock'}" 
              onclick="quickToggleAvailability('${dish.id}', event)" 
              title="Nhấn để đổi trạng thái">
          <span class="status-dot"></span>
          <span>${dish.available ? 'Còn món' : 'Hết món'}</span>
        </span>
      </td>
      <td style="text-align: center;">
        <span class="badge-status ${dish.visible ? 'badge-visible' : 'badge-hidden'}" 
              onclick="quickToggleVisibility('${dish.id}', event)" 
              title="Nhấn để đổi hiển thị">
          <span>${dish.visible ? '👁️ Đang hiện' : '🔒 Đang ẩn'}</span>
        </span>
      </td>
      <td style="text-align: right;">
        <div class="table-actions-cell" style="justify-content: flex-end;">
          <button class="action-icon-btn" title="Xem chi tiết" onclick="selectDish('${dish.id}')">
            <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12C2.73 16.39 7 19.5 12 19.5C17 19.5 21.27 16.39 23 12C21.27 7.61 17 4.5 12 4.5ZM12 17C9.24 17 7 14.76 7 12C7 9.24 9.24 7 12 7C14.76 7 17 9.24 17 12C17 14.76 14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12C15 10.34 13.66 9 12 9Z"/></svg>
          </button>
          <button class="action-icon-btn danger" title="Xóa món" onclick="prepareDeleteDish('${dish.id}', event)">
            <svg viewBox="0 0 24 24"><path d="M19 4H15.5L14.5 3H9.5L8.5 4H5V6H19M6 19A2 2 0 0 0 8 21H16A2 2 0 0 0 18 19V7H6V19Z"/></svg>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Pagination Summary
  document.getElementById("paginationSummary").textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong tổng số ${totalItems} món ăn`;

  // Pagination Controls
  renderPaginationButtons(totalPages);
}

function renderPaginationButtons(totalPages) {
  const wrapper = document.getElementById("paginationControls");
  wrapper.innerHTML = "";

  if (totalPages <= 1) return;

  // Prev Button
  const prevBtn = document.createElement("button");
  prevBtn.className = "page-btn";
  prevBtn.textContent = "‹";
  prevBtn.disabled = (currentPage === 1);
  prevBtn.onclick = () => { currentPage--; renderTable(); };
  wrapper.appendChild(prevBtn);

  // Page numbers
  for (let p = 1; p <= totalPages; p++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = `page-btn ${p === currentPage ? 'active' : ''}`;
    pageBtn.textContent = p;
    pageBtn.onclick = () => { currentPage = p; renderTable(); };
    wrapper.appendChild(pageBtn);
  }

  // Next Button
  const nextBtn = document.createElement("button");
  nextBtn.className = "page-btn";
  nextBtn.textContent = "›";
  nextBtn.disabled = (currentPage === totalPages);
  nextBtn.onclick = () => { currentPage++; renderTable(); };
  wrapper.appendChild(nextBtn);
}

/* ========================================================================
   7. RIGHT DETAIL PANEL LOGIC & SELECTION
   ======================================================================== */
function selectDish(id) {
  isCreateMode = false;
  selectedDishId = id;
  const dish = dishes.find(d => d.id === id);
  if (!dish) return;

  // Update Panel Header
  document.getElementById("panelHeaderTitle").textContent = "CHI TIẾT MÓN ĂN";
  document.getElementById("panelHeaderSubtitle").textContent = "Xem & chỉnh sửa chi tiết món ăn";
  document.getElementById("panelFoodIdBadge").textContent = "#" + dish.id;

  // Update Preview Image
  const imgElem = document.getElementById("panelImagePreview");
  imgElem.src = dish.image;
  imgElem.alt = dish.name;

  const floatStatus = document.getElementById("panelFloatingStatus");
  floatStatus.className = `preview-floating-status ${dish.available ? 'badge-available' : 'badge-out-of-stock'}`;
  floatStatus.textContent = dish.available ? "Còn món" : "Hết món";

  // Fill Form Values
  document.getElementById("formFoodCode").value = dish.id;
  document.getElementById("formFoodCategory").value = dish.category;
  document.getElementById("formFoodName").value = dish.name;
  document.getElementById("formFoodPrice").value = dish.price;
  document.getElementById("formFoodDesc").value = dish.desc || "";

  // Availability Radios
  const availRadios = document.getElementsByName("formAvailRadio");
  if (availRadios.length >= 2) {
    availRadios[0].checked = dish.available;
    availRadios[1].checked = !dish.available;
  }

  // Visibility Radios
  const visRadios = document.getElementsByName("formVisRadio");
  if (visRadios.length >= 2) {
    visRadios[0].checked = dish.visible;
    visRadios[1].checked = !dish.visible;
  }

  updateRadioPills();

  // Check applicable toppings
  const checkboxes = document.querySelectorAll("#toppingsChipGroup input[type='checkbox']");
  checkboxes.forEach(cb => {
    cb.checked = (dish.toppings && dish.toppings.includes(cb.value));
  });

  // Actions Buttons & Visibility State
  document.getElementById("existingItemActionRow").style.display = "grid";
  document.getElementById("btnCancelCreateMode").style.display = "none";
  document.getElementById("btnSaveText").textContent = "Lưu thay đổi";

  const toggleVisText = document.getElementById("btnToggleVisText");
  const toggleVisIcon = document.getElementById("btnToggleVisIcon");
  if (dish.visible) {
    toggleVisText.textContent = "Ẩn món này";
    toggleVisIcon.textContent = "🔒";
  } else {
    toggleVisText.textContent = "Hiện món này";
    toggleVisIcon.textContent = "👁️";
  }

  // Re-highlight table row
  const rows = document.querySelectorAll("#foodTableBody tr");
  rows.forEach(r => r.classList.remove("selected-row"));
  rows.forEach(r => {
    if (r.children[0] && r.children[0].textContent.trim() === dish.id) {
      r.classList.add("selected-row");
    }
  });
}

function setupToppingChips() {
  const container = document.getElementById("toppingsChipGroup");
  if (!container) return;
  container.innerHTML = "";
  toppingOptions.forEach(opt => {
    const chip = document.createElement("label");
    chip.className = "topping-chip";
    chip.innerHTML = `
      <input type="checkbox" value="${opt.name}">
      <span>${opt.name}</span>
    `;
    container.appendChild(chip);
  });
}

function updateRadioPills() {
  const availChecked = document.querySelector("input[name='formAvailRadio']:checked");
  const visChecked = document.querySelector("input[name='formVisRadio']:checked");
  if (!availChecked || !visChecked) return;

  const availVal = availChecked.value === "true";
  const visVal = visChecked.value === "true";

  const lblAvailYes = document.getElementById("labelAvailYes");
  const lblAvailNo = document.getElementById("labelAvailNo");
  if (lblAvailYes && lblAvailNo) {
    lblAvailYes.className = `pill-radio-label ${availVal ? 'active-success' : ''}`;
    lblAvailNo.className = `pill-radio-label ${!availVal ? 'active-danger' : ''}`;
  }

  const lblVisYes = document.getElementById("labelVisYes");
  const lblVisNo = document.getElementById("labelVisNo");
  if (lblVisYes && lblVisNo) {
    lblVisYes.className = `pill-radio-label ${visVal ? 'active-info' : ''}`;
    lblVisNo.className = `pill-radio-label ${!visVal ? 'active-muted' : ''}`;
  }
}

/* ========================================================================
   8. CREATE DISH MODE
   ======================================================================== */
function triggerAddNewDish() {
  isCreateMode = true;
  selectedDishId = null;

  // Deselect rows
  document.querySelectorAll("#foodTableBody tr").forEach(r => r.classList.remove("selected-row"));

  // Next ID
  const maxNum = dishes.reduce((max, d) => {
    const n = parseInt(d.id.replace("MON-", ""), 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const nextId = "MON-" + String(maxNum + 1).padStart(3, "0");

  document.getElementById("panelHeaderTitle").textContent = "THÊM MÓN MỚI";
  document.getElementById("panelHeaderSubtitle").textContent = "Nhập thông tin tạo món ăn mới";
  document.getElementById("panelFoodIdBadge").textContent = "#" + nextId;

  document.getElementById("panelImagePreview").src = FOOD_IMAGES.suon;
  document.getElementById("panelFloatingStatus").className = "preview-floating-status badge-available";
  document.getElementById("panelFloatingStatus").textContent = "Còn món";

  document.getElementById("formFoodCode").value = nextId;
  document.getElementById("formFoodCategory").value = "Cơm sườn & Heo";
  document.getElementById("formFoodName").value = "";
  document.getElementById("formFoodPrice").value = 40000;
  document.getElementById("formFoodDesc").value = "";

  const availRadios = document.getElementsByName("formAvailRadio");
  if (availRadios.length) availRadios[0].checked = true;

  const visRadios = document.getElementsByName("formVisRadio");
  if (visRadios.length) visRadios[0].checked = true;

  updateRadioPills();

  document.querySelectorAll("#toppingsChipGroup input[type='checkbox']").forEach(cb => cb.checked = false);

  document.getElementById("existingItemActionRow").style.display = "none";
  document.getElementById("btnCancelCreateMode").style.display = "flex";
  document.getElementById("btnSaveText").textContent = "+ Tạo món mới";

  document.getElementById("formFoodName").focus();
  showToast("Chuyển sang chế độ thêm món mới", "info");
}

function cancelCreateMode() {
  if (dishes.length > 0) {
    selectDish(dishes[0].id);
  }
}

/* ========================================================================
   9. FORM SUBMISSION (SAVE / UPDATE)
   ======================================================================== */
function handleFormSubmit(e) {
  e.preventDefault();

  const code = document.getElementById("formFoodCode").value;
  const name = document.getElementById("formFoodName").value.trim();
  const category = document.getElementById("formFoodCategory").value;
  const price = parseInt(document.getElementById("formFoodPrice").value, 10);
  const desc = document.getElementById("formFoodDesc").value.trim();
  const available = document.querySelector("input[name='formAvailRadio']:checked").value === "true";
  const visible = document.querySelector("input[name='formVisRadio']:checked").value === "true";
  const image = document.getElementById("panelImagePreview").src;

  const checkedToppings = [];
  document.querySelectorAll("#toppingsChipGroup input[type='checkbox']:checked").forEach(cb => {
    checkedToppings.push(cb.value);
  });

  if (isCreateMode) {
    // Create new dish
    const newDish = {
      id: code,
      name,
      category,
      price,
      desc,
      available,
      visible,
      image,
      toppings: checkedToppings
    };
    dishes.unshift(newDish);
    isCreateMode = false;
    selectedDishId = newDish.id;

    showToast(`Đã thêm món mới: ${name}!`, "success");
  } else {
    // Update existing dish
    const index = dishes.findIndex(d => d.id === selectedDishId);
    if (index !== -1) {
      dishes[index].name = name;
      dishes[index].category = category;
      dishes[index].price = price;
      dishes[index].desc = desc;
      dishes[index].available = available;
      dishes[index].visible = visible;
      dishes[index].image = image;
      dishes[index].toppings = checkedToppings;

      showToast(`Đã lưu thay đổi cho món ${name}!`, "success");
    }
  }

  renderKPIs();
  handleSearchFilter();
  selectDish(selectedDishId || code);
}

/* ========================================================================
   10. QUICK TOGGLES & IMAGE HANDLERS
   ======================================================================== */
function quickToggleAvailability(id, e) {
  if (e) e.stopPropagation();
  const dish = dishes.find(d => d.id === id);
  if (!dish) return;

  dish.available = !dish.available;
  renderKPIs();
  renderTable();

  if (selectedDishId === id) {
    selectDish(id);
  }
  showToast(`Đã đổi trạng thái [${dish.name}] sang ${dish.available ? 'CÒN MÓN' : 'HẾT MÓN'}`, dish.available ? "success" : "warning");
}

function quickToggleVisibility(id, e) {
  if (e) e.stopPropagation();
  const dish = dishes.find(d => d.id === id);
  if (!dish) return;

  dish.visible = !dish.visible;
  renderKPIs();
  renderTable();

  if (selectedDishId === id) {
    selectDish(id);
  }
  showToast(`Đã đổi hiển thị [${dish.name}] sang ${dish.visible ? 'ĐANG HIỆN' : 'ĐANG ẨN'}`, dish.visible ? "success" : "warning");
}

function quickToggleCurrentVisibility() {
  if (!selectedDishId) return;
  quickToggleVisibility(selectedDishId);
}

function promptImageURL() {
  const currentSrc = document.getElementById("panelImagePreview").src;
  const newUrl = prompt("Nhập đường dẫn URL hình ảnh mới cho món ăn:", currentSrc);
  if (newUrl && newUrl.trim() !== "") {
    document.getElementById("panelImagePreview").src = newUrl.trim();
    showToast("Đã cập nhật hình ảnh món ăn!", "success");
  }
}

function handleImageFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      document.getElementById("panelImagePreview").src = e.target.result;
      showToast("Đã tải ảnh lên thành công!", "success");
    };
    reader.readAsDataURL(file);
  }
}

/* ========================================================================
   11. DELETE LOGIC & MODAL
   ======================================================================== */
let dishIdToDelete = null;

function prepareDeleteDish(id, e) {
  if (e) e.stopPropagation();
  dishIdToDelete = id;
  const dish = dishes.find(d => d.id === id);
  if (!dish) return;

  document.getElementById("deleteModalDesc").innerHTML = `Bạn có chắc chắn muốn xóa món <strong>${dish.name} (${dish.id})</strong> khỏi thực đơn?`;
  document.getElementById("deleteModalBackdrop").classList.add("active");
}

function triggerDeleteCurrentDish() {
  if (!selectedDishId) return;
  prepareDeleteDish(selectedDishId);
}

function closeDeleteModal() {
  document.getElementById("deleteModalBackdrop").classList.remove("active");
  dishIdToDelete = null;
}

function confirmDeleteDish() {
  if (!dishIdToDelete) return;
  const index = dishes.findIndex(d => d.id === dishIdToDelete);
  if (index !== -1) {
    const deletedName = dishes[index].name;
    dishes.splice(index, 1);
    showToast(`Đã xóa món ăn [${deletedName}]!`, "danger");

    renderKPIs();
    handleSearchFilter();

    if (dishes.length > 0) {
      selectDish(dishes[0].id);
    } else {
      triggerAddNewDish();
    }
  }
  closeDeleteModal();
}

/* ========================================================================
   12. TAB 2 TABLES (SIZE & TOPPING MANAGEMENT)
   ======================================================================== */
function renderTab2Tables() {
  // Sizes table
  const sizeTbody = document.getElementById("sizeTableBody");
  if (sizeTbody) {
    sizeTbody.innerHTML = "";
    sizeOptions.forEach(sz => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${sz.name}</strong></td>
        <td><code style="font-size: 11.5px; background: #eee; padding: 2px 5px; border-radius: 4px;">${sz.code}</code></td>
        <td><span class="price-plus-tag">${sz.price === 0 ? 'Mặc định (0đ)' : '+' + formatVND(sz.price)}</span></td>
        <td>${sz.isDefault ? '<span style="color: var(--success); font-weight: 700;">✓ Mặc định</span>' : '<span style="color: var(--text-muted);">-</span>'}</td>
        <td style="text-align: right;">
          <button class="action-icon-btn danger" style="display: inline-flex;" onclick="deleteSizeOption('${sz.id}')" title="Xóa size">
            <svg viewBox="0 0 24 24"><path d="M19 4H15.5L14.5 3H9.5L8.5 4H5V6H19M6 19A2 2 0 0 0 8 21H16A2 2 0 0 0 18 19V7H6V19Z"/></svg>
          </button>
        </td>
      `;
      sizeTbody.appendChild(tr);
    });
  }

  // Toppings table
  const toppingTbody = document.getElementById("toppingTableBody");
  if (toppingTbody) {
    toppingTbody.innerHTML = "";
    toppingOptions.forEach(top => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${top.name}</strong></td>
        <td><span class="food-category-tag">${top.subtype}</span></td>
        <td><span class="price-plus-tag">+${formatVND(top.price)}</span></td>
        <td>
          <span class="badge-status ${top.available ? 'badge-available' : 'badge-out-of-stock'}" 
                onclick="toggleToppingAvail('${top.id}')" style="font-size: 11px; padding: 3px 8px;">
            <span class="status-dot"></span>
            <span>${top.available ? 'Còn' : 'Hết'}</span>
          </span>
        </td>
        <td style="text-align: right;">
          <button class="action-icon-btn danger" style="display: inline-flex;" onclick="deleteToppingOption('${top.id}')" title="Xóa món thêm">
            <svg viewBox="0 0 24 24"><path d="M19 4H15.5L14.5 3H9.5L8.5 4H5V6H19M6 19A2 2 0 0 0 8 21H16A2 2 0 0 0 18 19V7H6V19Z"/></svg>
          </button>
        </td>
      `;
      toppingTbody.appendChild(tr);
    });
  }
}

function toggleToppingAvail(id) {
  const item = toppingOptions.find(t => t.id === id);
  if (!item) return;
  item.available = !item.available;
  renderTab2Tables();
  showToast(`Đã đổi trạng thái topping: ${item.name}`, "info");
}

function deleteSizeOption(id) {
  if (confirm("Bạn có chắc muốn xóa cấu hình size này?")) {
    sizeOptions = sizeOptions.filter(s => s.id !== id);
    renderTab2Tables();
    renderKPIs();
    showToast("Đã xóa tùy chọn size", "danger");
  }
}

function deleteToppingOption(id) {
  if (confirm("Bạn có chắc muốn xóa món thêm này?")) {
    toppingOptions = toppingOptions.filter(t => t.id !== id);
    renderTab2Tables();
    setupToppingChips();
    renderKPIs();
    showToast("Đã xóa tùy chọn món thêm", "danger");
  }
}

function openAddOptionModal(type) {
  document.getElementById("optType").value = type;
  if (type === "size") {
    document.getElementById("optionModalTitle").textContent = "Thêm Kích Cỡ Mới";
    document.getElementById("optSubtypeGroup").style.display = "none";
    document.getElementById("optName").placeholder = "Ví dụ: Size Cơm Cháy, Size Tô Khổng Lồ...";
  } else {
    document.getElementById("optionModalTitle").textContent = "Thêm Món Thêm / Topping";
    document.getElementById("optSubtypeGroup").style.display = "block";
    document.getElementById("optName").placeholder = "Ví dụ: Lạp xưởng tôm nướng, Xúc xích Đức...";
  }
  document.getElementById("optName").value = "";
  document.getElementById("optPrice").value = 10000;
  document.getElementById("optionModalBackdrop").classList.add("active");
}

function closeOptionModal() {
  document.getElementById("optionModalBackdrop").classList.remove("active");
}

function saveOptionForm(e) {
  e.preventDefault();
  const type = document.getElementById("optType").value;
  const name = document.getElementById("optName").value.trim();
  const price = parseInt(document.getElementById("optPrice").value, 10);
  const subtype = document.getElementById("optSubtype").value;

  if (type === "size") {
    const nextId = "SZ-" + String(sizeOptions.length + 1).padStart(2, "0");
    const code = "SIZE_" + name.toUpperCase().replace(/\s+/g, "_");
    sizeOptions.push({ id: nextId, name, code, price, isDefault: false });
    showToast(`Đã thêm kích cỡ: ${name}`, "success");
  } else {
    const nextId = "TOP-" + String(toppingOptions.length + 1).padStart(2, "0");
    toppingOptions.push({ id: nextId, name, subtype, price, available: true });
    setupToppingChips();
    showToast(`Đã thêm món thêm: ${name}`, "success");
  }

  renderTab2Tables();
  renderKPIs();
  closeOptionModal();
}

/* ========================================================================
   13. NOTIFICATIONS & HEADER DROPDOWN
   ======================================================================== */
function setupNotificationHandlers() {
  const notiBtn = document.getElementById("notiBtn");
  const notiDropdown = document.getElementById("notiDropdown");

  if (!notiBtn || !notiDropdown) return;

  notiBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    notiDropdown.classList.toggle("active");
  });

  document.addEventListener("click", (e) => {
    if (!notiDropdown.contains(e.target) && e.target !== notiBtn) {
      notiDropdown.classList.remove("active");
    }
  });
}

function markAllNotiRead() {
  document.querySelectorAll(".noti-item").forEach(item => item.classList.remove("unread"));
  const badge = document.getElementById("notiBadgeCount");
  if (badge) badge.style.display = "none";
  showToast("Đã đánh dấu đọc tất cả thông báo", "info");
}

/* Navigation item click handler */
function handleNavClick(module) {
  if (module === 'mon-an') {
    showToast("Bạn đang ở trang Quản lý món ăn", "info");
  } else if (module === 'don-hang') {
    window.location.href = "/admin/orders";
  } else if (module === 'khuyen-mai') {
    window.location.href = "/admin/promotions";
  } else if (module === 'tai-khoan' || module === 'quan-ly-khac') {
    window.location.href = "/admin/accounts";
  }
}

/* ========================================================================
   14. TOAST SYSTEM
   ======================================================================== */
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
