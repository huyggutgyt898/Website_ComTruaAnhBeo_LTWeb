using ComTruaAnhBeo.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace ComTruaAnhBeo.Controllers
{
    public class HomeController : Controller
    {
        private readonly ComTruaAnhBeoContext _db;

        public HomeController(ComTruaAnhBeoContext db)
        {
            _db = db;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpGet("/api/menu")]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> Menu(CancellationToken cancellationToken)
        {
            var orderCounts = _db.CtDonHangs
                .AsNoTracking()
                .Where(detail => detail.MaCtcha == null && detail.MaDonNavigation.TrangThai != "Huy")
                .GroupBy(detail => detail.MaMon)
                .Select(group => new
                {
                    dishId = group.Key,
                    totalOrdered = group.Sum(detail => detail.SoLuong)
                });

            var dishes = await (
                from dish in _db.MonAns.AsNoTracking()
                join orderCount in orderCounts on dish.MaMon equals orderCount.dishId into dishOrderCounts
                from orderCount in dishOrderCounts.DefaultIfEmpty()
                where dish.LoaiMon == "Chinh" && dish.ConMon
                select new
                {
                    id = dish.MaMon,
                    name = dish.TenMon,
                    description = dish.MoTa,
                    imageUrl = dish.HinhAnh,
                    category = dish.DanhMuc,
                    price = dish.Gia,
                    totalOrdered = (int?)orderCount.totalOrdered ?? 0
                })
                .OrderByDescending(dish => dish.totalOrdered)
                .ThenBy(dish => dish.id)
                .ToListAsync(cancellationToken);

            return Ok(dishes.Select((dish, index) => new
            {
                dish.id,
                dish.name,
                dish.description,
                dish.imageUrl,
                dish.category,
                dish.price,
                dish.totalOrdered,
                popularRank = index < 3 && dish.totalOrdered > 0 ? index + 1 : (int?)null
            }));
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
