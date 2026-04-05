const WEB_APP_URL = "/api"; 
const GITHUB_UPLOAD_PAGE = "https://upload-fee.pages.dev/";

// Konfigurasi Tailwind (Dark Mode & Custom Colors)
tailwind.config = {
    darkMode: 'media', 
    theme: { 
        extend: { 
            colors: { 
                'dark-surface': '#0f172a',
                'dark-card': '#1e293b'
            }
        } 
    }
}

let allData = [];
let filteredData = [];
let picOptions = []; 
let focusedIndex = -1;
let currentPage = 1;
const rowsPerPage = 10;

/**
 * 1. LOAD DATA & SETUP
 */
async function loadData() {
    const refreshIcon = document.getElementById('refreshIcon');
    const progressBar = document.getElementById('topProgress');
    
    if(refreshIcon) refreshIcon.classList.add('animate-spin-custom');
    if(progressBar) {
        progressBar.style.width = '30%';
        progressBar.style.opacity = '1';
    }

    try {
        const response = await fetch(`${WEB_APP_URL}?action=getData`);
        if(progressBar) progressBar.style.width = '70%';

        if (!response.ok) throw new Error('Network Error');
        const result = await response.json();

        if (result.result === 'success') {
            allData = result.data.reverse();
            filteredData = [...allData];
            setupPicFilter();
            renderTable();
            document.getElementById('tableContainer').classList.remove('hidden');
            if(progressBar) {
                progressBar.style.width = '100%';
                setTimeout(() => {
                    progressBar.style.opacity = '0';
                    setTimeout(() => progressBar.style.width = '0', 300);
                }, 500);
            }

            showToast("Data Berhasil Dimuat", "success");
        }
    } catch (e) { 
        console.error(e); 
        if(progressBar) progressBar.style.backgroundColor = '#ef4444'; // Jadi Merah kalau error
        showToast("Gagal memuat data!", "error");
    } finally { 
        if(refreshIcon) refreshIcon.classList.remove('animate-spin-custom'); 
    }
}

function setupPicFilter() {
    const rawPics = [...new Set(allData.map(item => item.pic ? item.pic.trim().toUpperCase() : null).filter(Boolean))];
    picOptions = rawPics.sort().map(name => ({
        original: name,
        display: name.charAt(0) + name.slice(1).toLowerCase()
    }));
    renderPicDropdown(picOptions);
}

function renderPicDropdown(list) {
    const container = document.getElementById('picListItems');
    container.innerHTML = '';
    focusedIndex = -1; 

    if (list.length === 0) {
        container.innerHTML = `<div class="p-3 text-xs text-slate-400 italic text-center">Tidak ditemukan</div>`;
        return;
    }
    const allOption = document.createElement('div');
    allOption.className = "pic-item p-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl cursor-pointer transition select-none";
    allOption.textContent = "Semua PIC";
    allOption.onclick = () => selectPic("");
    container.appendChild(allOption);
    list.forEach((pic) => {
        const div = document.createElement('div');
        div.className = "pic-item p-3 text-sm font-semibold text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer transition select-none hover:bg-indigo-50 dark:hover:bg-indigo-900/30";
        div.textContent = pic.display;
        div.onclick = () => selectPic(pic.display);
        container.appendChild(div);
    });
}

function handlePicKeydown(e) {
    const dropdown = document.getElementById('picDropdown');
    const items = document.querySelectorAll('.pic-item');
    
    if (dropdown.classList.contains('hidden')) {
        if (e.key === " " || e.key === "ArrowDown") togglePicList(true);
        return;
    }

    if (e.key === "ArrowDown") {
        e.preventDefault();
        focusedIndex = (focusedIndex + 1) % items.length;
        updateFocus(items);
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusedIndex = (focusedIndex - 1 + items.length) % items.length;
        updateFocus(items);
    } else if (e.key === "Enter" || (e.key === " " && focusedIndex !== -1)) {
        e.preventDefault();
        if (focusedIndex !== -1) items[focusedIndex].click();
    } else if (e.key === "Escape") {
        togglePicList(false);
    }
}

