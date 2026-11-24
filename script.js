// ==========================================
// --- 1. DATA & VARIABEL GLOBAL ---
// ==========================================
const produkDefault = [
    { id: 1, nama: "Tiramisu", harga: 35000, kategori: "Cakes", icon: "cake", gambar: "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=300&auto=format&fit=crop" },
    { id: 2, nama: "Beef Croissant", harga: 25000, kategori: "Breads", icon: "bread", gambar: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?q=80&w=300&auto=format&fit=crop" },
    { id: 3, nama: "Cheese Cake", harga: 40000, kategori: "Cakes", icon: "cake", gambar: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?q=80&w=300&auto=format&fit=crop" }
];

let produkList = JSON.parse(localStorage.getItem('pos_produk_v2')) || produkDefault;
let keranjang = [];
let totalPendapatanHarian = JSON.parse(localStorage.getItem('pos_pendapatan')) || 0;
let produkTerjual = JSON.parse(localStorage.getItem('pos_terjual')) || {};
let filterKategoriAktif = "Semua";
let metodePembayaranAktif = "Cash"; // Default

// Variabel untuk menampung data sementara saat QRIS muncul
let tempSubtotal = 0;
let tempTax = 0;
let tempTotalAkhir = 0;

let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// ==========================================
// --- FUNGSI NOMOR URUT PESANAN ---
// ==========================================
function getTodayString() {
    const now = new Date();
    return now.getFullYear() + '-' + 
           String(now.getMonth() + 1).padStart(2, '0') + '-' + 
           String(now.getDate()).padStart(2, '0');
}

function getNextOrderNumber() {
    const hariIni = getTodayString();
    let tanggalTerakhir = localStorage.getItem('pos_tanggal_terakhir');
    let nomorUrut = parseInt(localStorage.getItem('pos_nomor_urut')) || 0;

    if (tanggalTerakhir !== hariIni) {
        nomorUrut = 0;
        localStorage.setItem('pos_tanggal_terakhir', hariIni);
    }

    nomorUrut += 1;
    localStorage.setItem('pos_nomor_urut', nomorUrut);
    return String(nomorUrut).padStart(3, '0');
}

// ==========================================
// --- SIDEBAR & LOGOUT ---
// ==========================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.toggle('active');
    }
    if (overlay) {
        overlay.classList.toggle('active');
    }
}

function logout() {
    localStorage.removeItem('isLoggedIn');
    window.location.href = 'login.html';
}

