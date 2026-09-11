/* Set this to your deployed Google Apps Script Web App URL. */
const API_URL = "https://script.google.com/macros/s/AKfycbyoL1Dkxs9r1cqL0zuzKw4nJEY1d68EEpVyctMyYi4zZsMrDMTiUtHoH8Nv_z5WK8dE9g/exec";
const state = { session: JSON.parse(localStorage.getItem("konsultasi_session") || "null"), categories: [], questions: [] };

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

function saveSession(s){ state.session=s; localStorage.setItem("konsultasi_session", JSON.stringify(s)); renderNav(); }
function clearSession(){ state.session=null; localStorage.removeItem("konsultasi_session"); renderNav(); showPage("home"); }
function esc(v=""){ return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m])); }
function showPage(name){
  $$(".page").forEach(p=>p.classList.add("hidden"));
  const p=$("#page-"+name); if(p) p.classList.remove("hidden");
  window.scrollTo({top:0,behavior:"smooth"});
  if(name==="student") loadStudent();
  if(name==="teacher") loadTeacher();
  if(name==="admin") loadAdmin();
}
function renderNav(){
  const n=$("#nav"); if(!n)return;
  if(!state.session){ n.innerHTML=`<button onclick="showPage('login')">Masuk</button><button class="btn primary" onclick="showPage('register')">Daftar</button>`; return; }
  const role=state.session.role;
  const page=role==="SISWA"?"student":role==="GURU"?"teacher":"admin";
  n.innerHTML=`<button onclick="showPage('${page}')">Dashboard</button><button onclick="clearSession()">Keluar</button>`;
}
async function api(action,payload={}){
  if(API_URL.includes("PASTE_YOUR")) throw new Error("API belum dikonfigurasi. Isi API_URL di frontend/app.js.");
  const body={action,...payload};
  if(state.session) body.token=state.session.token;
  const r=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body)});
  const data=await r.json();
  if(!data.ok) throw new Error(data.message||"Terjadi kesalahan.");
  return data;
}
function msg(id,text,ok=false){const e=$("#"+id);e.className="form-msg "+(ok?"msg-ok":"msg-error");e.textContent=text;}
function setupEyes(){ $$(".eye").forEach(btn=>btn.onclick=()=>{const i=btn.parentElement.querySelector("input");i.type=i.type==="password"?"text":"password";btn.textContent=i.type==="password"?"◉":"◉";}); }
async function loadPublicQuestions(){
  const el=$("#public-list"); if(!el)return;
  el.innerHTML='<div class="empty">Memuat...</div>';
  api("getPublicQuestions").then(d=>{
    const qs=d.questions||[];
    el.innerHTML=qs.length?qs.map(q=>`<article class="question-card">
      <div class="question-top"><span class="badge">${esc(q.code)}</span><span class="badge green">PUBLIK</span></div>
      <h3>${esc(q.category)}</h3><p class="question-preview">${esc(q.question.slice(0,280))}${q.question.length>280?"…":""}</p>
      <div class="meta"><span>${q.displayName==="YA"?esc(q.ownerName):"Anonim"}</span><span>${esc(q.createdAt)}</span><span>${esc(q.status)}</span></div>
    </article>`).join(""):'<div class="empty">Belum ada pertanyaan publik.</div>';
  }).catch(e=>{el.innerHTML=`<div class="empty">${esc(e.message)}</div>`});
}

async function loadCategories(){
  try{const d=await api("getCategories");state.categories=d.categories||[];}catch(e){state.categories=[];}
}
function categoryOptions(){return state.categories.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("")}
function dynamicPlaceholder(cat){
  const m={
    "📖 Materi Pelajaran":"Contoh: Saya belum memahami cara menghitung persamaan kuadrat. Bisa dijelaskan langkahnya?",
    "🧠 Kesulitan Belajar":"Contoh: Saya sulit fokus saat belajar matematika. Apa cara belajar yang bisa saya coba?",
    "👥 Pertemanan & Sosial":"Contoh: Saya merasa dijauhi teman sekelas. Sebaiknya saya bagaimana?",
    "💭 Masalah Pribadi":"Contoh: Saya sedang punya masalah yang membuat saya sulit berkonsentrasi di sekolah.",
    "🏫 Masalah Sekolah":"Contoh: Saya ingin menyampaikan masalah tentang kegiatan atau aturan di sekolah.",
    "🕌 Agama, Ibadah & Syariat":"Contoh: Bagaimana tata cara wudu yang benar menurut pendapat yang umum diajarkan?",
    "🎯 Karier & Masa Depan":"Contoh: Saya bingung memilih jurusan kuliah setelah lulus. Apa yang perlu saya pertimbangkan?",
    "❓ Lainnya":"Contoh: Saya ingin bertanya tentang hal yang belum tersedia di kategori lain."
  };
  return m[cat]||"Tuliskan pertanyaan atau hal yang ingin kamu konsultasikan dengan jelas.";
}

