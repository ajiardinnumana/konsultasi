/**
 * KONSULTASI Frontend Application Engine v1.0.0
 */

// Ganti URL Web App GAS hasil deployment Anda di sini
const API_URL = "https://script.google.com/macros/s/AKfycbyoL1Dkxs9r1cqL0zuzKw4nJEY1d68EEpVyctMyYi4zZsMrDMTiUtHoH8Nv_z5WK8dE9g/exec";

let state = {
  token: localStorage.getItem('konsultasi_token') || null,
  role: localStorage.getItem('konsultasi_role') || null,
  userData: JSON.parse(localStorage.getItem('konsultasi_user') || '{}'),
  currentQuestionId: null
};

document.addEventListener('DOMContentLoaded', () => {
  updateNavUI();
  if (state.token) {
    navigateRoleDashboard();
  } else {
    showPage('homePage');
  }
});

// ==================== NAVIGATION & ROUTING ====================

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById(pageId);
  if (target) target.classList.add('active');

  if (pageId === 'studentDashboard') loadStudentQuestions();
  if (pageId === 'guruDashboard') loadGuruDashboard();
  if (pageId === 'adminDashboard') loadAdminDashboard();
  if (pageId === 'publicPage') loadPublicQuestions();
}

function updateNavUI() {
  const authBtn = document.getElementById('authBtn');
  if (state.token) {
    authBtn.innerText = `Keluar (${state.role})`;
    authBtn.onclick = logout;
  } else {
    authBtn.innerText = "Masuk / Daftar";
    authBtn.onclick = () => showPage('loginPage');
  }
}

function navigateRoleDashboard() {
  if (state.role === 'SISWA') showPage('studentDashboard');
  else if (state.role === 'GURU') showPage('guruDashboard');
  else if (state.role === 'ADMIN') showPage('adminDashboard');
}

function logout() {
  localStorage.clear();
  state = { token: null, role: null, userData: {}, currentQuestionId: null };
  updateNavUI();
  showAlert("Anda telah keluar dari aplikasi.", "success");
  showPage('homePage');
}

function showAlert(msg, type = 'error') {
  const alertBox = document.getElementById('alertBox');
  alertBox.className = `alert alert-${type}`;
  alertBox.innerText = msg;
  alertBox.classList.remove('hidden');
  setTimeout(() => alertBox.classList.add('hidden'), 5000);
}

// ==================== API BRIDGE ====================

async function callAPI(action, data = {}) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, token: state.token, data })
    });
    const res = await response.json();
    if (!res.ok) throw new Error(res.error || "Terjadi kesalahan server.");
    return res.data;
  } catch (err) {
    showAlert(err.message || "Terjadi gangguan saat menghubungi server. Silakan coba lagi.", "error");
    throw err;
  }
}

// ==================== AUTHENTICATION HANDLERS ====================

async function handleLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn = document.getElementById('btnLoginSubmit');

  btn.disabled = true;
  btn.innerText = "Memproses...";

  try {
    const res = await callAPI('login', { username, password });
    state.token = res.token;
    state.role = res.role;
    state.userData = res;

    localStorage.setItem('konsultasi_token', res.token);
    localStorage.setItem('konsultasi_role', res.role);
    localStorage.setItem('konsultasi_user', JSON.stringify(res));

    updateNavUI();
    showAlert("Login berhasil!", "success");
    navigateRoleDashboard();
  } catch (e) {
    // Error handled in callAPI
  } finally {
    btn.disabled = false;
    btn.innerText = "Masuk";
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const data = {
    nama: document.getElementById('regNama').value.trim(),
    kelas: document.getElementById('regKelas').value,
    jurusan: document.getElementById('regJurusan').value.trim(),
    username: document.getElementById('regUsername').value.trim(),
    password: document.getElementById('regPassword').value,
    konfirmasiPassword: document.getElementById('regKonfirmasi').value
  };

  const btn = document.getElementById('btnRegisterSubmit');
  btn.disabled = true;
  btn.innerText = "Mendaftarkan...";

  try {
    const res = await callAPI('registerStudent', data);
    showAlert(res.message, "success");
    showPage('loginPage');
  } catch (e) {
  } finally {
    btn.disabled = false;
    btn.innerText = "Daftar Akun";
  }
}

async function handleLoginGuruSubmit(e) {
  e.preventDefault();
  const noHp = document.getElementById('loginGuruHp').value.trim();
  const btn = document.getElementById('btnLoginGuruSubmit');

  btn.disabled = true;
  btn.innerText = "Memverifikasi...";

  try {
    const res = await callAPI('loginGuru', { noHp });
    state.token = res.token;
    state.role = res.role;
    state.userData = res;

    localStorage.setItem('konsultasi_token', res.token);
    localStorage.setItem('konsultasi_role', res.role);
    localStorage.setItem('konsultasi_user', JSON.stringify(res));

    updateNavUI();
    showAlert("Login Guru berhasil!", "success");
    showPage('guruDashboard');
  } catch (e) {
  } finally {
    btn.disabled = false;
    btn.innerText = "Masuk sebagai Guru";
  }
}

// ==================== QUESTION & DASHBOARDS ====================

function checkAuthAndAsk() {
  if (!state.token) {
    showAlert("Silakan login terlebih dahulu untuk mengajukan pertanyaan.", "error");
    showPage('loginPage');
  } else if (state.role === 'SISWA') {
    showCreateQuestionModal();
  } else {
    showAlert("Fitur mengajukan pertanyaan khusus untuk Siswa.", "error");
  }
}