function updateFocus(items) {
    items.forEach((item, index) => {
        if (index === focusedIndex) {
            item.classList.add('bg-indigo-100', 'dark:bg-indigo-900/50', 'ring-2', 'ring-indigo-500');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('bg-indigo-100', 'dark:bg-indigo-900/50', 'ring-2', 'ring-indigo-500');
        }
    });
}

function handlePicInput(val) {
    togglePicList(true);
    const filtered = picOptions.filter(pic => 
        pic.display.toLowerCase().includes(val.toLowerCase())
    );
    renderPicDropdown(filtered);
    handleFilter();
}

function selectPic(name) {
    const input = document.getElementById('filterPic');
    input.value = name;
    togglePicList(false);
    handleFilter();
    input.blur(); 
}

function togglePicList(show) {
    const dropdown = document.getElementById('picDropdown');
    if (!dropdown) return;

    if (show) {
        dropdown.classList.remove('hidden');
    } else {
        dropdown.classList.add('hidden');
    }
}

/**
 * 2. FILTERING LOGIC
 */
function handleFilter() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    const picInputValue = document.getElementById('filterPic').value.toLowerCase();
    const statusFilter = document.getElementById('filterStatus').value;

    filteredData = allData.filter(item => {
        const itemPic = (item.pic || "").toLowerCase();
        
        const matchesSearch = (
            (item.nama_kegiatan && item.nama_kegiatan.toLowerCase().includes(searchQuery)) ||
            (item.vendor && item.vendor.toLowerCase().includes(searchQuery)) ||
            (item.id && item.id.toLowerCase().includes(searchQuery))
        );
        const matchesPic = picInputValue === "" || itemPic.includes(picInputValue);
        const matchesStatus = statusFilter === "" || item.status === statusFilter;

        return matchesSearch && matchesPic && matchesStatus;
    });

    currentPage = 1;
    renderTable();
}

/**
 * 3. REDIRECT ACTION (Ganti fungsi Copy)
 */
function handleRedirect(e, id) {
    if (e) e.stopPropagation();
    const shareLink = `${GITHUB_UPLOAD_PAGE}?id=${id}`;
    window.open(shareLink, '_blank');
}

/**
 * 4. RENDER TABLE
 */