async function loadStudent(){
  const c=$("#student-content");
  c.innerHTML=`<div class="empty">Memuat dashboard...</div>`;
  try{
    await loadCategories();
    const d=await api("getStudentDashboard");
    c.innerHTML=studentHTML(d);
    bindStudent(c);
  }catch(e){c.innerHTML=`<div class="panel"><p class="danger-text">${esc(e.message)}</p><button class="btn secondary" onclick="clearSession()">Kembali</button></div>`}
}
function studentHTML(d){
  const qs=d.questions||[];
  return `<div class="page-head"><div><span class="eyebrow">DASHBOARD SISWA</span><h1>Halo, ${esc(d.user.name)} 👋</h1><p class="muted">${esc(d.user.className)} · ${esc(d.user.major)}</p></div><button class="btn primary" id="new-question">+ Ajukan Pertanyaan</button></div>
  <div class="dashboard-grid">
    <div class="stat"><div class="value">${qs.length}</div><div class="label">Pertanyaan Saya</div></div>
    <div class="stat"><div class="value">${qs.filter(q=>q.status==="Sudah Dijawab").length}</div><div class="label">Sudah Dijawab</div></div>
    <div class="stat"><div class="value">${qs.filter(q=>q.unread).length}</div><div class="label">Jawaban Belum Dibaca</div></div>
    <div class="stat"><div class="value">${d.publicCount||0}</div><div class="label">Pertanyaan Publik</div></div>
  </div>
  <div id="student-compose" class="panel hidden">${questionFormHTML()}</div>
  <div class="panel"><div class="page-head"><h2>Pertanyaan Saya</h2><select id="student-filter"><option value="">Semua</option><option>Menunggu</option><option>Sedang Ditangani</option><option>Guru Membantu</option><option>Sudah Dijawab</option><option>Ditutup</option></select></div>
  <div id="student-list" class="question-list">${questionCards(qs,"student")}</div></div>`;
}
function questionFormHTML(){
  return `<form id="question-form" class="form">
    <label>Kategori<select name="category" id="q-category" required>${categoryOptions()}</select></label>
    <label>Pertanyaan<textarea name="question" id="q-text" placeholder="${esc(dynamicPlaceholder(state.categories[0]?.name||""))}" required></textarea></label>
    <div><strong>Identitas</strong><div class="hint">Pengaturan ini menentukan apakah nama kamu terlihat oleh siswa lain pada pertanyaan publik.</div>
      <label><input type="radio" name="displayName" value="YA" checked> Tampilkan nama saya</label>
      <label><input type="radio" name="displayName" value="TIDAK"> Sembunyikan nama saya (Anonim)</label>
    </div>
    <div><strong>Publikasi</strong><div class="hint">Pertanyaan privat tidak muncul di halaman publik.</div>
      <label><input type="radio" name="publication" value="PUBLIK" checked> Boleh dipublikasikan</label>
      <label><input type="radio" name="publication" value="PRIVAT"> Privat — hanya saya dan petugas sekolah yang berwenang</label>
    </div>
    <label>Catatan tambahan (opsional)<textarea name="notes" rows="3" placeholder="Contoh: Saya ingin jawaban singkat dan mudah dipahami."></textarea></label>
    <div class="form-actions"><button class="btn primary">Kirim Pertanyaan</button><button type="button" class="btn ghost" id="cancel-question">Batal</button></div>
    <div id="question-msg" class="form-msg"></div>
  </form>`;
}
function questionCards(qs,mode){
  if(!qs.length)return `<div class="empty">Belum ada pertanyaan.</div>`;
  return qs.map(q=>`<article class="question-card">
    <div class="question-top"><div><span class="badge">${esc(q.code)}</span> <span class="badge ${q.publication==="PRIVAT"?"red":"green"}">${esc(q.publication)}</span></div><span class="badge ${q.status==="Sudah Dijawab"?"green":"yellow"}">${esc(q.status)}</span></div>
    <h3>${esc(q.category)}</h3><p class="question-preview">${esc(q.question.slice(0,240))}${q.question.length>240?"…":""}</p>
    <div class="meta"><span>${esc(q.createdAt)}</span><span>${q.displayName==="YA"?"Nama ditampilkan":"Anonim"}</span>${q.unread?'<span class="danger-text"><strong>Jawaban belum dibaca</strong></span>':""}</div>
    <div class="question-actions"><button class="btn secondary" onclick="openQuestion('${esc(q.id)}','${mode}')">Buka Percakapan</button>${mode==="teacher"?`<button class="btn ghost" onclick="teacherInterest('${esc(q.id)}')">Saya ingin membantu menjawab</button>`:""}</div>
  </article>`).join("");
}
function bindStudent(c){
  $("#new-question").onclick=()=>{$("#student-compose").classList.remove("hidden");$("#q-category").dispatchEvent(new Event("change"))};
  $("#cancel-question").onclick=()=>$("#student-compose").classList.add("hidden");
  $("#q-category").onchange=()=>$("#q-text").placeholder=dynamicPlaceholder($("#q-category").value);
  $("#question-form").onsubmit=submitQuestion;
  $("#student-filter").onchange=async e=>{const d=await api("getStudentDashboard");const qs=d.questions.filter(q=>!e.target.value||q.status===e.target.value);$("#student-list").innerHTML=questionCards(qs,"student")};
}
async function submitQuestion(e){
  e.preventDefault();const f=new FormData(e.target);
  try{await api("createQuestion",{category:f.get("category"),question:f.get("question"),displayName:f.get("displayName"),publication:f.get("publication"),notes:f.get("notes")});msg("question-msg","Pertanyaan berhasil dikirim.",true);setTimeout(loadStudent,700)}
  catch(err){msg("question-msg",err.message)}
}
async function openQuestion(id,mode){
  try{
    const d=await api("getQuestionDetail",{questionId:id});
    const c=mode==="student"?$("#student-content"):mode==="teacher"?$("#teacher-content"):$("#admin-content");
    c.innerHTML=threadHTML(d,mode);
    bindThread(c,id,mode,d);
  }catch(e){alert(e.message)}
}
function threadHTML(d,mode){
  const q=d.question;
  const canReply=mode==="student"||mode==="admin";
  return `<div class="page-head"><div><button class="back" onclick="${mode==="student"?"loadStudent()":mode==="teacher"?"loadTeacher()":"loadAdmin()"}">← Kembali</button><h1>${esc(q.code)}</h1></div></div>
  <div class="detail-question"><div class="meta"><span>${esc(q.category)}</span><span>${esc(q.status)}</span><span>${esc(q.publication)}</span></div><h2>${esc(q.question)}</h2><p class="muted">${esc(q.createdAt)}</p>${q.notes?`<p><strong>Catatan:</strong> ${esc(q.notes)}</p>`:""}</div>
  <div class="panel"><h2>Percakapan</h2><div id="thread" class="thread">${d.messages.map(m=>`<div class="message ${m.mine?"mine":""}"><div class="sender">${esc(m.senderLabel)} <span class="read">${m.readStatus==="Sudah dibaca"?"✓ Dibaca":""}</span></div><div>${esc(m.message).replace(/\n/g,"<br>")}</div><div class="small muted">${esc(m.createdAt)}</div></div>`).join("")||'<div class="empty">Belum ada jawaban.</div>'}</div>
  ${canReply?`<form id="reply-form" class="form" style="margin-top:18px"><label>${mode==="admin"?"Jawaban / balasan":"Balasan"}<textarea name="message" placeholder="${mode==="admin"?"Tulis jawaban untuk siswa…":"Tulis pertanyaan lanjutan pada percakapan ini…"}" required></textarea></label><button class="btn primary">${mode==="admin"?"Kirim Jawaban":"Kirim Balasan"}</button><div id="reply-msg" class="form-msg"></div></form>`:""}
  </div>`;
}
function bindThread(c,id,mode){
  const f=$("#reply-form");if(!f)return;
  f.onsubmit=async e=>{e.preventDefault();try{await api(mode==="admin"?"adminReply":"studentFollowUp",{questionId:id,message:new FormData(f).get("message")});msg("reply-msg","Pesan berhasil dikirim.",true);setTimeout(()=>openQuestion(id,mode),500)}catch(err){msg("reply-msg",err.message)}}
}

