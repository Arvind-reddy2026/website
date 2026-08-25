const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY
);

let lang = "kn";
let siteData = null;

const $ = (id) => document.getElementById(id);

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function setLanguage(next) {
  lang = next;
  document.documentElement.lang = lang === "kn" ? "kn" : "en";
  document.querySelectorAll("[data-en]").forEach(el => {
    el.textContent = el.dataset[lang];
  });
  if (siteData?.profile) {
    const p = siteData.profile;
    const tagline = lang === "kn" ? p.tagline_kn : p.tagline_en;
    const about = lang === "kn" ? p.about_kn : p.about_en;
    const heroTag = document.querySelector(".hero-lead");
    const aboutText = document.querySelector("#aboutLive");
    if (heroTag && tagline) heroTag.textContent = tagline;
    if (aboutText && about) aboutText.textContent = about;
  }
  $("language").textContent = lang === "en" ? "ಕನ್ನಡ" : "English";
  renderNews();
  renderEvents();
  renderInitiatives();
  renderDocuments();
}

async function loadPublicData() {
  const [{ data: profile }, { data: news }, { data: events }, { data: initiatives }, { data: contact }, { data: documents }] =
    await Promise.all([
      supabaseClient.from("site_profile").select("*").order("id").limit(1).maybeSingle(),
      supabaseClient.from("news").select("*"),
      supabaseClient.from("events").select("*").order("event_date", { ascending: true }),
      supabaseClient.from("initiatives").select("*").order("initiative_date", { ascending: false }).order("created_at", { ascending: false }),
      supabaseClient.from("site_contact").select("*").order("id").limit(1).maybeSingle(),
      supabaseClient.from("documents").select("*").order("created_at", { ascending: false })
    ]);

  const latestNews = (news || []).slice().sort((a,b) => {
    const da = new Date(a.publish_date || a.created_at || 0).getTime();
    const db = new Date(b.publish_date || b.created_at || 0).getTime();
    return db - da;
  });
  siteData = { profile, news: latestNews, events: events || [], initiatives: initiatives || [], contact, documents: documents || [] };

  if (profile) {
    const brandName = document.querySelector(".brand-name b");
    if (brandName) brandName.textContent = safe(profile.name);
    const heroName = document.querySelector(".hero-copy h1");
    if (heroName) heroName.innerHTML = `<span>${safe(profile.name.split(" ")[0])}</span><strong>${safe(profile.name.split(" ").slice(1).join(" "))}</strong>`;
    const eyebrow = document.querySelector(".eyebrow span:last-child");
    if (eyebrow) eyebrow.textContent = `${profile.party} • ${profile.constituency} ವಿಧಾನಸಭಾ ಕ್ಷೇತ್ರ`;
    const tagline = lang === "kn" ? profile.tagline_kn : profile.tagline_en;
    const about = lang === "kn" ? profile.about_kn : profile.about_en;
    const heroTag = document.querySelector(".hero-lead");
    const aboutText = document.querySelector("#aboutLive");
    if (heroTag && tagline) heroTag.textContent = tagline;
    if (aboutText && about) aboutText.textContent = about;
  }

  renderNews();
  renderEvents();
  
  renderContact();
  renderDocuments();
}

function renderNews() {
  const box = document.getElementById("newsFeed");
  const list = siteData?.news || [];
  if (!box) return;

  const valid = list.filter(item => {
    const title = String(item?.title_kn || item?.title_en || "").trim();
    return title.length >= 2;
  });

  if (!valid.length) {
    box.innerHTML = `
      <div class="news-empty">
        <span class="news-empty-mark">+</span>
        <div>
          <h3>${lang === "kn" ? "ಇತ್ತೀಚಿನ ಸುದ್ದಿ ಶೀಘ್ರದಲ್ಲೇ" : "Latest news coming soon"}</h3>
          <p>${lang === "kn" ? "ಅಧಿಕೃತ ಸುದ್ದಿ ಮತ್ತು ಸಾರ್ವಜನಿಕ ನವೀಕರಣಗಳನ್ನು ಆಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್‌ನಿಂದ ಪ್ರಕಟಿಸಲಾಗುತ್ತದೆ." : "Official news and public updates will be published from the Admin panel."}</p>
        </div>
      </div>`;
    return;
  }

  const titleOf = item => lang === "kn"
    ? (item.title_kn || item.title_en)
    : (item.title_en || item.title_kn);

  const bodyOf = item => lang === "kn"
    ? (item.body_kn || item.body_en)
    : (item.body_en || item.body_kn);

  const dateOf = item => item.publish_date
    ? new Date(item.publish_date).toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN", {
        day: "2-digit", month: "short", year: "numeric"
      })
    : "";

  const excerpt = text => {
    const clean = String(text || "").replace(/\s+/g, " ").trim();
    return clean.length > 150 ? clean.slice(0, 147) + "…" : clean;
  };

  box.innerHTML = `
    <div class="news-card-grid">
      ${valid.slice(0, 6).map((item, i) => `
        <article class="news-card" data-news-index="${i}">
          <div class="news-card-top">
            <span class="news-card-number">${String(i + 1).padStart(2, "0")}</span>
            <time>${safe(dateOf(item))}</time>
          </div>
          <div class="news-card-kicker">${lang === "kn" ? "ಅಧಿಕೃತ ಸುದ್ದಿ" : "OFFICIAL NEWS"}</div>
          <h3>${safe(titleOf(item))}</h3>
          <p>${safe(excerpt(bodyOf(item)))}</p>
          <button class="read-more" type="button" data-news-index="${i}">
            <span>${lang === "kn" ? "ಪೂರ್ಣ ಸುದ್ದಿ ಓದಿ" : "Read more"}</span><b>→</b>
          </button>
        </article>
      `).join("")}
    </div>`;

  box.querySelectorAll(".read-more, .news-card").forEach(el => {
    el.addEventListener("click", event => {
      if (event.target.closest(".read-more") || el.classList.contains("news-card")) {
        const index = Number(el.dataset.newsIndex);
        openNewsModal(valid[index]);
      }
    });
  });
}

