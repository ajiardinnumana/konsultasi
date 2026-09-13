/* KONSULTASI frontend — no frameworks. Backend URL is configured below. */
const API_URL = localStorage.getItem("konsultasi_api_url") || "https://script.google.com/macros/s/AKfycbzyetRtKmPLs9RALNjuPRCCJK32riijZ4JPe3PZRRdf4WmtuKVPca1Qqku42w0jfMtS/exec";
const state = { token: localStorage.getItem("konsultasi_token") || "", role: localStorage.getItem("konsultasi_role") || "", user: null, categories: [], currentQuestion: null, authRole: "student" };

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const esc = (v="") => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtDate = v => v ? new Date(v).toLocaleString("id-ID",{dateStyle:"medium",timeStyle:"short"}) : "—";
const statusClass = s => `status-${String(s||"").replaceAll("_","_")}`;
function toast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function showPage(name){
  if((name==="student"||name==="ask"||name==="question") && state.role!=="SISWA"){name="login"}
  if(name==="teacher" && state.role!=="GURU"){name="login"}
  if(name==="admin" && state.role!=="ADMIN"){name="login"}
  $$(".page").forEach(p=>p.classList.remove("active")); $(`#page-${name}`)?.classList.add("active");
  $$(".nav-link").forEach(b=>b.classList.toggle("active", b.dataset.page===name));
  window.scrollTo({top:0,behavior:"smooth"});
  if(name==="home") renderHomeCategories();
  if(name==="public") loadPublic();
  if(name==="student") loadStudent();
  if(name==="ask") loadCategories();
  if(name==="teacher") loadTeacher();
  if(name==="admin") loadAdmin();
}
function msg(id,text,type="error"){const e=$(id);if(!e)return;e.textContent=text;e.className=`form-message ${type}`;e.classList.remove("hidden")}
function clearMsg(id){const e=$(id);if(e){e.textContent="";e.classList.add("hidden")}}
function setBusy(btn,busy,label="Memproses…"){if(!btn)return;btn.disabled=busy;if(busy){btn.dataset.oldText=btn.textContent;btn.textContent=label}else btn.textContent=btn.dataset.oldText||btn.textContent}
async function api(action,data={},opts={}){
  if(API_URL.includes("PASTE_APPS_SCRIPT")) throw new Error("API belum dikonfigurasi. Ganti API_URL di app.js dengan URL Web App Google Apps Script.");
  const body={action,...data}; if(state.token) body.token=state.token;
  const res=await fetch(API_URL,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(body),cache:"no-store"});
  const text=await res.text(); let json; try{json=JSON.parse(text)}catch{throw new Error("Server mengirim respons yang tidak valid.")};
  if(!json.ok){if(json.code==="SESSION_EXPIRED"){logout(false);showPage("login")}throw new Error(json.error||"Permintaan tidak berhasil.")} return json.data;
}
function logout(show=true){state.token="";state.role="";state.user=null;localStorage.removeItem("konsultasi_token");localStorage.removeItem("konsultasi_role");if(show)showPage("home")}
function renderHomeCategories(){const box=$("#home-categories");if(!box)return;const cats=state.categories.length?state.categories:[["📖","Materi Pelajaran"],["🧠","Kesulitan Belajar"],["👥","Pertemanan & Sosial"],["💭","Masalah Pribadi"],["🏫","Masalah Sekolah"],["🕌","Agama, Ibadah & Syariat"],["🎯","Karier & Masa Depan"],["❓","Lainnya"]];box.innerHTML=cats.map(c=>`<div class="category-card"><b>${esc(Array.isArray(c)?c[0]+" "+c[1]:c)}</b><span>Ruang untuk bertanya dan mencari bantuan.</span></div>`).join("")}
async function loadCategories(){
  try{
    const result = await api("getCategories");

    state.categories = Array.isArray(result)
      ? result
      : (Array.isArray(result.categories) ? result.categories : []);

    renderCategorySelects();
    renderHomeCategories();
  }catch(e){
    console.error("Gagal memuat kategori:", e);
    state.categories = [];
    renderCategorySelects();
    renderHomeCategories();
    toast(e.message);
  }
}
function renderCategorySelects(){
  const active=state.categories.filter(c=>c.status!=="NONAKTIF");
  const opts=active.map(c=>`<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("");
  ["question-category","teacher-filter-category","admin-filter-category","public-filter-category"].forEach(id=>{const el=$("#"+id);if(!el)return;const first=el.options[0]?.textContent||"";el.innerHTML=(id==="question-category"?'<option value="">Pilih kategori</option>':`<option value="">${esc(first||"Semua kategori")}</option>`)+opts});
  $("#religion-subcategory").innerHTML='<option value="">Pilih subkategori</option>'+["Ibadah","Fikih","Akhlak","Muamalah","Hukum Syariat","Al-Qur’an & Hadis","Pertanyaan Keagamaan Lainnya"].map(x=>`<option>${esc(x)}</option>`).join("");
}
async function login(role, credentials){
  const data=await api("login",{role,credentials});state.token=data.token;state.role=data.user.role;state.user=data.user;localStorage.setItem("konsultasi_token",state.token);localStorage.setItem("konsultasi_role",state.role);showPage(state.role==="SISWA"?"student":state.role==="GURU"?"teacher":"admin");toast("Berhasil masuk.");return data;
}
async function register(){
  const data={name:$("#reg-name").value.trim(),username:$("#reg-username").value.trim(),password:$("#reg-password").value,confirmPassword:$("#reg-confirm").value,className:$("#reg-class").value.trim(),major:$("#reg-major").value.trim()};
  if(data.name.length<2||data.name.length>100)throw new Error("Nama harus 2–100 karakter.");
  if(!/^[A-Za-z0-9._-]{3,40}$/.test(data.username))throw new Error("Username 3–40 karakter dan hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda minus.");
  if(data.password.length<4||data.password.length>8)throw new Error("Password harus 4–8 karakter.");
  if(data.password!==data.confirmPassword)throw new Error("Konfirmasi password belum sama.");
  if(data.className.length<1||data.major.length<1)throw new Error("Kelas dan jurusan wajib diisi.");
  return api("register",{data});
}
async function loadStudent(){
  try{const d=await api("getStudentDashboard");state.user=d.user;$("#student-name").textContent=d.user.name;renderStudentQuestions(d.questions)}catch(e){toast(e.message)}
}
function renderStudentQuestions(items=[]){const box=$("#student-questions");if(!items.length){box.innerHTML='<div class="card"><strong>Belum ada pertanyaan.</strong><p class="muted">Saat kamu siap, ceritakan apa yang ingin kamu konsultasikan.</p><button class="btn btn-primary" data-page="ask">Buat Pertanyaan</button></div>';return}box.innerHTML=items.map(q=>`<button class="question-item" data-question="${esc(q.questionId)}"><div><h3>${esc(q.questionPreview||"Pertanyaan")}</h3><div class="question-meta"><span>${esc(q.category)}</span><span>•</span><span>${fmtDate(q.createdAt)}</span><span>•</span><span>${q.visibility==="PRIVAT"?"Privat":"Publik"}</span></div></div><span class="status-badge ${statusClass(q.status)}">${esc(q.statusLabel||q.status)}</span></button>`).join("")}
async function openQuestion(id){
  try{const d=await api("getQuestion",{questionId:id});state.currentQuestion=d;renderQuestion(d);showPage("question")}catch(e){toast(e.message)}
}
function renderQuestion(d){
  $("#detail-status").textContent=d.question.statusLabel||d.question.status;$("#detail-status").className=`status-badge ${statusClass(d.question.status)}`;
  const q=d.question;const identity=q.displayName?esc(q.displayName):"Siswa Anonim";
  let html=`<div class="thread-title"><div class="question-meta"><span>${esc(q.questionId)}</span><span>•</span><span>${esc(q.category)}</span><span>•</span><span>${fmtDate(q.createdAt)}</span></div><h1>${esc(q.text).slice(0,500)}</h1><div class="question-meta"><span>${identity}</span><span>•</span><span>${q.visibility==="PRIVAT"?"Privat":"Publik"}</span></div></div>`;
  html+=d.messages.map(m=>`<div class="message ${m.senderType==="SISWA"?"student":"admin"}"><div class="message-meta">${m.senderType==="SISWA"?"Kamu":esc(m.senderName||"Admin")} · ${fmtDate(m.createdAt)}</div><div class="message-body">${esc(m.message)}</div></div>`).join("");
  if(state.role==="SISWA" && q.status!=="DITUTUP") html+=`<form id="follow-form" class="card follow-form"><label>Follow-up<textarea id="follow-text" maxlength="5000" placeholder="Tambahkan pertanyaan atau informasi baru…"></textarea></label><span class="counter" id="follow-counter">0/5000</span><div id="follow-error" class="form-message error hidden"></div><button id="follow-submit" class="btn btn-primary" type="submit">Kirim Follow-up</button></form>`;
  if(state.role==="ADMIN") html+=adminReplyForm(q);
  $("#question-detail").innerHTML=html;
  $("#question-detail").querySelector("#follow-form")?.addEventListener("submit",async e=>{e.preventDefault();try{const text=$("#follow-text").value.trim();if(!text||text.length>5000)throw new Error("Follow-up harus 1–5000 karakter.");setBusy($("#follow-submit"),true,"Mengirim…");await api("sendFollowUp",{questionId:q.questionId,message:text});await openQuestion(q.questionId)}catch(err){msg("#follow-error",err.message)}finally{setBusy($("#follow-submit"),false)}});
  $("#question-detail").querySelector("#admin-reply-form")?.addEventListener("submit",adminReply);
  $("#question-detail").querySelector("#admin-status-form")?.addEventListener("submit",adminStatus);
  bindCounter("#follow-text","#follow-counter");
}
function adminReplyForm(q){return `<form id="admin-reply-form" class="card follow-form"><h3>Balas sebagai Admin</h3><label>Jawaban<textarea id="admin-answer" maxlength="5000" placeholder="Tulis jawaban yang jelas dan ramah…"></textarea></label><span class="counter" id="answer-counter">0/5000</span><div id="admin-reply-error" class="form-message error hidden"></div><div class="button-row"><button id="admin-reply-submit" class="btn btn-primary" type="submit">Kirim Jawaban</button><select id="admin-next-status"><option value="DIJAWAB">Tandai Dijawab</option><option value="DIPROSES">Tandai Diproses</option><option value="MENUNGGU_JAWABAN">Menunggu Jawaban</option></select></div></form><form id="admin-status-form" class="card follow-form"><h3>Ubah Status</h3><div class="button-row"><select id="admin-status"><option>BARU</option><option>DIPROSES</option><option>MENUNGGU_JAWABAN</option><option>DIJAWAB</option><option>DITUTUP</option></select><button class="btn btn-secondary" type="submit">Simpan Status</button></div></form>`}
async function adminReply(e){e.preventDefault();try{const text=$("#admin-answer").value.trim();if(!text||text.length>5000)throw new Error("Jawaban harus 1–5000 karakter.");setBusy($("#admin-reply-submit"),true,"Menyimpan…");await api("adminReply",{questionId:state.currentQuestion.question.questionId,message:text,status:$("#admin-next-status").value});await openQuestion(state.currentQuestion.question.questionId);toast("Jawaban tersimpan.")}catch(err){msg("#admin-reply-error",err.message)}finally{setBusy($("#admin-reply-submit"),false)}}
async function adminStatus(e){e.preventDefault();try{await api("adminSetStatus",{questionId:state.currentQuestion.question.questionId,status:$("#admin-status").value});await openQuestion(state.currentQuestion.question.questionId);toast("Status diperbarui.")}catch(err){toast(err.message)}}
async function loadTeacher(){try{const d=await api("getTeacherDashboard",{category:$("#teacher-filter-category").value,status:$("#teacher-filter-status").value});$("#teacher-name").textContent=d.user.name;$("#teacher-stats").innerHTML=statsHtml(d.stats);renderStaffQuestions("#teacher-questions",d.questions,true)}catch(e){toast(e.message)}}
async function loadAdmin(){try{const d=await api("getAdminDashboard",{category:$("#admin-filter-category").value,status:$("#admin-filter-status").value,visibility:$("#admin-filter-visibility").value});$("#admin-name").textContent=d.user.name;$("#admin-stats").innerHTML=statsHtml(d.stats);renderStaffQuestions("#admin-questions",d.questions,false);renderCategoryAdmin();}catch(e){toast(e.message)}}
function statsHtml(s){return [["Total Pertanyaan",s.total],["Hari Ini",s.today],["Minggu Ini",s.week],["Bulan Ini",s.month],["Sudah Dijawab",s.answered],["Belum Dijawab",s.unanswered],["Pertanyaan Privat",s.private],["Guru Tertarik",s.teacherInterest||0]].map(x=>`<div class="stat"><span>${esc(x[0])}</span><strong>${Number(x[1]||0)}</strong></div>`).join("")}
function renderStaffQuestions(sel,items,teacher){const box=$(sel);if(!items.length){box.innerHTML='<div class="card"><p class="muted">Tidak ada pertanyaan yang cocok dengan filter.</p></div>';return}box.innerHTML=items.map(q=>`<button class="question-item" data-question="${esc(q.questionId)}"><div><h3>${esc(q.questionPreview||"Pertanyaan")}</h3><div class="question-meta"><span>${esc(q.questionId)}</span><span>•</span><span>${esc(q.category)}</span><span>•</span><span>${fmtDate(q.createdAt)}</span><span>•</span><span>${q.visibility}</span>${teacher&&q.anonymous?"<span>• Anonim</span>":""}</div></div><span class="status-badge ${statusClass(q.status)}">${esc(q.statusLabel||q.status)}</span></button>`).join("")}
async function loadPublic(){try{const d=await api("getPublicQuestions",{category:$("#public-filter-category").value});$("#public-questions").innerHTML=d.items.length?d.items.map(q=>`<article class="public-card"><div class="question-meta"><span>${esc(q.category)}</span><span>•</span><span>${fmtDate(q.createdAt)}</span></div><h3>${esc(q.text)}</h3><div class="question-meta">${q.anonymous?"Siswa Anonim":esc(q.displayName||"Siswa")}</div>${q.answer?`<div class="public-answer"><strong>Jawaban sekolah</strong><p>${esc(q.answer)}</p></div>`:'<div class="public-answer"><span class="muted small">Jawaban sedang diproses.</span></div>'}</article>`).join(""):'<div class="card"><p>Belum ada pertanyaan publik yang dapat ditampilkan.</p></div>'}catch(e){toast(e.message)}}
function renderCategoryAdmin(){const box=$("#admin-category-list");box.innerHTML=state.categories.map(c=>`<div class="question-item"><div><strong>${esc(c.name)}</strong><div class="question-meta">${esc(c.description||"")}</div></div><span class="chip">${esc(c.status||"AKTIF")}</span></div>`).join("")}
function bindCounter(input,counter){const a=$(input),b=$(counter);if(!a||!b)return;const f=()=>b.textContent=`${a.value.length}/${a.maxLength||5000}`;a.addEventListener("input",f);f()}
function bindEvents(){
  document.addEventListener("click",e=>{const page=e.target.closest("[data-page]")?.dataset.page;if(page)showPage(page);const q=e.target.closest("[data-question]")?.dataset.question;if(q)openQuestion(q)});
  $$(".password-toggle").forEach(b=>b.addEventListener("click",()=>{const i=$("#"+b.dataset.target);i.type=i.type==="password"?"text":"password"}));
  $$(".tab").forEach(b=>b.addEventListener("click",()=>{state.authRole=b.dataset.auth;$$(".tab").forEach(x=>x.classList.toggle("active",x===b));$("#student-login-fields").classList.toggle("hidden",state.authRole!=="student");$("#teacher-login-fields").classList.toggle("hidden",state.authRole!=="teacher");$("#admin-login-fields").classList.toggle("hidden",state.authRole!=="admin")}));
  $("#login-form").addEventListener("submit",async e=>{e.preventDefault();clearMsg("#login-error");const btn=$("#login-submit");try{setBusy(btn,true,"Masuk…");if(state.authRole==="student"){await login("SISWA",{username:$("#login-username").value.trim(),password:$("#login-password").value})}else if(state.authRole==="teacher"){if(!$("#teacher-phone").value.trim())throw new Error("Nomor HP wajib diisi.");await login("GURU",{phone:$("#teacher-phone").value.trim()})}else{await login("ADMIN",{phone:$("#admin-phone").value.trim(),password:$("#admin-password").value})}}catch(err){msg("#login-error",err.message)}finally{setBusy(btn,false)}});
  $("#show-register").addEventListener("click",()=>showPage("register"));
  $("#register-form").addEventListener("submit",async e=>{e.preventDefault();clearMsg("#register-error");try{setBusy($("#register-submit"),true,"Membuat akun…");await register();msg("#register-success","Akun berhasil dibuat. Silakan masuk.","success");e.target.reset()}catch(err){msg("#register-error",err.message)}finally{setBusy($("#register-submit"),false)}});
  $("#question-form").addEventListener("submit",async e=>{e.preventDefault();clearMsg("#question-error");clearMsg("#question-success");const btn=$("#question-submit");try{const text=$("#question-text").value.trim();const category=$("#question-category").value;if(!category)throw new Error("Silakan pilih kategori.");if(!text||text.length>5000)throw new Error("Pertanyaan harus 1–5000 karakter.");const data={category,subCategory:$("#religion-subcategory").value,question:text,identity:document.querySelector('input[name="identity"]:checked').value,visibility:document.querySelector('input[name="visibility"]:checked').value};setBusy(btn,true,"Mengirim…");const d=await api("createQuestion",{data});msg("#question-success",`Pertanyaan ${d.questionId} berhasil dikirim.`,"success");e.target.reset();$("#religion-subcategory-wrap").classList.add("hidden");bindCounter("#question-text","#question-counter");setTimeout(()=>showPage("student"),900)}catch(err){msg("#question-error",err.message)}finally{setBusy(btn,false)}});
  $("#question-category").addEventListener("change",e=>$("#religion-subcategory-wrap").classList.toggle("hidden",!e.target.value.toLowerCase().includes("agama")));
  bindCounter("#question-text","#question-counter");
  $("#refresh-student").addEventListener("click",loadStudent);$("#refresh-teacher").addEventListener("click",loadTeacher);$("#refresh-public").addEventListener("click",loadPublic);
  $("#teacher-filter-category").addEventListener("change",loadTeacher);$("#teacher-filter-status").addEventListener("change",loadTeacher);$("#admin-filter-category").addEventListener("change",loadAdmin);$("#admin-filter-status").addEventListener("change",loadAdmin);$("#admin-filter-visibility").addEventListener("change",loadAdmin);$("#public-filter-category").addEventListener("change",loadPublic);
  $("#student-logout").addEventListener("click",()=>logout());$("#teacher-logout").addEventListener("click",()=>logout());$("#admin-logout").addEventListener("click",()=>logout());
  $$(".admin-tab").forEach(b=>b.addEventListener("click",()=>{$$(".admin-tab").forEach(x=>x.classList.toggle("active",x===b));["questions","settings","categories"].forEach(v=>$("#admin-view-"+v).classList.toggle("hidden",b.dataset.adminView!==v));if(b.dataset.adminView==="settings")loadTelegramSettings()}));
  $("#telegram-form").addEventListener("submit",saveTelegram);$("#telegram-test").addEventListener("click",testTelegram);
}
async function loadTelegramSettings(){try{const d=await api("getTelegramSettings");$("#telegram-chat-id").value=d.chatId||"";$("#telegram-token").value="";}catch(e){msg("#telegram-message",e.message)}}
async function saveTelegram(e){e.preventDefault();try{await api("saveTelegramSettings",{chatId:$("#telegram-chat-id").value.trim(),botToken:$("#telegram-token").value.trim()});msg("#telegram-message","Pengaturan Telegram tersimpan.","success")}catch(err){msg("#telegram-message",err.message)}}
async function testTelegram(){try{await api("testTelegram");msg("#telegram-message","Pesan test berhasil dikirim.","success")}catch(e){msg("#telegram-message",e.message)}}
async function boot(){bindEvents();renderHomeCategories();if(state.token){try{const d=await api("me");state.user=d.user;state.role=d.user.role;showPage(state.role==="SISWA"?"student":state.role==="GURU"?"teacher":"admin")}catch{logout(false);showPage("home")}}else showPage("home");try{state.categories=await api("getCategories");renderCategorySelects();renderHomeCategories()}catch(e){/* API may not be configured yet */}}
boot();
