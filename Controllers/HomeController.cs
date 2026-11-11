using ComTruaAnhBeo.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace ComTruaAnhBeo.Controllers
{
    public class HomeController : Controller
    {
        private readonly ComTruaAnhBeoContext _db;

        // Inject DbContext vào HomeController
        public HomeController(ComTruaAnhBeoContext db)
        {
            _db = db;
        }

        public IActionResult Index()
        {
            return View();
        }

        // API trả danh sách món ăn từ SQL Server ra giao diện
        [HttpGet]
        public async Task<IActionResult> GetMenuItems()
        {
            var items = await _db.MonAns
                .Select(m => new
                {
                    id = m.MaMon,
                    name = m.TenMon,
                    desc = m.MoTa ?? "",
                    img = string.IsNullOrEmpty(m.HinhAnh) ? "/images/thumb_suon.jpg" : m.HinhAnh,
                    category = m.DanhMuc,
                    loaiMon = m.LoaiMon,
                    price = (double)m.Gia,
                    extraPrice = (double)(m.PhuThuSizeLon ?? 0),
                    conMon = m.ConMon
                })
                .ToListAsync();

            return Json(items);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}