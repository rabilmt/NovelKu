console.log("🚀 Script NovelKu berhasil dimuat!");

/* ==========================================
   1. INISIALISASI SUPABASE
   ========================================== */
const SUPABASE_URL = 'https://yepqqfsftqjskefcgnoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllcHFxZnNmdHFqc2tlZmNnbm96Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MTgyNzEsImV4cCI6MjEwNDA5NDI3MX0.obj0Zm-S6115MfLNQyRzjdoxjUqNQ8XVK4aL0kXzWYM';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ==========================================
   2. FUNGSI NAVIGASI HALAMAN
   ========================================== */
window.showPage = function(pageId) {
    let targetId = pageId.endsWith('-page') ? pageId : pageId + '-page';
    
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    const targetPage = document.getElementById(targetId);
    if (targetPage) {
        targetPage.classList.add('active');
        window.scrollTo(0, 0);
    }
};

/* ==========================================
   3. MEMUAT DAFTAR NOVEL DARI DATABASE
   ========================================== */
window.loadNovels = async function() {
    const grid = document.getElementById('novel-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="loading-state">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <p>Memuat karya terbaik untukmu...</p>
        </div>
    `;

    try {
        const { data, error } = await supabaseClient
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
        console.error('Gagal memuat novel:', err);
        grid.innerHTML = `
            <div class="loading-state">
                <p style="color: #EF4444;">Gagal memuat data: ${escapeHtml(err.message)}</p>
            </div>
        `;
    }
};

/* ==========================================
   4. MEMBUKA HALAMAN BACA NOVEL
   ========================================== */
window.openNovel = async function(novelId) {
    showPage('read-page');
    
    const contentDiv = document.getElementById('chapter-content');
    const titleDiv = document.getElementById('read-title');
    const genreDiv = document.getElementById('read-genre');
    const chapterTitleDiv = document.getElementById('chapter-title');

    if (contentDiv) contentDiv.innerHTML = `<p style="text-align:center;">Memuat bab cerita...</p>`;

    try {
        const { data: novel, error: novelError } = await supabaseClient
            .from('novels')
            .select('*')
            .eq('id', novelId)
            .single();

        if (novelError) throw novelError;
        if (titleDiv) titleDiv.textContent = novel.title;
        if (genreDiv) genreDiv.textContent = novel.genre;

        const { data: chapters, error: chapError } = await supabaseClient
            .from('chapters')
            .select('*')
            .eq('novel_id', novelId)
            .order('chapter_number', { ascending: true });

        if (chapError) throw chapError;

        if (!chapters || chapters.length === 0) {
            if (chapterTitleDiv) chapterTitleDiv.textContent = "Belum Ada Bab";
            if (contentDiv) contentDiv.innerHTML = `<p style="text-align:center;">Novel ini belum memiliki bab cerita.</p>`;
            return;
        }

        const currentChapter = chapters[0];
        if (chapterTitleDiv) {
            chapterTitleDiv.textContent = `Bab ${currentChapter.chapter_number}: ${currentChapter.title}`;
        }

        if (contentDiv) {
            contentDiv.innerHTML = currentChapter.content
                .split('\n')
                .filter(p => p.trim() !== '')
                .map(p => `<p>${escapeHtml(p)}</p>`)
                .join('');
        }

    } catch (err) {
        console.error('Gagal membuka bab:', err);
        if (contentDiv) {
            contentDiv.innerHTML = `<p style="text-align:center; color: #EF4444;">Gagal memuat isi bab: ${escapeHtml(err.message)}</p>`;
        }
    }
};

/* ==========================================
   5. PENGATURAN MODAL UNGGAH
   ========================================== */
window.openUploadModal = function() {
    const modal = document.getElementById('upload-modal');
    if (modal) modal.style.display = 'flex';
};

window.closeUploadModal = function() {
    const modal = document.getElementById('upload-modal');
    if (modal) modal.style.display = 'none';
};

/* ==========================================
   6. EVENT LISTENER UTAMA
   ========================================== */
document.addEventListener('DOMContentLoaded', () => {
    loadNovels();

    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const title = document.getElementById('title').value;
            const genre = document.getElementById('genre').value;
            const synopsis = document.getElementById('synopsis').value;
            const chapterContent = document.getElementById('chapter1').value;
            const submitBtn = document.getElementById('submit-btn');

            submitBtn.disabled = true;
            submitBtn.textContent = 'Mempublikasikan...';

            try {
                const { data: novelData, error: novelError } = await supabaseClient
                    .from('novels')
                    .insert([{ title, genre, synopsis }])
                    .select()
                    .single();

                if (novelError) throw novelError;

                const { error: chapError } = await supabaseClient
                    .from('chapters')
                    .insert([{
                        novel_id: novelData.id,
                        chapter_number: 1,
                        title: 'Bab 1',
                        content: chapterContent
                    }]);

                if (chapError) throw chapError;

                alert('Karya berhasil dipublikasikan!');
                closeUploadModal();
                uploadForm.reset();
                loadNovels();

            } catch (err) {
                alert('Gagal mempublikasikan: ' + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Publikasikan Sekarang';
            }
        });
    }
});

/* ==========================================
   7. HELPER ESCAPE HTML
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