function renderTable() {
    const tbody = document.getElementById('dataTableBody');
    const mobileList = document.getElementById('mobileDataList');
    
    if(tbody) tbody.innerHTML = '';
    if(mobileList) mobileList.innerHTML = '';
    
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    filteredData.slice(start, end).forEach((item, i) => {
        const statusColor = item.status === 'Done' ? 'text-emerald-500' : 
                          item.status === 'Pending' ? 'text-red-500' : 'text-amber-500';
        const statusBg = item.status === 'Done' ? 'bg-emerald-500/10' : 
                        item.status === 'Pending' ? 'bg-red-500/10' : 'bg-amber-500/10';
        const actionBtn = item.link_dokumentasi 
            ? `<a href="${item.link_dokumentasi}" target="_blank" onclick="event.stopPropagation();" class="inline-flex items-center gap-2 text-[10px] font-black text-white bg-emerald-500 px-4 py-2 rounded-xl hover:bg-emerald-600 transition shadow-sm shadow-emerald-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>VIEW</a>`
            : `<button onclick="handleRedirect(event, '${item.id}')" class="inline-flex items-center gap-2 text-[10px] font-black text-white bg-indigo-600 px-4 py-2 rounded-xl hover:bg-indigo-700 transition shadow-sm shadow-indigo-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>UPLOAD</button>`;

        // --- RENDER DESKTOP (TABEL) ---
        if (tbody) {
            const row = tbody.insertRow();
            row.className = 'group hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 transition-all duration-200 cursor-pointer row-animate hover:shadow-md border-b border-slate-100 dark:border-slate-800 last:border-0';
            row.onclick = () => openAdminModal(item.id);
            row.style.animationDelay = `${i * 0.05}s`;
            row.innerHTML = `
                <td class="px-6 py-4 font-mono font-black text-indigo-600 dark:text-indigo-400 text-xs">${item.id}</td>
                <td class="px-6 py-4">
                    <span class="block font-bold text-sm text-slate-700 dark:text-slate-200">${item.pic}</span>
                    <span class="text-[9px] font-black uppercase ${statusColor} tracking-widest">● ${item.status || 'Pending'}</span>
                </td>
                <td class="px-6 py-4 font-semibold text-slate-600 dark:text-slate-400 text-xs">${item.nama_kegiatan}</td>
                <td class="px-6 py-4 font-bold text-xs uppercase text-slate-800 dark:text-slate-200">${item.vendor}</td>
                <td class="px-6 py-4 font-black text-emerald-600 dark:text-emerald-400 text-xs">${item.harga}</td>
                <td class="px-6 py-4 text-center">${actionBtn}</td>
            `;
        }

        // --- RENDER MOBILE (CARDS) ---
        if (mobileList) {
	    const mobileCard = document.createElement('div');
	    mobileCard.className = 'p-6 active:bg-slate-50 dark:active:bg-slate-800 transition-colors row-animate cursor-pointer border-b border-slate-200 dark:border-slate-800 last:border-0';
	    
	    mobileCard.onclick = () => openAdminModal(item.id);
	    mobileCard.style.animationDelay = `${i * 0.05}s`;
	    
	    mobileCard.innerHTML = `
		<div class="flex justify-between items-start mb-3">
		    <div class="flex flex-col gap-1">
		        <span class="font-mono font-black text-indigo-600 dark:text-indigo-400 text-[10px]">${item.id}</span>
		        <span class="text-[10px] font-bold text-slate-400 italic">PIC: ${item.pic}</span>
		    </div>
		    <span class="px-3 py-1 rounded-full text-[9px] font-black uppercase ${statusColor} ${statusBg} tracking-widest border border-current opacity-90">
		        ${item.status || 'Pending'}
		    </span>
		</div>

		<h4 class="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 leading-tight">${item.nama_kegiatan}</h4>
		<p class="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight mb-5">${item.vendor}</p>

		<div class="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800/60">
		    <div>
		        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Biaya</p>
		        <p class="text-sm font-black text-emerald-600 dark:text-emerald-400">${item.harga}</p>
		    </div>
		    <div class="flex flex-col items-end">
		        <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Status Dokumen</p>
		        ${actionBtn}
		    </div>
		</div>
	    `;
	    mobileList.appendChild(mobileCard);
	}
    });

    const display = document.getElementById('currentPageDisplay');
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    
    if(display) display.textContent = currentPage;
    if(prevBtn) prevBtn.disabled = currentPage === 1;
    if(nextBtn) nextBtn.disabled = end >= filteredData.length;
}

function changePage(step) {
    currentPage += step;
    renderTable();
}

/**
 * 5. VIEW-ONLY MODAL
 */