async function loadTeacher(){
  const c=$("#teacher-content");c.innerHTML=`<div class="empty">Memuat dashboard guru...</div>`;
  try{const d=await api("getTeacherDashboard");c.innerHTML=teacherHTML(d);bindTeacher(c)}catch(e){c.innerHTML=`<div class="panel"><p class="danger-text">${esc(e.message)}</p></div>`}
}
function teacherHTML(d){
  const qs=d.questions||[];
  return `<div class="page-head"><div><span class="eyebrow">DASHBOARD GURU</span><h1>Dashboard Konsultasi</h1><p class="muted">Guru dapat membaca pertanyaan dan menawarkan bantuan kepada admin.</p></div></div>
  <div class="dashboard-grid"><div class="stat"><div class="value">${d.stats.total}</div><div class="label">Total Pertanyaan</div></div><div class="stat"><div class="value">${d.stats.unanswered}</div><div class="label">Belum Dijawab</div></div><div class="stat"><div class="value">${d.stats.answered}</div><div class="label">Sudah Dijawab</div></div><div class="stat"><div class="value">${d.stats.private}</div><div class="label">Privat</div></div></div>
  <div class="panel"><h2>Tren Pertanyaan</h2><div class="chart-wrap">${simpleBars(d.trend||[])}</div></div>
  <div class="panel"><div class="page-head"><h2>Daftar Pertanyaan</h2><div class="filters"><select id="teacher-category"><option value="">Semua kategori</option>${state.categories.map(c=>`<option>${esc(c.name)}</option>`).join("")}</select><select id="teacher-status"><option value="">Semua status</option><option>Menunggu</option><option>Sedang Ditangani</option><option>Guru Membantu</option><option>Sudah Dijawab</option><option>Ditutup</option></select></div></div><div id="teacher-list" class="question-list">${questionCards(qs,"teacher")}</div></div>`;
}
function simpleBars(items){if(!items.length)return '<div class="empty">Belum ada data tren.</div>';const max=Math.max(...items.map(x=>x.count),1);return items.map(x=>`<div class="bar" style="height:${Math.max(6,(x.count/max)*210)}px"><span>${x.count}</span><small>${esc(x.label)}</small></div>`).join("")}
function bindTeacher(c){
  ["teacher-category","teacher-status"].forEach(id=>$("#"+id).onchange=async()=>{const d=await api("getTeacherDashboard",{category:$("#teacher-category").value,status:$("#teacher-status").value});$("#teacher-list").innerHTML=questionCards(d.questions||[],"teacher")});
}
async function teacherInterest(id){
  try{await api("teacherInterest",{questionId:id});alert("Permintaan bantuan dicatat. Admin akan melihatnya.");loadTeacher()}catch(e){alert(e.message)}
}

