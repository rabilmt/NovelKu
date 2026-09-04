/* ==========================================
   INISIALISASI SUPABASE (Cukup 1 kali di sini)
   ========================================== */
const SUPABASE_URL = 'https://yepqqfsftqjskefcgnoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllcHFxZnNmdHFqc2tlZmNnbm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MTgyNzEsImV4cCI6MjEwNDA5NDI3MX0.obj0Zm-S6115MfLNQyRzjdoxjUqNQ8XVK4aL0kXzWYM';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================
   NAVIGASI HALAMAN (SPA)
   ========================================== */
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    }
}

/* ==========================================
   MEMUAT DAFTAR NOVEL DARI DATABASE
   ========================================== */
async function loadNovels() {
    const grid = document.getElementById('novelGrid');
    if (!grid) return;

    // Tampilkan status loading
    grid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Memuat karya terbaik untukmu...</p>
        </div>
    `;

    try {
        const { data, error } = await supabase
            .from('novels')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            grid.innerHTML = `
                <div class="loading-state">
                    <p>Belum ada novel yang diunggah. Jadilah yang pertama menulis!</p>
                </div>
            `;
            return;
        }

        // Render daftar novel ke dalam grid
        grid.innerHTML = data.map(novel => `
            <div class="novel-card" onclick="openNovel('${novel.id}')">
                <div class="cover" style="background-color: ${novel.cover_color || '#FF5722'}">
                    <span class="cover-title">${escapeHtml(novel.title)}</span>
                </div>
                <div class="info">
                    <span class="badge">${escapeHtml(novel.genre)}</span>
                    <h3>${escapeHtml(novel.title)}</h3>
                    <p class="synopsis-preview">${escapeHtml(novel.synopsis)}</p>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Gagal memuat novel:', err.message);
        grid.innerHTML = `
            <div class="loading-state">
                <p style="color: #EF4444;">Gagal memuat data. Periksa koneksi atau pastikan tabel database sudah benar.</p>
            </div>
        `;
    }
}

/* ==========================================
   MEMBUKA HALAMAN BACA NOVEL
   ========================================== */
async function openNovel(novelId) {
    showPage('reader-page');
    
    const contentDiv = document.getElementById('chapterContent');
    const titleDiv = document.getElementById('readerNovelTitle');
    const chapterTitleDiv = document.getElementById('chapterTitle');

    if (contentDiv) contentDiv.innerHTML = `<p style="text-align:center;">Memuat bab cerita...</p>`;

    try {
        // Ambil data detail novel
        const { data: novel, error: novelError } = await supabase
            .from('novels')
            .select('*')
            .eq('id', novelId)
            .single();

        if (novelError) throw novelError;
        if (titleDiv) titleDiv.textContent = novel.title;

        // Ambil daftar bab berdasarkan novel_id
        const { data: chapters, error: chapError } = await supabase
            .from('chapters')
            .select('*')
            .eq('novel_id', novelId)
            .order('chapter_number', { ascending: true });

        if (chapError) throw chapError;

        if (!chapters || chapters.length === 0) {
            if (chapterTitleDiv) chapterTitleDiv.textContent = "Belum Ada Bab";
            if (contentDiv) contentDiv.innerHTML = `<p style="text-align:center;">Novel ini belum memiliki bab cerita yang dipublikasikan.</p>`;
            return;
        }

        // Tampilkan bab pertama secara default
        const currentChapter = chapters[0];
        if (chapterTitleDiv) {
            chapterTitleDiv.textContent = `Bab ${currentChapter.chapter_number}: ${currentChapter.title}`;
        }

        // Format paragraf agar rapi dibaca
        if (contentDiv) {
            const formattedParagraphs = currentChapter.content
                .split('\n')
                .filter(p => p.trim() !== '')
                .map(p => `<p>${escapeHtml(p)}</p>`)
                .join('');
            
            contentDiv.innerHTML = formattedParagraphs;
        }

    } catch (err) {
        console.error('Gagal membuka novel:', err.message);
        if (contentDiv) {
            contentDiv.innerHTML = `<p style="text-align:center; color: #EF4444;">Gagal memuat isi bab.</p>`;
        }
    }
}

/* ==========================================
   PENGATURAN MODAL UNGGAH KARYA
   ========================================== */
function openUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.style.display = 'flex';
}

function closeUploadModal() {
    const modal = document.getElementById('uploadModal');
    if (modal) modal.style.display = 'none';
}

/* ==========================================
   FUNGSI KEAMANAN KECIL (MENCEGAH XSS)
   ========================================== */
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ==========================================
   SAAT HALAMAN SELESAI DIMUAT
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    loadNovels();
});