// ==========================================
// --- WAKTU REAL-TIME ---
// ==========================================
function updateWaktu() {
    const now = new Date();
    const elDate = document.getElementById('current-date');
    const elTime = document.getElementById('current-time');
    
    if (elDate) {
        elDate.innerText = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    if (elTime) {
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        minutes = minutes < 10 ? '0' + minutes : minutes;
        elTime.innerHTML = `${hours}:${minutes} <span style="color:#94a3b8; font-weight:400; margin-left:4px;">${ampm}</span>`;
    }
}
setInterval(updateWaktu, 1000);
updateWaktu();

// ==========================================
// --- RENDER PRODUK & KATEGORI DINAMIS ---
// ==========================================
function renderProduk() {
    const productListEl = document.getElementById('product-list');
    if (!productListEl) return;
    
    productListEl.innerHTML = '';
    const searchInput = document.getElementById('search-input');
    const keyword = searchInput ? searchInput.value.toLowerCase() : '';
    
    const filtered = produkList.filter(p => {
        const matchKategori = filterKategoriAktif === "Semua" || p.kategori === filterKategoriAktif;
        const matchSearch = p.nama.toLowerCase().includes(keyword);
        return matchKategori && matchSearch;
    });

    if (filtered.length === 0) {
        productListEl.innerHTML = '<p style="color:#94a3b8; grid-column: 1 / -1; text-align:center;">Produk tidak ditemukan.</p>';
    } else {
        filtered.forEach(p => {
            const div = document.createElement('div');
            div.className = 'product-card';
            div.onclick = () => tambahKeKeranjang(p);
            
            div.innerHTML = `
                <div class="product-image-container">
                    <img src="${p.gambar || 'https://via.placeholder.com/150'}" alt="${p.nama}">
                </div>
                <h4>${p.nama}</h4>
                <div class="product-badge">${p.kategori}</div>
                <div class="product-price">Rp ${p.harga.toLocaleString('id-ID')}</div>
            `;
            productListEl.appendChild(div);
        });
    }
}

function cariProduk() { renderProduk(); }

function filterKategori(kategori, element) {
    filterKategoriAktif = kategori;
    document.querySelectorAll('.category-item').forEach(el => el.classList.remove('active'));
    if (element) element.classList.add('active');
    renderProduk();
}

// Peta ikon SVG
const ikonMap = {
    'bread': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M4 10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-4z"/><path d="M8 10v4"/><path d="M12 10v4"/><path d="M16 10v4"/></svg>`,
    'cake': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M4 14h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z"/><path d="M4 14a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4"/><path d="M12 6v4"/></svg>`,
    'coffee': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`,
    'box': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
    'star': `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
};

function renderKategoriFilter() {
    const categoryContainer = document.querySelector('.category-list');
    if (!categoryContainer) return;

    const semuaKategori = [...new Set(produkList.map(p => p.kategori))];
    
    let html = `
        <div class="category-item ${filterKategoriAktif === 'Semua' ? 'active' : ''}" onclick="filterKategori('Semua', this)">
            <div class="icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 4a8 8 0 0 0-8 8h16a8 8 0 0 0-8-8z"></path><path d="M2 16h20"></path><path d="M8 20h8"></path><circle cx="12" cy="4" r="1.5"></circle>
                </svg>
            </div>
            <h4>All Menu</h4>
            <p>${produkList.length} Item</p>
        </div>
    `;

    semuaKategori.forEach(kat => {
        let produkDenganKat = produkList.find(p => p.kategori === kat);
        let ikonKey = produkDenganKat && produkDenganKat.icon ? produkDenganKat.icon : 'bread';
        let iconSvg = ikonMap[ikonKey] || ikonMap['bread']; 

        let activeClass = filterKategoriAktif === kat ? 'active' : '';
        let jumlahItem = produkList.filter(p => p.kategori === kat).length;
        
        html += `
            <div class="category-item ${activeClass}" onclick="filterKategori('${kat}', this)">
                <div class="icon">${iconSvg}</div>
                <h4>${kat}</h4>
                <p>${jumlahItem} Item</p>
            </div>
        `;
    });

    categoryContainer.innerHTML = html;
}

// ==========================================
// --- LOGIKA KERANJANG (CART) ---
// ==========================================
function tambahKeKeranjang(produk) {
    const itemAda = keranjang.find(item => item.id === produk.id);
    if (itemAda) {
        itemAda.qty += 1;
    } else {
        keranjang.push({ ...produk, qty: 1 });
    }
    renderKeranjang();
}

function renderKeranjang() {
    const cartListEl = document.getElementById('cart-list');
    if (!cartListEl) return;

    cartListEl.innerHTML = '';
    let subtotal = 0;

    if (keranjang.length === 0) {
        cartListEl.innerHTML = '<p class="empty-cart">No Item Selected</p>';
    } else {
        keranjang.forEach((item, index) => {
            subtotal += (item.harga * item.qty);
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <h4>${item.nama}</h4>
                    <p>Rp ${(item.harga * item.qty).toLocaleString('id-ID')}</p>
                </div>
                <div class="cart-item-actions">
                    <button onclick="kurangiQty(${index})">-</button>
                    <span>${item.qty}</span>
                    <button onclick="tambahQty(${index})">+</button>
                </div>
            `;
            cartListEl.appendChild(div);
        });
    }

    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    const elSub = document.getElementById('subtotal');
    const elTax = document.getElementById('tax');
    const elTotal = document.getElementById('total');

    if (elSub) elSub.innerText = subtotal.toLocaleString('id-ID');
    if (elTax) elTax.innerText = tax.toLocaleString('id-ID');
    if (elTotal) elTotal.innerText = total.toLocaleString('id-ID');
}

function tambahQty(index) { keranjang[index].qty += 1; renderKeranjang(); }
function kurangiQty(index) {
    if (keranjang[index].qty > 1) keranjang[index].qty -= 1;
    else keranjang.splice(index, 1);
    renderKeranjang();
}

// ==========================================
// --- PEMBAYARAN & STRUK ---
// ==========================================
function prosesPembayaran() {
    if (keranjang.length === 0) return alert("Keranjang masih kosong!");

    let subtotal = 0;
    keranjang.forEach(item => subtotal += (item.harga * item.qty));
    const tax = subtotal * 0.1;
    const totalAkhir = subtotal + tax;

    if (metodePembayaranAktif === "QRIS") {
        tempSubtotal = subtotal;
        tempTax = tax;
        tempTotalAkhir = totalAkhir;
        
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=Pembayaran+QRIS+Bakery+Makuca+Total:${totalAkhir}`;
        
        document.getElementById('img-qr-code').src = qrUrl;
        document.getElementById('qris-total').innerText = `Rp ${totalAkhir.toLocaleString('id-ID')}`;
        document.getElementById('modal-qris').style.display = 'flex';
        
        return; 
    }

    prosesSelesaiTransaksi(subtotal, tax, totalAkhir);
}

function selesaiQRIS() {
    document.getElementById('modal-qris').style.display = 'none';
    prosesSelesaiTransaksi(tempSubtotal, tempTax, tempTotalAkhir);
}

function prosesSelesaiTransaksi(subtotal, tax, totalAkhir) {
    totalPendapatanHarian += totalAkhir;
    localStorage.setItem('pos_pendapatan', totalPendapatanHarian);

    keranjang.forEach(item => {
        if (produkTerjual[item.nama]) {
            produkTerjual[item.nama].qty += item.qty;
            produkTerjual[item.nama].total += (item.harga * item.qty);
        } else {
            produkTerjual[item.nama] = { qty: item.qty, total: (item.harga * item.qty) };
        }
    });
    localStorage.setItem('pos_terjual', JSON.stringify(produkTerjual));

    let riwayat = JSON.parse(localStorage.getItem('pos_riwayat_transaksi')) || [];
    let noOrder = document.getElementById('order-number-display').innerText.replace('Order Number #', '');
    let namaCust = document.getElementById('customer-name-display').innerText;

    riwayat.push({
        id: 'TRX-' + Date.now(),
        noOrder: `#${noOrder}`,
        customer: namaCust,
        tanggal: new Date().toISOString(),
        items: keranjang.map(i => ({ nama: i.nama, harga: i.harga, qty: i.qty })),
        total: totalAkhir,
        metode: metodePembayaranAktif
    });
    localStorage.setItem('pos_riwayat_transaksi', JSON.stringify(riwayat));

    const strukContainer = document.getElementById('struk-container');
    
    const now = new Date();
    const opsiTanggal = { day: '2-digit', month: '2-digit', year: 'numeric' };
    const tanggalStr = now.toLocaleDateString('id-ID', opsiTanggal);
    const jamStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replace(/\./g, ':');
    document.getElementById('struk-tanggal').innerText = `Tanggal: ${tanggalStr}, ${jamStr}`;
    
    document.getElementById('struk-customer').innerText = `Nama: ${namaCust}`;
    document.getElementById('struk-order').innerText = `Order Number #${noOrder}`;

    let itemsHTML = '<div class="struk-divider"></div>';
    keranjang.forEach(item => {
        itemsHTML += `
            <div class="struk-item">
                <span>${item.nama} (x${item.qty})</span>
                <span>Rp ${(item.harga * item.qty).toLocaleString('id-ID')}</span>
            </div>
        `;
    });
    document.getElementById('struk-items').innerHTML = itemsHTML;
    document.getElementById('struk-total-akhir').innerText = `Rp ${totalAkhir.toLocaleString('id-ID')}`;

    if (strukContainer) {
        strukContainer.style.display = 'block';
        window.print();
        
        setTimeout(() => {
            strukContainer.style.display = 'none';
            keranjang = [];
            renderKeranjang();
            document.getElementById('customer-name-display').innerText = "Customer's Name";
            document.getElementById('order-number-display').innerText = "Order Number #000";
            document.getElementById('btn-metode-bayar').innerText = "Payment Method";
            document.getElementById('btn-metode-bayar').style.background = ''; 
            document.getElementById('btn-metode-bayar').style.color = '';
            metodePembayaranAktif = "Cash";
        }, 1000);
    }
}

// ==========================================
// --- MODAL PAYMENT METHOD ---
// ==========================================
function bukaModalPayment() {
    if (keranjang.length === 0) return alert("Keranjang masih kosong!");
    document.getElementById('modal-payment').style.display = 'flex';
}

function tutupModalPayment() {
    document.getElementById('modal-payment').style.display = 'none';
}

function pilihPembayaran(metode) {
    metodePembayaranAktif = metode;
    document.getElementById('btn-metode-bayar').innerText = `Bayar: ${metode}`;
    document.getElementById('btn-metode-bayar').style.background = '#3E2723';
    document.getElementById('btn-metode-bayar').style.color = 'white';
    tutupModalPayment();
}

// ==========================================
// --- MANAJEMEN PRODUK (TABEL & CRUD) ---
// ==========================================
function renderManajemenProduk() {
    const tabelBody = document.getElementById('tabel-manajemen-body');
    if (!tabelBody) return;

    tabelBody.innerHTML = '';
    if (produkList.length === 0) {
        tabelBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8;">Belum ada produk</td></tr>';
        return;
    }

    produkList.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px;">
                <img src="${p.gambar || 'https://via.placeholder.com/150'}" alt="${p.nama}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
            </td>
            <td style="padding: 12px; font-weight: 600;">${p.nama}</td>
            <td style="padding: 12px;">${p.kategori}</td>
            <td style="padding: 12px; font-weight: 700; color: #3E2723;">Rp ${p.harga.toLocaleString('id-ID')}</td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="editProduk(${p.id})" style="background: #F5D6B4; color: #3E2723; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 600; margin-right: 5px;">Edit</button>
                <button onclick="hapusProduk(${p.id})" style="background: #fee2e2; color: #ef4444; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 600;">Hapus</button>
            </td>
        `;
        tabelBody.appendChild(tr);
    });
}

function editProduk(id) {
    const produk = produkList.find(p => p.id === id);
    if (!produk) return;

    document.getElementById('judul-modal-produk').innerText = "Edit Produk";
    document.getElementById('edit-id-produk').value = produk.id;
    document.getElementById('nama-produk').value = produk.nama;
    document.getElementById('harga-produk').value = produk.harga;
    document.getElementById('kategori-produk').value = produk.kategori;
    document.getElementById('icon-kategori').value = produk.icon || 'bread';
    
    document.getElementById('modal-produk').style.display = 'flex';
}

function hapusProduk(id) {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;

    produkList = produkList.filter(p => p.id !== id);
    localStorage.setItem('pos_produk_v2', JSON.stringify(produkList));
    
    renderManajemenProduk();
    alert("Produk berhasil dihapus.");
}

// ==========================================
// --- MODAL TAMBAH/EDIT PRODUK ---
// ==========================================
function bukaModalProduk() {
    document.getElementById('judul-modal-produk').innerText = "Tambah Produk";
    document.getElementById('form-produk').reset();
    document.getElementById('edit-id-produk').value = "";
    
    document.getElementById('modal-produk').style.display = 'flex';
    if(document.getElementById('sidebar') && document.getElementById('sidebar').classList.contains('active')) toggleSidebar();
}

function tutupModalProduk() { 
    document.getElementById('modal-produk').style.display = 'none'; 
}

const formProduk = document.getElementById('form-produk');
if (formProduk) {
    formProduk.addEventListener('submit', function(e) {
        e.preventDefault();
        const idEdit = document.getElementById('edit-id-produk').value;
        const nama = document.getElementById('nama-produk').value;
        const harga = parseInt(document.getElementById('harga-produk').value);
        const kategori = document.getElementById('kategori-produk').value;
        const icon = document.getElementById('icon-kategori').value;
        const fileInput = document.getElementById('gambar-produk');
        const file = fileInput.files[0];

        const simpanData = (gambarBase64) => {
            if (idEdit) {
                const index = produkList.findIndex(p => p.id === parseInt(idEdit));
                if (index !== -1) {
                    produkList[index].nama = nama;
                    produkList[index].harga = harga;
                    produkList[index].kategori = kategori;
                    produkList[index].icon = icon;
                    if (gambarBase64 !== '') {
                        produkList[index].gambar = gambarBase64;
                    }
                }
            } else {
                produkList.push({ id: Date.now(), nama, harga, kategori, icon, gambar: gambarBase64 });
            }

            localStorage.setItem('pos_produk_v2', JSON.stringify(produkList));
            
            if(document.getElementById('product-list')) {
                renderProduk();
                renderKategoriFilter();
            }
            if(document.getElementById('tabel-manajemen-body')) {
                renderManajemenProduk();
            }

            tutupModalProduk();
            formProduk.reset();
            alert(idEdit ? "Produk berhasil diupdate!" : "Produk berhasil ditambahkan!");
        };

        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                simpanData(event.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            simpanData(''); 
        }
    });
}

// ==========================================
// --- LOGIKA KALENDER ---
// ==========================================
function bukaKalender() {
    document.getElementById('modal-kalender').style.display = 'flex';
    renderKalender(currentMonth, currentYear);
}

function tutupKalender() {
    document.getElementById('modal-kalender').style.display = 'none';
}

function renderKalender(month, year) {
    const bulanNama = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    
    const judul = document.getElementById('kalender-bulan-tahun');
    if (judul) {
        judul.innerHTML = `
            <div class="kalender-header">
                <button onclick="gantiBulan(-1)">&lt;</button>
                <span>${bulanNama[month]} ${year}</span>
                <button onclick="gantiBulan(1)">&gt;</button>
            </div>
        `;
    }

    const grid = document.getElementById('kalender-grid');
    if (!grid) return;

    const daysOfWeek = Array.from(grid.children).slice(0, 7);
    grid.innerHTML = '';
    daysOfWeek.forEach(day => grid.appendChild(day));

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    for (let i = 0; i < firstDay; i++) {
        grid.innerHTML += `<div></div>`;
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const isToday = i === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        grid.innerHTML += `<div class="${isToday ? 'today' : ''}">${i}</div>`;
    }
}

function gantiBulan(arah) {
    currentMonth += arah;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderKalender(currentMonth, currentYear);
}

// ==========================================
// --- LOGIKA CLOSE ORDER (KASIR MATI) ---
// ==========================================
function tutupKasir() {
    if (keranjang.length > 0) {
        if (!confirm("Keranjang masih ada isinya. Tetap tutup kasir dan batalkan pesanan?")) return;
    }
    
    keranjang = [];
    renderKeranjang();
    document.getElementById('closed-overlay').style.display = 'flex';
}

function bukaKasir() {
    document.getElementById('closed-overlay').style.display = 'none';
}

// ==========================================
// --- FUNGSI LAPORAN & RIWAYAT TRANSAKSI ---
// ==========================================
function renderLaporan() {
    const elPendapatan = document.getElementById('total-pendapatan');
    const elTabelProduk = document.getElementById('tabel-laporan-body');
    const elTabelTransaksi = document.getElementById('tabel-transaksi-body');
    
    if (elPendapatan && elTabelProduk && elTabelTransaksi) {
        elPendapatan.innerText = `Rp ${totalPendapatanHarian.toLocaleString('id-ID')}`;
        
        elTabelProduk.innerHTML = '';
        const keys = Object.keys(produkTerjual);
        
        if (keys.length === 0) {
            elTabelProduk.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#94a3b8;">Belum ada produk terjual</td></tr>';
        } else {
            keys.forEach(namaProduk => {
                const data = produkTerjual[namaProduk];
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${namaProduk}</td>
                    <td>${data.qty}</td>
                    <td>Rp ${data.total.toLocaleString('id-ID')}</td>
                `;
                elTabelProduk.appendChild(tr);
            });
        }

        elTabelTransaksi.innerHTML = '';
        let riwayat = JSON.parse(localStorage.getItem('pos_riwayat_transaksi')) || [];
        riwayat.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

        if (riwayat.length === 0) {
            elTabelTransaksi.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Belum ada transaksi hari ini</td></tr>';
        } else {
            riwayat.forEach(trx => {
                const tr = document.createElement('tr');
                const waktu = new Date(trx.tanggal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                
                let itemsList = '<ul style="list-style-type: disc; margin-top: 5px; padding-left: 15px;">';
                trx.items.forEach(item => {
                    itemsList += `<li>${item.nama} (x${item.qty})</li>`;
                });
                itemsList += '</ul>';

                tr.innerHTML = `
                    <td>${waktu}</td>
                    <td>${trx.noOrder}</td>
                    <td>${trx.customer}</td>
                    <td>
                        <details class="item-details">
                            <summary style="cursor: pointer; color: #3E2723; font-weight: 600; font-size: 13px;">Lihat Item</summary>
                            ${itemsList}
                        </details>
                    </td>
                    <td>Rp ${trx.total.toLocaleString('id-ID')}</td>
                    <td>
                        <button class="btn-void" onclick="hapusTransaksi('${trx.id}')">Batalkan</button>
                    </td>
                `;
                elTabelTransaksi.appendChild(tr);
            });
        }
    }
}