async function loadAdmin(){
  const c=$("#admin-content");c.innerHTML=`<div class="empty">Memuat dashboard admin...</div>`;
  try{const d=await api("getAdminDashboard");c.innerHTML=adminHTML(d);bindAdmin(c)}catch(e){c.innerHTML=`<div class="panel"><p class="danger-text">${esc(e.message)}</p></div>`}
}
function adminHTML(d){
  return `<div class="page-head"><div><span class="eyebrow">ADMIN</span><h1>Panel Administrasi</h1><p class="muted">Kelola pertanyaan, jawaban, pengguna, kategori, dan statistik.</p></div></div>
  <div class="dashboard-grid"><div class="stat"><div class="value">${d.stats.questions}</div><div class="label">Pertanyaan</div></div><div class="stat"><div class="value">${d.stats.users}</div><div class="label">Siswa</div></div><div class="stat"><div class="value">${d.stats.teachers}</div><div class="label">Guru</div></div><div class="stat"><div class="value">${d.stats.unread}</div><div class="label">Jawaban Belum Dibaca</div></div></div>
  <div class="admin-grid"><div class="panel"><h2>Pertanyaan</h2><div class="filters"><select id="admin-status"><option value="">Semua status</option><option>Menunggu</option><option>Sedang Ditangani</option><option>Guru Membantu</option><option>Sudah Dijawab</option><option>Ditutup</option></select><select id="admin-public"><option value="">Semua publikasi</option><option>PUBLIK</option><option>PRIVAT</option></select></div><div id="admin-list" class="question-list">${questionCards(d.questions||[],"admin")}</div></div>
  <div class="panel"><h2>Bantuan Guru</h2>${(d.interests||[]).map(x=>`<div class="question-card"><strong>${esc(x.teacher)}</strong><p class="small">${esc(x.code)}</p><span class="badge yellow">${esc(x.status)}</span></div>`).join("")||'<div class="empty">Belum ada permintaan bantuan.</div>'}</div></div>`;
}
function bindAdmin(c){["admin-status","admin-public"].forEach(id=>$("#"+id).onchange=async()=>{const d=await api("getAdminDashboard",{status:$("#admin-status").value,publication:$("#admin-public").value});$("#admin-list").innerHTML=questionCards(d.questions||[],"admin")})}