async function showCreateQuestionModal() {
  showPage('createQuestionPage');
  const catSelect = document.getElementById('qKategori');
  catSelect.innerHTML = '<option value="">Memuat kategori...</option>';

  try {
    const categories = await callAPI('getCategories');
    catSelect.innerHTML = '<option value="">-- Pilih Kategori --</option>';
    categories.forEach(cat => {
      catSelect.innerHTML += `<option value="${cat.nama}">${cat.nama}</option>`;
    });
  } catch (e) {
    catSelect.innerHTML = '<option value="">Gagal memuat kategori</option>';
  }
}

function handleCategoryChange() {
  const catVal = document.getElementById('qKategori').value;
  const subGroup = document.getElementById('subKategoriGroup');
  if (catVal.includes('Agama')) {
    subGroup.classList.remove('hidden');
  } else {
    subGroup.classList.add('hidden');
  }
}

async function handleCreateQuestionSubmit(e) {
  e.preventDefault();
  const data = {
    kategori: document.getElementById('qKategori').value,
    subkategori: document.getElementById('qSubKategori').value,
    pertanyaan: document.getElementById('qPertanyaan').value.trim(),
    anonim: document.querySelector('input[name="qAnonim"]:checked').value === 'true',
    privat: document.querySelector('input[name="qPrivat"]:checked').value === 'true'
  };

  const btn = document.getElementById('btnSubmitQuestion');
  btn.disabled = true;
  btn.innerText = "Mengirim...";

  try {
    const res = await callAPI('createQuestion', data);
    showAlert(res.message, "success");
    document.getElementById('createQuestionForm').reset();
    showPage('studentDashboard');
  } catch (e) {
  } finally {
    btn.disabled = false;
    btn.innerText = "Kirim Pertanyaan";
  }
}

async function loadStudentQuestions() {
  const container = document.getElementById('studentQuestionsList');
  container.innerHTML = '<div class="loading-spinner">Memuat data pertanyaan...</div>';

  try {
    const list = await callAPI('getStudentQuestions');
    if (list.length === 0) {
      container.innerHTML = '<p class="subtext">Kamu belum pernah mengajukan pertanyaan.</p>';
      return;
    }

    container.innerHTML = list.map(q => `
      <div class="q-card" onclick="openQuestionDetail('${q.questionId}')">
        <div class="q-header">
          <span class="badge badge-${q.status.toLowerCase()}">${q.status}</span>
          <span>${new Date(q.createdAt).toLocaleDateString('id-ID')}</span>
        </div>
        <h4>${q.kategori}</h4>
        <p>${q.pertanyaan.substring(0, 120)}...</p>
      </div>
    `).join('');
  } catch (e) {}
}

async function openQuestionDetail(qId) {
  state.currentQuestionId = qId;
  showPage('questionDetailPage');
  const card = document.getElementById('questionDetailCard');
  const thread = document.getElementById('threadMessages');
  card.innerHTML = '<div class="loading-spinner">Memuat detail thread...</div>';
  thread.innerHTML = '';

  try {
    const data = await callAPI('getQuestionDetail', { questionId: qId });
    const { question, messages } = data;

    card.innerHTML = `
      <div class="q-header">
        <span class="badge badge-${question.status.toLowerCase()}">${question.status}</span>
        <span class="subtext">ID: ${question.questionId}</span>
      </div>
      <h3>${question.kategori}</h3>
      <p class="q-body">${question.pertanyaan}</p>
    `;

    if (messages.length === 0) {
      thread.innerHTML = '<p class="subtext">Belum ada jawaban dari Admin/Guru BK.</p>';
    } else {
      thread.innerHTML = messages.map(m => `
        <div class="msg-bubble msg-${m.senderType.toLowerCase()}">
          <div class="msg-sender">${m.senderType === 'ADMIN' ? 'Admin / Guru BK' : 'Saya'}</div>
          <div>${m.message}</div>
          <div class="msg-time">${new Date(m.createdAt).toLocaleString('id-ID')}</div>
        </div>
      `).join('');
    }
  } catch (e) {}
}

async function handleFollowUpSubmit(e) {
  e.preventDefault();
  const message = document.getElementById('followUpText').value.trim();
  const btn = document.getElementById('btnSendFollowUp');

  btn.disabled = true;
  try {
    await callAPI('sendFollowUp', { questionId: state.currentQuestionId, message });
    document.getElementById('followUpText').value = '';
    openQuestionDetail(state.currentQuestionId);
  } catch (e) {}
  finally { btn.disabled = false; }
}

async function loadPublicQuestions() {
  const container = document.getElementById('publicQuestionsList');
  try {
    const list = await callAPI('getPublicQuestions');
    if (list.length === 0) {
      container.innerHTML = '<p class="subtext">Belum ada pertanyaan publik.</p>';
      return;
    }
    container.innerHTML = list.map(q => `
      <div class="q-card">
        <div class="q-header">
          <strong>${q.author}</strong>
          <span>${new Date(q.createdAt).toLocaleDateString('id-ID')}</span>
        </div>
        <p><strong>[${q.kategori}]</strong> ${q.pertanyaan}</p>
        ${q.answers.length > 0 ? `
          <div class="public-answer">
            <strong>Jawaban Sekolah:</strong>
            <p>${q.answers[0].answer}</p>
          </div>
        ` : '<p class="subtext">Menunggu jawaban sekolah...</p>'}
      </div>
    `).join('');
  } catch (e) {}
}

// Helpers
function switchLoginTab(type) {
  document.getElementById('tabSiswaBtn').classList.toggle('active', type === 'siswa');
  document.getElementById('tabGuruBtn').classList.toggle('active', type === 'guru');
  document.getElementById('loginSiswaForm').classList.toggle('hidden', type !== 'siswa');
  document.getElementById('loginGuruForm').classList.toggle('hidden', type !== 'guru');
}

function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function goBackFromDetail() {
  navigateRoleDashboard();
}