function hapusTransaksi(idTransaksi) {
    if (!confirm("Yakin ingin membatalkan transaksi ini? Total pendapatan dan produk terjual akan disesuaikan.")) return;

    let riwayat = JSON.parse(localStorage.getItem('pos_riwayat_transaksi')) || [];
    let index = riwayat.findIndex(t => t.id === idTransaksi);
    
    if (index !== -1) {
        let trx = riwayat[index];

        totalPendapatanHarian -= trx.total;
        localStorage.setItem('pos_pendapatan', totalPendapatanHarian);

        trx.items.forEach(item => {
            if (produkTerjual[item.nama]) {
                produkTerjual[item.nama].qty -= item.qty;
                produkTerjual[item.nama].total -= (item.harga * item.qty);
                if (produkTerjual[item.nama].qty <= 0) {
                    delete produkTerjual[item.nama];
                }
            }
        });
        localStorage.setItem('pos_terjual', JSON.stringify(produkTerjual));

        riwayat.splice(index, 1);
        localStorage.setItem('pos_riwayat_transaksi', JSON.stringify(riwayat));

        renderLaporan();
        alert("Transaksi berhasil dibatalkan.");
    }
}

// ==========================================
// --- FUNGSI EDIT CUSTOMER ---
// ==========================================
function editCustomer() {
    document.getElementById('modal-customer').style.display = 'flex';
    let namaSaatIni = document.getElementById('customer-name-display').innerText;
    if (namaSaatIni !== "Customer's Name") {
        document.getElementById('input-nama-customer').value = namaSaatIni;
    } else {
        document.getElementById('input-nama-customer').value = "";
    }
    setTimeout(() => {
        document.getElementById('input-nama-customer').focus();
    }, 100);
}

