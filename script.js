// Konfigurasi Kunci Supabase Anda
const SUPABASE_URL = 'https://yepqqfsftqjskefcgnoz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_A05hHba9yW_bOmcibQXpMw_Vob20V2S';

// Inisialisasi Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentChapters = [];
let currentChapterIndex = 0;

// Jalankan fungsi muat novel saat web pertama kali dibuka
document.addEventListener('DOMContentLoaded', () => {
    loadNovels();
});

// Fungsi Navigasi Halaman
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.getElementById(pageId + '-page').classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Warna elegan acak untuk kover novel tanpa gambar
const coverGradients = [
    'linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)'
];
function getRandomGradient() {
    return coverGradients[Math.floor(Math.random() * coverGradients.length)];
}

// 1. Fungsi Mengambil Data Novel dari Database Cloud
async function loadNovels() {
    const grid = document.getElementById('novel-grid');
    grid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Menyinkronkan data dari server...</p>
        </div>`;

    try {
        const { data: novels, error } = await supabase
            .from('novels')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!novels || novels.length === 0) {
            grid.innerHTML = '<div class="loading-state"><p>Belum ada karya yang diunggah. Jadilah yang pertama!</p></div>';
            return;
        }

        grid.innerHTML = '';
        novels.forEach(novel => {
            const card = document.createElement('div');
            card.className = 'novel-card';
            card.onclick = () => openNovel(novel.id, novel.title, novel.genre);

            const coverStyle = novel.cover_color.includes('gradient') ? novel.cover_color : getRandomGradient();

            card.innerHTML = `
                <div class="cover" style="background: ${coverStyle};">
                    <span class="cover-title">${escapeHtml(novel.title)}</span>
                </div>
                <div class="info">
                    <span class="badge">${escapeHtml(novel.genre)}</span>
                    <h3>${escapeHtml(novel.title)}</h3>
                    <p class="synopsis-preview">${escapeHtml(novel.synopsis)}</p>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error("Error:", err);
        grid.innerHTML = `<div class="loading-state"><p style="color:red;"><i class="fa-solid fa-triangle-exclamation"></i> Gagal memuat data. Pastikan database Supabase sudah diatur dengan benar.</p></div>`;
    }
}

// 2. Fungsi Membuka Novel dan Mengambil Bab
async function openNovel(novelId, title, genre) {
    document.getElementById('read-title').textContent = title;
    document.getElementById('read-genre').textContent = genre;
    document.getElementById('chapter-content').innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Membuka lembaran buku...</p>
        </div>`;
    
    showPage('read');

    try {
        const { data: chapters, error } = await supabase
            .from('chapters')
            .select('*')
            .eq('novel_id', novelId)
            .order('chapter_number', { ascending: true });

        if (error) throw error;

        if (!chapters || chapters.length === 0) {
            document.getElementById('chapter-title').textContent = "Buku Kosong";
            document.getElementById('chapter-content').innerHTML = "<p>Penulis belum menuliskan bab apapun di buku ini.</p>";
            document.getElementById('chapter-navigation').innerHTML = '';
            return;
        }

        currentChapters = chapters;
        currentChapterIndex = 0;
        renderChapter();
    } catch (err) {
        console.error("Gagal memuat bab:", err);
        document.getElementById('chapter-content').innerHTML = "<p style='color:red;'>Terjadi kesalahan saat memuat isi buku.</p>";
    }
}

// 3. Fungsi Menampilkan Teks Bab ke Layar
function renderChapter() {
    const chapter = currentChapters[currentChapterIndex];
    document.getElementById('chapter-title').textContent = `Bab ${chapter.chapter_number}`;
    
    const formattedContent = chapter.content
        .split('\n')
        .filter(p => p.trim() !== '')
        .map(p => `<p>${escapeHtml(p)}</p>`)
        .join('');

    document.getElementById('chapter-content').innerHTML = formattedContent;

    const navDiv = document.getElementById('chapter-navigation');
    navDiv.innerHTML = `
        <button class="btn-outline" ${currentChapterIndex === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} onclick="prevChapter()"><i class="fa-solid fa-chevron-left"></i> Bab Sebelumnya</button>
        <button class="btn-primary" ${currentChapterIndex === currentChapters.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''} onclick="nextChapter()">Bab Selanjutnya <i class="fa-solid fa-chevron-right"></i></button>
    `;
}

function prevChapter() {
    if (currentChapterIndex > 0) {
        currentChapterIndex--;
        renderChapter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function nextChapter() {
    if (currentChapterIndex < currentChapters.length - 1) {
        currentChapterIndex++;
        renderChapter();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 4. Manajemen Modal Unggah
const modal = document.getElementById('upload-modal');
function openUploadModal() { modal.style.display = 'flex'; }
function closeUploadModal() { modal.style.display = 'none'; }
window.onclick = function(e) { if (e.target === modal) closeUploadModal(); };

// 5. Mengirim (Upload) Novel ke Supabase
document.getElementById('upload-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const title = document.getElementById('title').value.trim();
    const genre = document.getElementById('genre').value;
    const synopsis = document.getElementById('synopsis').value.trim();
    const chapter1 = document.getElementById('chapter1').value.trim();
    const submitBtn = document.getElementById('submit-btn');

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyimpan ke Cloud...';

    try {
        const coverColor = getRandomGradient();

        // Simpan Data Novel
        const { data: novelData, error: novelError } = await supabase
            .from('novels')
            .insert([{ title, genre, synopsis, cover_color: coverColor }])
            .select()
            .single();

        if (novelError) throw novelError;

        // Simpan Data Bab 1
        const { error: chapterError } = await supabase
            .from('chapters')
            .insert([{
                novel_id: novelData.id,
                chapter_number: 1,
                title: 'Awal Cerita',
                content: chapter1
            }]);

        if (chapterError) throw chapterError;

        alert('Karya berhasil dipublikasikan! Pembaca kini bisa menemukan novelmu.');
        
        document.getElementById('upload-form').reset();
        closeUploadModal();
        loadNovels(); // Refresh otomatis daftar novel

    } catch (err) {
        alert('Gagal mengunggah: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Publikasikan Sekarang';
    }
});

// Utilitas Keamanan: Mencegah injeksi kode HTML berbahaya
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}