$$("[data-login-role]").forEach(t=>t.onclick=()=>{
  $$("[data-login-role]").forEach(x=>x.classList.remove("active"));t.classList.add("active");
  ["student","teacher","admin"].forEach(x=>$("#"+x+"-login-form").classList.add("hidden"));
  $("#"+t.dataset.loginRole.toLowerCase()+"-login-form").classList.remove("hidden");
});
$("#student-login-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const d=await api("loginStudent",{username:f.get("username"),password:f.get("password")});saveSession(d.session);showPage("student")}catch(err){msg("login-msg",err.message)}};
$("#teacher-login-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const d=await api("loginTeacher",{phone:f.get("phone")});saveSession(d.session);showPage("teacher")}catch(err){msg("login-msg",err.message)}};
$("#admin-login-form").onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target);try{const d=await api("loginAdmin",{phone:f.get("phone"),password:f.get("password")});saveSession(d.session);showPage("admin")}catch(err){msg("login-msg",err.message)}};
$("#register-form").onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.target),p=f.get("password"),c=f.get("confirm");
  if(p.length<4||p.length>8){msg("register-msg","Password harus 4–8 karakter.");return}
  if(p!==c){msg("register-msg","Konfirmasi password tidak sama.");return}
  try{const d=await api("registerStudent",{name:f.get("name"),username:f.get("username"),password:p,className:f.get("className"),major:f.get("major")});msg("register-msg",`Akun berhasil dibuat. Username kamu: ${d.username}`,true);setTimeout(()=>showPage("login"),1000)}catch(err){msg("register-msg",err.message)}
};
$("#reg-username").oninput=async e=>{const v=e.target.value.trim(),s=$("#username-status");if(v.length<3){s.textContent="";return}try{const d=await api("checkUsername",{username:v});s.textContent=d.available?"Username tersedia":"Username sudah digunakan";s.className="field-status "+(d.available?"ok":"bad")}catch{}};
$$('#register-form input[name="confirm"]').forEach(i=>i.oninput=()=>{const p=$('#register-form input[name="password"]').value,s=$("#confirm-status");s.textContent=i.value===p?"Password cocok":"Password belum cocok";s.className="field-status "+(i.value===p?"ok":"bad")});
setupEyes();renderNav();loadPublicQuestions();
if(state.session){showPage(state.session.role==="SISWA"?"student":state.session.role==="GURU"?"teacher":"admin");}

async function loadTelegramSettings() {
  try {
    const s = await api("getNotificationSettings");
    const enabled = document.getElementById("telegramEnabled");
    const status = document.getElementById("telegramStatus");
    if (enabled) enabled.checked = !!s.enabled;
    if (status) status.textContent = s.configured ? "Telegram sudah dikonfigurasi." : "Telegram belum dikonfigurasi.";
    const url = document.getElementById("adminDashboardUrl");
    if (url) url.value = s.dashboardUrl || "";
  } catch (e) { console.error(e); }
}

async function saveTelegramSettings() {
  const status = document.getElementById("telegramStatus");
  try {
    const enabled = document.getElementById("telegramEnabled").checked;
    const botToken = document.getElementById("telegramBotToken").value.trim();
    const chatId = document.getElementById("telegramChatId").value.trim();
    const dashboardUrl = document.getElementById("adminDashboardUrl").value.trim();
    const result = await api("saveNotificationSettings", {enabled, botToken, chatId, dashboardUrl});
    status.textContent = result.configured ? "Pengaturan Telegram tersimpan." : "Status tersimpan, token/chat ID belum lengkap.";
    document.getElementById("telegramBotToken").value = "";
  } catch (e) { status.textContent = e.message || "Gagal menyimpan pengaturan."; }
}

async function testTelegram() {
  const status = document.getElementById("telegramStatus");
  try {
    await api("testTelegram");
    status.textContent = "Tes berhasil. Cek Telegram.";
  } catch (e) { status.textContent = e.message || "Tes Telegram gagal."; }
}