function tutupModalCustomer() {
    document.getElementById('modal-customer').style.display = 'none';
}

const formCustomer = document.getElementById('form-customer');
if (formCustomer) {
    formCustomer.addEventListener('submit', function(e) {
        e.preventDefault();
        let namaBaru = document.getElementById('input-nama-customer').value;
        
        if (namaBaru.trim() !== "") {
            document.getElementById('customer-name-display').innerText = namaBaru;
            let nomorUrut = getNextOrderNumber();
            document.getElementById('order-number-display').innerText = `Order Number #${nomorUrut}`;
            tutupModalCustomer();
        }
    });
}

// ==========================================
// --- MANAJEMEN PROMO ---
// ==========================================
let promoList = JSON.parse(localStorage.getItem('pos_promo')) || [];

function renderPromo() {
    const tabelBody = document.getElementById('tabel-promo-body');
    if (!tabelBody) return;

    tabelBody.innerHTML = '';
    if (promoList.length === 0) {
        tabelBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Belum ada promo</td></tr>';
        return;
    }

    const hariIni = new Date();
    hariIni.setHours(0, 0, 0, 0);

    promoList.forEach((p, index) => {
        const mulai = new Date(p.mulai);
        const berakhir = new Date(p.berakhir);
        
        let status = "";
        let warnaStatus = "";
        
        if (hariIni < mulai) {
            status = "Belum Mulai";
            warnaStatus = "#f59e0b"; // Kuning
        } else if (hariIni > berakhir) {
            status = "Kadaluarsa";
            warnaStatus = "#ef4444"; // Merah
        } else {
            status = "Aktif";
            warnaStatus = "#10b981"; // Hijau
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding: 12px; font-weight: 700; color: #3E2723;">${p.kode}</td>
            <td style="padding: 12px; font-weight: 600;">${p.diskon}%</td>
            <td style="padding: 12px;">${new Date(p.mulai).toLocaleDateString('id-ID')}</td>
            <td style="padding: 12px;">${new Date(p.berakhir).toLocaleDateString('id-ID')}</td>
            <td style="padding: 12px;">
                <span style="background: ${warnaStatus}20; color: ${warnaStatus}; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 12px;">
                    ${status}
                </span>
            </td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="hapusPromo(${index})" style="background: #fee2e2; color: #ef4444; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-weight: 600;">Hapus</button>
            </td>
        `;
        tabelBody.appendChild(tr);
    });
}

function hapusPromo(index) {
    if (!confirm("Yakin ingin menghapus promo ini?")) return;
    promoList.splice(index, 1);
    localStorage.setItem('pos_promo', JSON.stringify(promoList));
    renderPromo();
}

function bukaModalPromo() {
    document.getElementById('modal-promo').style.display = 'flex';
    document.getElementById('form-promo').reset();
}

function tutupModalPromo() {
    document.getElementById('modal-promo').style.display = 'none';
}

const formPromo = document.getElementById('form-promo');
if (formPromo) {
    formPromo.addEventListener('submit', function(e) {
        e.preventDefault();
        const kode = document.getElementById('kode-promo').value.toUpperCase();
        const diskon = parseInt(document.getElementById('diskon-promo').value);
        const mulai = document.getElementById('mulai-promo').value;
        const berakhir = document.getElementById('berakhir-promo').value;

        // Validasi: Tanggal berakhir harus setelah tanggal mulai
        if (new Date(berakhir) < new Date(mulai)) {
            alert("Tanggal berakhir tidak boleh lebih awal dari tanggal mulai!");
            return;
        }

        promoList.push({ kode, diskon, mulai, berakhir });
        localStorage.setItem('pos_promo', JSON.stringify(promoList));
        
        tutupModalPromo();
        renderPromo();
        alert("Promo berhasil ditambahkan!");
    });
}

// ==========================================
// --- INISIALISASI SAAT HALAMAN DIMUAT ---
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('product-list')) {
        renderProduk();
        renderKategoriFilter();
        renderKeranjang();
    } 
    else if (document.getElementById('tabel-laporan-body')) {
        renderLaporan();
    }
    else if (document.getElementById('tabel-manajemen-body')) {
        renderManajemenProduk();
    }
    else if (document.getElementById('tabel-promo-body')) {
        renderPromo();
    }
});