function openNewsModal(item) {
  if (!item) return;
  const modal = document.getElementById("newsModal");
  const title = document.getElementById("newsModalTitle");
  const body = document.getElementById("newsModalBody");
  const date = document.getElementById("newsModalDate");
  const kicker = document.getElementById("newsModalKicker");
  if (!modal || !title || !body) return;

  const titleText = lang === "kn" ? (item.title_kn || item.title_en) : (item.title_en || item.title_kn);
  const bodyText = lang === "kn" ? (item.body_kn || item.body_en) : (item.body_en || item.body_kn);
  const dateText = item.publish_date
    ? new Date(item.publish_date).toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN", {
        day: "2-digit", month: "long", year: "numeric"
      })
    : "";

  kicker.textContent = lang === "kn" ? "ಅಧಿಕೃತ ಸುದ್ದಿ" : "OFFICIAL NEWS";
  title.textContent = titleText || "";
  date.textContent = dateText;
  body.innerHTML = safe(String(bodyText || ""))
    .split(/\n{2,}/)
    .map(p => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  document.getElementById("closeNews")?.focus();
}

function closeNewsModal() {
  const modal = document.getElementById("newsModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function renderEvents() {
  const box = document.getElementById("eventsFeed");
  if (!box) return;
  const list = siteData?.events || [];

  if (!list.length) {
    box.innerHTML = `<div class="events-empty">${lang === "kn" ? "ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳಿಲ್ಲ." : "No upcoming events yet."}</div>`;
    return;
  }

  const valid = list.filter(item => String(item?.title_kn || item?.title_en || "").trim().length >= 2);

  if (!valid.length) {
    box.innerHTML = `<div class="events-empty">${lang === "kn" ? "ಕಾರ್ಯಕ್ರಮಗಳ ವಿವರಗಳನ್ನು ಶೀಘ್ರದಲ್ಲೇ ಪ್ರಕಟಿಸಲಾಗುತ್ತದೆ." : "Event details will be published soon."}</div>`;
    return;
  }

  box.innerHTML = valid.slice(0, 6).map(item => {
    const title = lang === "kn" ? (item.title_kn || item.title_en) : (item.title_en || item.title_kn);
    const body = lang === "kn" ? (item.description_kn || item.description_en) : (item.description_en || item.description_kn);
    const date = item.event_date ? new Date(item.event_date) : null;
    const day = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-IN", {day:"2-digit"}) : "—";
    const month = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(lang === "kn" ? "kn-IN" : "en-IN", {month:"short"}) : "";
    return `<article class="event-row">
      <div class="event-date"><b>${safe(day)}</b><span>${safe(month)}</span></div>
      <div><h3>${safe(title)}</h3><p>${safe(body || "")}</p></div>
      <span class="event-arrow">→</span>
    </article>`;
  }).join("");
}

function initiativeImageUrl(path){
  if(!path) return '';
  return supabaseClient.storage.from('site-media').getPublicUrl(path).data.publicUrl;
}

function renderInitiatives(){
  const box=document.getElementById('initiativeFeed');
  if(!box) return;
  const list=siteData?.initiatives||[];
  if(!list.length){
    box.innerHTML=`<div class="initiative-empty"><span>+</span><div><h3>${lang==='kn'?'ಉಪಕ್ರಮಗಳು ಶೀಘ್ರದಲ್ಲೇ':'Initiatives coming soon'}</h3><p>${lang==='kn'?'ಅಧಿಕೃತ ಅಭಿವೃದ್ಧಿ ಕೆಲಸಗಳು ಮತ್ತು ಸಾರ್ವಜನಿಕ ಸೇವಾ ಯೋಜನೆಗಳನ್ನು ಆಡ್ಮಿನ್ ಪ್ಯಾನೆಲ್‌ನಿಂದ ಪ್ರಕಟಿಸಲಾಗುತ್ತದೆ.':'Official development work and public-service projects will be published from the Admin panel.'}</p></div></div>`;
    return;
  }
  const titleOf=x=>lang==='kn'?(x.title_kn||x.title_en):(x.title_en||x.title_kn);
  const catOf=x=>lang==='kn'?(x.category_kn||x.category_en):(x.category_en||x.category_kn);
  const summaryOf=x=>lang==='kn'?(x.summary_kn||x.summary_en):(x.summary_en||x.summary_kn);
  const dateOf=x=>x.initiative_date?new Date(x.initiative_date).toLocaleDateString(lang==='kn'?'kn-IN':'en-IN',{day:'2-digit',month:'short',year:'numeric'}):'';
  box.innerHTML=`<div class="initiative-grid dynamic">${list.slice(0,12).map((x,i)=>{
    const paths=Array.isArray(x.image_paths)?x.image_paths:[];
    const image=paths.length?initiativeImageUrl(paths[0]):'';
    return `<article class="initiative-card" data-initiative-index="${i}">
      ${image?`<div class="initiative-card-image"><img src="${safe(image)}" alt="${safe(titleOf(x))}" loading="lazy"></div>`:`<div class="initiative-card-noimage"><span>AR</span></div>`}
      <div class="initiative-card-body">
        <div class="initiative-card-top"><span>${safe(catOf(x)||'INITIATIVE')}</span><time>${safe(dateOf(x))}</time></div>
        <h3>${safe(titleOf(x))}</h3>
        <p>${safe(summaryOf(x)||'')}</p>
        <button class="read-initiative" type="button" data-initiative-index="${i}">${lang==='kn'?'ಪೂರ್ಣ ವಿವರ':'View details'} <b>→</b></button>
      </div>
    </article>`;
  }).join('')}</div>`;
  box.querySelectorAll('.initiative-card').forEach(card=>card.addEventListener('click',()=>openInitiativeModal(list[Number(card.dataset.initiativeIndex)])));
}

function openInitiativeModal(item){
  const modal=document.getElementById('initiativeModal');
  if(!modal||!item)return;
  const title=lang==='kn'?(item.title_kn||item.title_en):(item.title_en||item.title_kn);
  const cat=lang==='kn'?(item.category_kn||item.category_en):(item.category_en||item.category_kn);
  const summary=lang==='kn'?(item.summary_kn||item.summary_en):(item.summary_en||item.summary_kn);
  const body=lang==='kn'?(item.body_kn||item.body_en):(item.body_en||item.body_kn);
  const impact=lang==='kn'?(item.impact_kn||item.impact_en):(item.impact_en||item.impact_kn);
  const location=lang==='kn'?(item.location_kn||item.location_en):(item.location_en||item.location_kn);
  const date=item.initiative_date?new Date(item.initiative_date).toLocaleDateString(lang==='kn'?'kn-IN':'en-IN',{day:'2-digit',month:'long',year:'numeric'}):'';
  document.getElementById('initiativeModalTitle').textContent=title||'';
  document.getElementById('initiativeModalKicker').textContent=cat|| (lang==='kn'?'ಅಧಿಕೃತ ಉಪಕ್ರಮ':'OFFICIAL INITIATIVE');
  document.getElementById('initiativeModalMeta').textContent=[date,location].filter(Boolean).join(' · ');
  document.getElementById('initiativeModalSummary').textContent=summary||'';
  document.getElementById('initiativeModalBody').innerHTML=safe(String(body||'')).split(/\n{2,}/).map(p=>`<p>${p.replace(/\n/g,'<br>')}</p>`).join('');
  document.getElementById('initiativeModalImpact').innerHTML=impact?`<strong>${lang==='kn'?'ಫಲಿತಾಂಶ / ಪರಿಣಾಮ':'Impact / Result'}</strong><p>${safe(impact)}</p>`:'';
  const media=document.getElementById('initiativeModalMedia');
  const paths=Array.isArray(item.image_paths)?item.image_paths:[];
  media.innerHTML=paths.length?paths.map(path=>`<img src="${safe(initiativeImageUrl(path))}" alt="${safe(title||'Initiative image')}" loading="lazy">`).join(''):`<div class="initiative-modal-noimage">AR</div>`;
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
}

function closeInitiativeModal(){
  const modal=document.getElementById('initiativeModal');
  if(!modal)return;
  modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open');
}

function renderGallery() { return; }

function renderContact() {
  const c = siteData?.contact;
  if (!c) return;
  const panel = document.querySelector(".contact-panel");
  if (!panel) return;
  const rows = [];
  if (c.phone) rows.push(`<div><small>PHONE</small><b>${safe(c.phone)}</b></div>`);
  if (c.email) rows.push(`<div><small>EMAIL</small><b>${safe(c.email)}</b></div>`);
  if (c.office) rows.push(`<div><small>OFFICE</small><b>${safe(c.office)}</b></div>`);
  if (c.whatsapp) rows.push(`<a class="contact-action" href="https://wa.me/${safe(c.whatsapp.replace(/\D/g,''))}" target="_blank">WhatsApp</a>`);
  if (!rows.length) return;
  panel.innerHTML = rows.join("");
}

function bindGallery() {
  const lightbox = $("lightbox"), img = $("lightboxImg");
  document.querySelectorAll(".gallery-grid button").forEach(btn => {
    btn.addEventListener("click", () => {
      img.src = btn.dataset.image;
      lightbox.classList.add("open");
    });
  });
}

$("language").addEventListener("click", () => setLanguage(lang === "en" ? "kn" : "en"));
$("year").textContent = new Date().getFullYear();
$("close").addEventListener("click", () => $("lightbox").classList.remove("open"));
$("lightbox").addEventListener("click", e => { if (e.target === $("lightbox")) $("lightbox").classList.remove("open"); });
$("closeNews")?.addEventListener("click", closeNewsModal);
document.querySelector("[data-close-news]")?.addEventListener("click", closeNewsModal);

document.addEventListener("keydown", e => { if (e.key === "Escape") { $("lightbox").classList.remove("open"); closeNewsModal(); } });

document.getElementById('closeInitiative')?.addEventListener('click',closeInitiativeModal);
document.querySelector('[data-close-initiative]')?.addEventListener('click',closeInitiativeModal);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeInitiativeModal();});