function openAdminModal(id) {
    const data = allData.find(item => item.id === id);
    if (!data) return;
    document.getElementById('adminModal').classList.remove('hidden');
    const tglTaskInfo = (data.tanggal_task && data.tanggal_task !== "-" && data.tanggal_task !== "" && data.advanced !== "NO") 
        ? ` | <span class="text-amber-500 font-bold">${new Date(data.tanggal_task).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</span>` 
        : "";

    document.getElementById('modalId').textContent = data.id;
    document.getElementById('modalPic').textContent = `PIC: ${data.pic}`;
    document.getElementById('infoKegiatan').innerHTML = `${data.nama_kegiatan}${tglTaskInfo}`;
    document.getElementById('infoBrand').textContent = data.brand || '-';
    document.getElementById('infoVendor').textContent = data.vendor || '-';
    document.getElementById('infoKontak').textContent = `${data.email_vendor || ''} | ${data.telp_vendor || ''}`;
    document.getElementById('infoKode').textContent = data.kode || '-';
    document.getElementById('infoHarga').textContent = data.harga;
    
    const docPlaceholder = document.getElementById('docPlaceholder');
    docPlaceholder.innerHTML = data.link_dokumentasi ? 
        `<a href="${data.link_dokumentasi}" target="_blank" class="text-[10px] font-black text-indigo-600 underline">LIHAT FILE ↗</a>` : 
        `<span class="text-[10px] font-bold text-slate-400 italic font-mono">BELUM UPLOAD</span>`;


    // 3. LOGIKA BAGIAN KANAN (STATUS & TANGGAL DENGAN STYLE BORDER)
    
    // A. Status Progres
    const statusEl = document.getElementById('viewStatus');
    const status = data.status || 'Pending';
    const statusColors = {
        'Done': 'text-emerald-500',
        'Pending': 'text-red-500',
        'Validate': 'text-indigo-500',
        'Pengajuan': 'text-amber-500'
    };
    statusEl.textContent = status.toUpperCase();
    statusEl.className = `text-sm font-black ${statusColors[status] || 'text-slate-700 dark:text-slate-200'}`;

    // B. Tanggal Transfer
    const tglEl = document.getElementById('viewTglTf');
    if (data.tgl_transfer && data.tgl_transfer !== "" && data.tgl_transfer !== "-") {
        const d = new Date(data.tgl_transfer);
        const opsi = { day: '2-digit', month: 'long', year: 'numeric' };
        tglEl.textContent = d.toLocaleDateString('id-ID', opsi).toUpperCase();
        tglEl.className = "text-sm font-black text-slate-700 dark:text-slate-200";
    } else {
        tglEl.textContent = "BELUM TERSEDIA";
        tglEl.className = "text-sm font-bold text-slate-400 italic tracking-wide";
    }

    // C. Bukti Transfer (Badge Style)
    const buktiContainer = document.getElementById('viewBuktiTf');
    const isLunas = (data.bukti_tf === true || data.bukti_tf === "TRUE");
    
    if (isLunas) {
        buktiContainer.innerHTML = `
            <span class="px-4 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20 tracking-widest">
                TERSEDIA
            </span>`;
    } else {
        buktiContainer.innerHTML = `
            <span class="px-4 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-400 text-[10px] font-black border border-slate-200 dark:border-slate-600 tracking-widest">
                BELUM ADA
            </span>`;
    }
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.add('hidden');
}

/**
 * UTILS
 */
function formatForInputDate(dateString) {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split('T')[0];
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const msgElem = document.getElementById('toastMsg');
    const iconElem = document.getElementById('toastIcon');
    if (!toast || !msgElem) return;

    msgElem.textContent = message;
    
    toast.classList.remove('bg-red-500/95', 'bg-indigo-600/95');

    if (type === 'error') {
	    toast.classList.add('bg-red-500/95');
	    iconElem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
	} else {
	    toast.classList.add('bg-indigo-600/95');
	    iconElem.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
	}

    toast.style.opacity = "1";
    toast.classList.add('translate-y-[-20px]');
    
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.classList.remove('translate-y-[-20px]');
    }, 3000);
}

// Close modal on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAdminModal();
});

// 1. Logika Klik di Luar (Supaya list ketutup otomatis)
document.addEventListener('click', (e) => {
    const container = document.getElementById('picFilterContainer');
    const input = document.getElementById('filterPic');
    const dropdown = document.getElementById('picDropdown');
    if (container && !container.contains(e.target)) {
        togglePicList(false);
    }
});

// 2. Logika Tombol ESC (Khusus Global)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        togglePicList(false);
        document.getElementById('filterPic').blur();
    }
});

window.onload = loadData;