loadPublicData().catch(err => console.error("Supabase load error:", err));

function renderDocuments() {
  const grid = document.getElementById("documentsGrid");
  if (!grid) return;
  const docs = siteData?.documents || [];
  if (!docs.length) {
    grid.innerHTML = `<div class="empty-docs">${lang === "kn" ? "ದಾಖಲೆಗಳು ಇಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ." : "Documents will appear here."}</div>`;
    return;
  }
  grid.innerHTML = docs.map(d => {
    const url = supabaseClient.storage.from("site-media").getPublicUrl(d.storage_path).data.publicUrl;
    const title = lang === "kn" ? (d.title_kn || d.title_en) : d.title_en;
    const desc = lang === "kn" ? (d.description_kn || d.description_en) : d.description_en;
    return `<article class="document-card">
      <div class="document-icon">PDF</div>
      <h3>${safe(title)}</h3>
      <p>${safe(desc || "")}</p>
      <a href="${safe(url)}" target="_blank" rel="noopener">View / Download</a>
    </article>`;
  }).join("");
}

/* =========================================================
   V3 NAVIGATION / SCROLL FIXES
   ========================================================= */
(() => {
  const header = document.getElementById("siteNav");
  const scrollCue = document.querySelector(".scroll-cue");
  const menu = document.getElementById("mobileMenu");
  const menuBtn = document.getElementById("menuBtn");

  function goTo(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const offset = (header?.offsetHeight || 0) + 10;
    const y = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
  }

  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
      const id = link.getAttribute("href").slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      history.pushState(null, "", `#${id}`);
      goTo(id);
      document.querySelectorAll(".desktop-nav a").forEach(a =>
        a.classList.toggle("active", a.getAttribute("href") === `#${id}`)
      );
      if (menu?.classList.contains("open")) {
        menu.classList.remove("open");
        if (menuBtn) menuBtn.textContent = "☰";
      }
    });
  });

  if (scrollCue) {
    scrollCue.setAttribute("role", "button");
    scrollCue.setAttribute("tabindex", "0");
    scrollCue.addEventListener("click", () => goTo("about"));
    scrollCue.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        goTo("about");
      }
    });
  }

  function updateActive() {
    const y = window.scrollY + (header?.offsetHeight || 0) + 80;
    const ids = ["home","about","work","updates","events","documents","contact"];
    let current = "home";
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= y) current = id;
    });
    document.querySelectorAll(".desktop-nav a").forEach(a =>
      a.classList.toggle("active", a.getAttribute("href") === `#${current}`)
    );
  }
  window.addEventListener("scroll", updateActive, {passive:true});
  updateActive();

  // If the browser opened a hash URL, always scroll to that section after layout.
  if (location.hash) {
    const id = location.hash.slice(1);
    requestAnimationFrame(() => setTimeout(() => goTo(id), 80));
  }

  // Start in Kannada and show the alternate language in the switcher.
  if (typeof setLanguage === "function") setLanguage("kn");
})();
