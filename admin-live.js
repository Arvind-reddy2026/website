const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY
);

let profileRow, contactRow, newsRows=[], eventRows=[], initiativeRows=[], documentRows=[], galleryRows=[];
let dirty = false;
const $ = id => document.getElementById(id);
const formIds = [
  "pName","pParty","pConstituency","pTagEn","pTagKn","pAboutEn","pAboutKn",
  "nTitleEn","nTitleKn","nDate","nBodyEn","nBodyKn",
  "eTitleEn","eTitleKn","eDate","eDay","eTime","eLocationEn","eLocationKn","eDescEn","eDescKn",
  "iTitleEn","iTitleKn","iCategoryEn","iCategoryKn","iDate","iLocationEn","iLocationKn","iSummaryEn","iSummaryKn","iBodyEn","iBodyKn","iImpactEn","iImpactKn",
  "dTitleEn","dTitleKn","dDescEn","dDescKn","gCaptionEn","gCaptionKn",
  "cPhone","cEmail","cWhatsapp","cOffice","cInstagram","cFacebook","cYoutube"
];

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function errText(e){return e?.message || String(e || "Unknown error")}
function setDirty(v=true){
  dirty=v;
  $("dirtyState")?.classList.toggle("hidden",!v);
}
function markFormDirty(){ if(!document.body.dataset.loading) setDirty(true); }

// ============================================================
// AUTOMATIC ENGLISH ↔ KANNADA TRANSLATION
// Type in either side of a bilingual field and the other side
// is translated automatically. Programmatic updates never
// trigger another translation, so there are no translation loops.
// ============================================================
const translationPairs = [
  ["pTagEn","pTagKn"],["pAboutEn","pAboutKn"],
  ["nTitleEn","nTitleKn"],["nBodyEn","nBodyKn"],
  ["eTitleEn","eTitleKn"],["eLocationEn","eLocationKn"],["eDescEn","eDescKn"],
  ["iTitleEn","iTitleKn"],["iCategoryEn","iCategoryKn"],["iLocationEn","iLocationKn"],
  ["iSummaryEn","iSummaryKn"],["iBodyEn","iBodyKn"],["iImpactEn","iImpactKn"],
  ["dTitleEn","dTitleKn"],["dDescEn","dDescKn"],
  ["gCaptionEn","gCaptionKn"]
];
const translationTimers = new Map();
const translationControllers = new Map();
let translationSequence = 0;

function looksKannada(text){
  const chars=String(text||"").match(/[\u0C80-\u0CFF]/g)||[];
  const letters=String(text||"").match(/[A-Za-z\u0C80-\u0CFF]/g)||[];
  return chars.length >= 2 && chars.length >= Math.max(2, letters.length * 0.15);
}
function splitTranslationText(text,max=1700){
  const value=String(text||"");
  if(value.length<=max)return [value];
  const parts=[];let rest=value;
  while(rest.length>max){
    let cut=Math.max(rest.lastIndexOf("\n",max),rest.lastIndexOf(". ",max),rest.lastIndexOf("? ",max),rest.lastIndexOf("! ",max));
    if(cut<Math.floor(max*.55))cut=max;
    else if(rest[cut]===".")cut+=1;
    parts.push(rest.slice(0,cut));rest=rest.slice(cut);
  }
  if(rest)parts.push(rest);return parts;
}
async function translateChunk(text,source,target){
  const q=encodeURIComponent(text);
  const google=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${source}&tl=${target}&dt=t&q=${q}`;
  try{
    const r=await fetch(google,{headers:{Accept:"application/json"}});
    if(!r.ok)throw new Error("Translation service unavailable");
    const data=await r.json();
    const out=(data?.[0]||[]).map(x=>x?.[0]||"").join("");
    if(out.trim())return out;
  }catch(e){}
  const mm=`https://api.mymemory.translated.net/get?q=${q}&langpair=${source}|${target}`;
  const r=await fetch(mm,{headers:{Accept:"application/json"}});
  if(!r.ok)throw new Error("Automatic translation is unavailable right now");
  const data=await r.json();
  const out=data?.responseData?.translatedText||"";
  if(!out.trim())throw new Error("Automatic translation returned no text");
  return out;
}
async function translateText(text,source,target){
  const parts=splitTranslationText(text);
  const out=[];
  for(const part of parts)out.push(await translateChunk(part,source,target));
  return out.join("");
}
function translationStatus(state,message){
  const el=$("translationState");if(!el)return;
  el.className=`translation-state ${state||""}`;
  el.innerHTML=`<i></i> ${esc(message||"Auto ON")}`;
}
function installTranslationPairs(){
  translationPairs.forEach(([enId,knId])=>{
    const en=$(enId),kn=$(knId);if(!en||!kn)return;
    const attach=(source,target,sourceLang,targetLang)=>{
      source.addEventListener("input",()=>{
        markFormDirty();
        const value=source.value.trim();
        clearTimeout(translationTimers.get(source.id));
        if(translationControllers.has(source.id))translationControllers.get(source.id).abort();
        if(!value){target.value="";return;}
        // Don't replace a language with a second translation while the user
        // is typing a single word; wait briefly for a natural pause.
        const timer=setTimeout(async()=>{
          const sequence=++translationSequence;
          const controller=new AbortController();translationControllers.set(source.id,controller);
          translationStatus("busy","Translating…");
          try{
            // Skip obviously same-language input on the opposite side.
            const isKn=looksKannada(value);
            const actualSource=isKn?"kn":"en";
            const actualTarget=isKn?"en":"kn";
            if(actualSource!==sourceLang){
              translationStatus("","Auto ON");return;
            }
            const translated=await translateText(value,actualSource,actualTarget);
            if(controller.signal.aborted||sequence!==translationSequence)return;
            target.value=translated;
            translationStatus("","Auto ON");
            markFormDirty();
          }catch(e){
            if(controller.signal.aborted)return;
            translationStatus("error","Translation unavailable");
            toast("Could not translate automatically. You can enter the other language manually.","warning");
          }finally{translationControllers.delete(source.id);}
        },700);
        translationTimers.set(source.id,timer);
      });
    };
    attach(en,kn,"en","kn");
    attach(kn,en,"kn","en");
  });
}

function toast(message,type="success"){
  const x=$("toast");
  x.className=`toast ${type}`;
  x.innerHTML=`<span class="toast-icon">${type==="success"?"✓":type==="error"?"×":type==="warning"?"!":"i"}</span><span>${esc(message)}</span><button onclick="this.parentElement.classList.remove('show')">×</button>`;
  requestAnimationFrame(()=>x.classList.add("show"));
  clearTimeout(window.__toastTimer);
  window.__toastTimer=setTimeout(()=>x.classList.remove("show"),3800);
}

function setConnection(state, message){
  const pill=$("connectionStatus"), side=$("sideStatus");
  if(!pill)return;
  pill.className=`connection-pill ${state}`;
  pill.innerHTML=`<i></i> ${esc(message)}`;
  if(side) side.textContent=message==="Connected"?"Connected to Supabase":message;
}

function confirmAction({title,message,changes=[],confirmText="Confirm & Save",danger=false}){
  return new Promise(resolve=>{
    const root=$("modalRoot");
    const rows=changes.filter(Boolean).map(c=>`<div class="change-row"><span>${esc(c.label)}</span><div><b>${esc(c.from||"—")}</b><em>→</em><strong>${esc(c.to||"—")}</strong></div></div>`).join("");
    root.innerHTML=`<div class="modal-backdrop"><div class="confirm-modal" role="dialog" aria-modal="true">
      <button class="modal-close" data-cancel>×</button>
      <div class="modal-icon ${danger?"danger":""}">${danger?"!":"✓"}</div>
      <span class="modal-kicker">${danger?"CONFIRM ACTION":"REVIEW CHANGES"}</span>
      <h3>${esc(title)}</h3><p>${esc(message)}</p>
      ${rows?`<div class="change-list">${rows}</div>`:""}
      <div class="modal-actions"><button class="ghost-btn" data-cancel>Cancel</button><button class="save ${danger?"danger-btn":""}" data-confirm>${esc(confirmText)}</button></div>
    </div></div>`;
    root.classList.remove("hidden");
    const close=()=>{root.classList.add("hidden");resolve(false)};
    root.querySelectorAll("[data-cancel]").forEach(b=>b.onclick=close);
    root.querySelector("[data-confirm]").onclick=()=>{root.classList.add("hidden");resolve(true)};
    root.querySelector(".modal-backdrop").onclick=e=>{if(e.target.classList.contains("modal-backdrop"))close()};
  });
}

async function withSaving(fn, successMessage){
  setConnection("saving","Saving");
  try{
    const result=await fn();
    if(result?.error) throw result.error;
    setConnection("connected","Connected");
    setDirty(false);
    toast(successMessage,"success");
    return result;
  }catch(e){
    setConnection("error","Save failed");
    toast(errText(e),"error");
    setConnection("connected","Connected");
    return null;
  }
}

document.querySelectorAll(".tab").forEach(b=>b.onclick=async()=>{
  if(dirty){
    const ok=await confirmAction({
      title:"Leave with unsaved changes?",
      message:"You have changes that have not been saved. Leaving this section will keep the current values only until this page is refreshed.",
      confirmText:"Discard & Continue",
      danger:true
    });
    if(!ok)return;
    setDirty(false);
  }
  document.querySelectorAll(".tab,.panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");$(b.dataset.tab).classList.add("active");
});

formIds.forEach(id=>$(id)?.addEventListener("input",markFormDirty));
["iFiles","dFile","gFile"].forEach(id=>$(id)?.addEventListener("change",markFormDirty));

function resetIds(ids){ids.forEach(id=>{const el=$(id);if(el)el.value=""})}
function change(label,from,to){return {label,from:String(from??""),to:String(to??"")}}
function dayFromDate(value){
  if(!value)return "";
  const [y,m,d]=value.split("-").map(Number);
  if(!y||!m||!d)return "";
  return new Intl.DateTimeFormat("en-IN",{weekday:"long"}).format(new Date(y,m-1,d));
}
$("eDate")?.addEventListener("change",()=>{ $("eDay").value=dayFromDate($("eDate").value); markFormDirty(); });

async function boot(){
  document.body.dataset.loading="1";
  const {data:{session},error}=await supabaseClient.auth.getSession();
  if(error){setConnection("error","Connection error");return showLogin();}
  if(session) await showApp(session); else showLogin();
  supabaseClient.auth.onAuthStateChange(async(_event,session)=>{
    if(session) await showApp(session); else showLogin();
  });
  document.body.dataset.loading="";
}
function showLogin(){ $("loginScreen").classList.remove("hidden"); $("app").classList.add("hidden"); }
async function showApp(session){
  $("loginScreen").classList.add("hidden"); $("app").classList.remove("hidden");
  $("adminEmail").textContent=session.user.email||"Admin";
  await loadAll();
}

$("loginBtn").onclick=async()=>{
  $("loginError").textContent="";
  setConnection("saving","Signing in");
  const email=$("loginEmail").value.trim(), password=$("loginPassword").value;
  const {error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error){$("loginError").textContent=errText(error);setConnection("error","Sign in failed");}
};
$("loginPassword").addEventListener("keydown",e=>{if(e.key==="Enter")$("loginBtn").click()});
$("logout").onclick=async()=>{
  const ok=await confirmAction({title:"Sign out of Admin?",message:"Your saved changes are safe. You will need to sign in again to manage the website.",confirmText:"Sign out",danger:true});
  if(ok) await supabaseClient.auth.signOut();
};

async function loadAll(){
  document.body.dataset.loading="1";
  setConnection("saving","Loading");
  const [p,c]=await Promise.all([
    supabaseClient.from("site_profile").select("*").order("id").limit(1).maybeSingle(),
    supabaseClient.from("site_contact").select("*").order("id").limit(1).maybeSingle()
  ]);
  if(p.error)toast(errText(p.error),"error");
  if(c.error)toast(errText(c.error),"error");
  profileRow=p.data; contactRow=c.data;
  if(profileRow){
    $("pName").value=profileRow.name||"";$("pParty").value=profileRow.party||"";$("pConstituency").value=profileRow.constituency||"";
    $("pTagEn").value=profileRow.tagline_en||"";$("pTagKn").value=profileRow.tagline_kn||"";
    $("pAboutEn").value=profileRow.about_en||"";$("pAboutKn").value=profileRow.about_kn||"";
  }
  if(contactRow){
    $("cPhone").value=contactRow.phone||"";$("cEmail").value=contactRow.email||"";$("cWhatsapp").value=contactRow.whatsapp||"";
    $("cOffice").value=contactRow.office||"";$("cInstagram").value=contactRow.instagram||"";$("cFacebook").value=contactRow.facebook||"";$("cYoutube").value=contactRow.youtube||"";
  }
  await Promise.all([loadNews(),loadEvents(),loadInitiatives(),loadDocuments(),loadGallery()]);
  setDirty(false); document.body.dataset.loading=""; setConnection("connected","Connected");
}

async function saveProfile(){
  const payload={name:$("pName").value.trim(),party:$("pParty").value.trim(),constituency:$("pConstituency").value.trim(),tagline_en:$("pTagEn").value,tagline_kn:$("pTagKn").value,about_en:$("pAboutEn").value,about_kn:$("pAboutKn").value,updated_at:new Date().toISOString()};
  const ok=await confirmAction({title:"Save profile changes?",message:"These details will be published to the public website after the save succeeds.",changes:[
    change("Name",profileRow?.name,payload.name),change("Party",profileRow?.party,payload.party),change("Constituency",profileRow?.constituency,payload.constituency)
  ]});
  if(!ok)return;
  const result=await withSaving(async()=>{
    return profileRow?.id
      ? await supabaseClient.from("site_profile").update(payload).eq("id",profileRow.id).select().single()
      : await supabaseClient.from("site_profile").insert(payload).select().single();
  },"Profile saved successfully");
  if(result?.data)profileRow=result.data;
}

async function saveContact(){
  const payload={phone:$("cPhone").value.trim(),email:$("cEmail").value.trim(),whatsapp:$("cWhatsapp").value.trim(),office:$("cOffice").value.trim(),instagram:$("cInstagram").value.trim(),facebook:$("cFacebook").value.trim(),youtube:$("cYoutube").value.trim(),updated_at:new Date().toISOString()};
  const ok=await confirmAction({title:"Save contact changes?",message:"The new contact details will be visible on the public website after confirmation.",changes:[
    change("Phone",contactRow?.phone,payload.phone),change("Email",contactRow?.email,payload.email),change("WhatsApp",contactRow?.whatsapp,payload.whatsapp),change("Facebook",contactRow?.facebook,payload.facebook),change("Instagram",contactRow?.instagram,payload.instagram),change("YouTube",contactRow?.youtube,payload.youtube)
  ]});
  if(!ok)return;
  const result=await withSaving(async()=>{
    return contactRow?.id
      ? await supabaseClient.from("site_contact").update(payload).eq("id",contactRow.id).select().single()
      : await supabaseClient.from("site_contact").insert(payload).select().single();
  },"Contact information saved successfully");
  if(result?.data)contactRow=result.data;
}

async function saveNews(){
  const editId=$("nEditId").value;
  const payload={title_en:$("nTitleEn").value.trim(),title_kn:$("nTitleKn").value.trim(),body_en:$("nBodyEn").value,body_kn:$("nBodyKn").value,publish_date:$("nDate").value||null};
  if(!payload.title_en&&!payload.title_kn)return toast("Add a news title","warning");
  const existing=editId?newsRows.find(x=>String(x.id)===String(editId)):null;
  const ok=await confirmAction({title:editId?"Update this news item?":"Publish this news item?",message:editId?"The updated story will replace the current public version.":"This story will become visible in the public news feed.",changes:[
    change("Title",existing?.title_en,payload.title_en),change("Publish date",existing?.publish_date,payload.publish_date),change("Content",existing?.body_en,payload.body_en)
  ]});
  if(!ok)return;
  const result=await withSaving(async()=>{
    return editId
      ? await supabaseClient.from("news").update(payload).eq("id",editId).select().single()
      : await supabaseClient.from("news").insert(payload).select().single();
  },editId?"News item updated successfully":"News published successfully");
  if(result?.data){resetNewsForm();await loadNews();}
}

async function loadNews(){
  const q=await supabaseClient.from("news").select("*");
  if(q.error)return toast(errText(q.error),"error");
  newsRows=(q.data||[]).sort((a,b)=>new Date(b.publish_date||b.created_at||0)-new Date(a.publish_date||a.created_at||0));
  $("statNews").textContent=newsRows.length;
  $("newsList").innerHTML=newsRows.map(x=>`<div class="item"><div class="item-main"><b>${esc(x.title_en||x.title_kn)}</b><small>${esc(x.publish_date||formatDate(x.created_at))}</small><div>${esc(x.body_en||x.body_kn||"")}</div></div><div class="item-actions"><button class="edit-btn" onclick="editNews(${x.id})">Edit</button><button class="delete-btn" onclick="deleteRow('news',${x.id})">Delete</button></div></div>`).join("")||"<div class=\"empty-state\">No news yet. Create the first update above.</div>";
}
function editNews(id){
  const x=newsRows.find(r=>r.id===id);if(!x)return;
  $("nEditId").value=x.id;$("nTitleEn").value=x.title_en||"";$("nTitleKn").value=x.title_kn||"";$("nDate").value=x.publish_date||"";$("nBodyEn").value=x.body_en||"";$("nBodyKn").value=x.body_kn||"";
  $("newsFormHeading").textContent="Edit news";$("newsModeHint").textContent="Editing an existing public update.";$("cancelNewsEdit").classList.remove("hidden");setDirty(false);
  window.scrollTo({top:0,behavior:"smooth"});
}
function resetNewsForm(){resetIds(["nEditId","nTitleEn","nTitleKn","nDate","nBodyEn","nBodyKn"]);$("newsFormHeading").textContent="Latest news";$("newsModeHint").textContent="Create a new public news update.";$("cancelNewsEdit").classList.add("hidden");setDirty(false)}
function cancelNewsEdit(){resetNewsForm()}

async function saveEvent(){
  const editId=$("eEditId").value;
  const payload={title_en:$("eTitleEn").value.trim(),title_kn:$("eTitleKn").value.trim(),event_date:$("eDate").value||null,event_time:$("eTime").value||null,location_en:$("eLocationEn").value.trim(),location_kn:$("eLocationKn").value.trim(),description_en:$("eDescEn").value,description_kn:$("eDescKn").value};
  if(!payload.title_en&&!payload.title_kn)return toast("Add an event title","warning");
  const existing=editId?eventRows.find(x=>String(x.id)===String(editId)):null;
  const ok=await confirmAction({title:editId?"Update this event?":"Add this event?",message:"The event details will be published on the public Events section after confirmation.",changes:[
    change("Title",existing?.title_en,payload.title_en),change("Date",existing?.event_date,payload.event_date),change("Day",existing?.event_date?dayFromDate(existing.event_date):"",dayFromDate(payload.event_date)),change("Time",existing?.event_time,payload.event_time),change("Location",existing?.location_en,payload.location_en)
  ]});
  if(!ok)return;
  const result=await withSaving(async()=>{
    return editId
      ? await supabaseClient.from("events").update(payload).eq("id",editId).select().single()
      : await supabaseClient.from("events").insert(payload).select().single();
  },editId?"Event updated successfully":"Event added successfully");
  if(result?.data){resetEventForm();await loadEvents();}
}
async function loadEvents(){
  const q=await supabaseClient.from("events").select("*").order("event_date",{ascending:true});
  if(q.error)return toast(errText(q.error),"error");
  eventRows=q.data||[];$("statEvents").textContent=eventRows.length;
  $("eventList").innerHTML=eventRows.map(x=>`<div class="item"><div class="item-main"><div class="event-meta"><span>${esc(x.event_date?formatDate(x.event_date):"Date not set")}</span>${x.event_time?`<span>${esc(formatTime(x.event_time))}</span>`:""}<span>${esc(x.location_en||x.location_kn||"")}</span></div><b>${esc(x.title_en||x.title_kn)}</b><small>${esc(x.event_date?dayFromDate(x.event_date):"")}</small><div>${esc(x.description_en||x.description_kn||"")}</div></div><div class="item-actions"><button class="edit-btn" onclick="editEvent(${x.id})">Edit</button><button class="delete-btn" onclick="deleteRow('events',${x.id})">Delete</button></div></div>`).join("")||"<div class=\"empty-state\">No events yet. Add a public programme above.</div>";
}
function editEvent(id){
  const x=eventRows.find(r=>r.id===id);if(!x)return;
  $("eEditId").value=x.id;$("eTitleEn").value=x.title_en||"";$("eTitleKn").value=x.title_kn||"";$("eDate").value=x.event_date||"";$("eDay").value=dayFromDate(x.event_date);$("eTime").value=x.event_time||"";$("eLocationEn").value=x.location_en||"";$("eLocationKn").value=x.location_kn||"";$("eDescEn").value=x.description_en||"";$("eDescKn").value=x.description_kn||"";
  $("eventFormHeading").textContent="Edit event";$("eventModeHint").textContent="Editing an existing public programme.";$("cancelEventEdit").classList.remove("hidden");setDirty(false);window.scrollTo({top:0,behavior:"smooth"});
}
function resetEventForm(){resetIds(["eEditId","eTitleEn","eTitleKn","eDate","eDay","eTime","eLocationEn","eLocationKn","eDescEn","eDescKn"]);$("eventFormHeading").textContent="Events";$("eventModeHint").textContent="Create a new public event.";$("cancelEventEdit").classList.add("hidden");setDirty(false)}
function cancelEventEdit(){resetEventForm()}

async function saveInitiative(){
  const editId=$("iEditId").value;
  const existing=editId?initiativeRows.find(x=>String(x.id)===String(editId)):null;
  const payload={title_en:$("iTitleEn").value.trim(),title_kn:$("iTitleKn").value.trim(),category_en:$("iCategoryEn").value.trim(),category_kn:$("iCategoryKn").value.trim(),summary_en:$("iSummaryEn").value.trim(),summary_kn:$("iSummaryKn").value.trim(),body_en:$("iBodyEn").value.trim(),body_kn:$("iBodyKn").value.trim(),impact_en:$("iImpactEn").value.trim(),impact_kn:$("iImpactKn").value.trim(),initiative_date:$("iDate").value||null,location_en:$("iLocationEn").value.trim(),location_kn:$("iLocationKn").value.trim()};
  if(!payload.title_en&&!payload.title_kn)return toast("Add an initiative title","warning");
  const files=Array.from($("iFiles").files||[]).slice(0,5);
  for(const file of files){if(!file.type.startsWith("image/"))return toast("Only image files are allowed","warning");if(file.size>10*1024*1024)return toast("Each image must be under 10 MB","warning");}
  const ok=await confirmAction({title:editId?"Update this initiative?":"Publish this initiative?",message:"The project details and any selected images will be written to Supabase.",changes:[
    change("Title",existing?.title_en,payload.title_en),change("Category",existing?.category_en,payload.category_en),change("Date",existing?.initiative_date,payload.initiative_date),change("Location",existing?.location_en,payload.location_en)
  ]});
  if(!ok)return;
  const result=await withSaving(async()=>{
    let paths=Array.isArray(existing?.image_paths)?[...existing.image_paths]:[];
    for(const file of files){
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
      const path=`initiatives/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName}`;
      const upload=await supabaseClient.storage.from("site-media").upload(path,file,{cacheControl:"3600",upsert:false});
      if(upload.error){if(paths.length> (existing?.image_paths?.length||0)) await supabaseClient.storage.from("site-media").remove(paths.slice(existing?.image_paths?.length||0));throw upload.error;}
      paths.push(path);
    }
    payload.image_paths=paths.slice(0,5);
    if(editId)return await supabaseClient.from("initiatives").update({...payload,updated_at:new Date().toISOString()}).eq("id",editId).select().single();
    return await supabaseClient.from("initiatives").insert({...payload,image_paths:paths.slice(0,5)}).select().single();
  },editId?"Initiative updated successfully":"Initiative published successfully");
  if(result?.data){resetInitiativeForm();await loadInitiatives();}
}
async function loadInitiatives(){
  const q=await supabaseClient.from("initiatives").select("*").order("initiative_date",{ascending:false}).order("created_at",{ascending:false});
  if(q.error)return toast(errText(q.error),"error");
  initiativeRows=q.data||[];$("statInitiatives").textContent=initiativeRows.length;
  $("initiativeList").innerHTML=initiativeRows.map(x=>`<div class="item"><div class="item-main"><b>${esc(x.title_en||x.title_kn||"Untitled")}</b><small>${esc(x.category_en||x.category_kn||"")} · ${esc(x.initiative_date||"")} ${esc(x.location_en||x.location_kn||"")}</small><div>${esc(x.summary_en||x.summary_kn||"")}</div><small>${Array.isArray(x.image_paths)?x.image_paths.length:0} image(s)</small></div><div class="item-actions"><button class="edit-btn" onclick="editInitiative(${x.id})">Edit</button><button class="delete-btn" onclick="deleteInitiative(${x.id})">Delete</button></div></div>`).join("")||"<div class=\"empty-state\">No initiatives yet. Add your first project above.</div>";
}
function editInitiative(id){
  const x=initiativeRows.find(r=>r.id===id);if(!x)return;
  $("iEditId").value=x.id;
  const map={iTitleEn:"title_en",iTitleKn:"title_kn",iCategoryEn:"category_en",iCategoryKn:"category_kn",iDate:"initiative_date",iLocationEn:"location_en",iLocationKn:"location_kn",iSummaryEn:"summary_en",iSummaryKn:"summary_kn",iBodyEn:"body_en",iBodyKn:"body_kn",iImpactEn:"impact_en",iImpactKn:"impact_kn"};
  Object.entries(map).forEach(([id,key])=>$(id).value=x[key]||"");
  $("initiativeFormHeading").textContent="Edit initiative";$("initiativeModeHint").textContent="Editing an existing development project.";$("cancelInitiativeEdit").classList.remove("hidden");setDirty(false);window.scrollTo({top:0,behavior:"smooth"});
}
function resetInitiativeForm(){resetIds(["iEditId","iTitleEn","iTitleKn","iCategoryEn","iCategoryKn","iDate","iLocationEn","iLocationKn","iSummaryEn","iSummaryKn","iBodyEn","iBodyKn","iImpactEn","iImpactKn"]);$("iFiles").value="";$("initiativeFormHeading").textContent="Initiatives & Development";$("initiativeModeHint").textContent="Create a new initiative.";$("cancelInitiativeEdit").classList.add("hidden");setDirty(false)}
function cancelInitiativeEdit(){resetInitiativeForm()}

async function saveDocument(){
  const editId=$("dEditId").value, file=$("dFile").files[0];
  const existing=editId?documentRows.find(x=>String(x.id)===String(editId)):null;
  if(!editId && !file)return toast("Choose a PDF first","warning");
  if(file&&!file.name.toLowerCase().endsWith(".pdf"))return toast("Please select a .pdf file","warning");
  if(file&&file.size>20*1024*1024)return toast("PDF must be under 20 MB","warning");
  const payload={title_en:$("dTitleEn").value.trim()||(file?.name||existing?.title_en||"Document"),title_kn:$("dTitleKn").value.trim(),description_en:$("dDescEn").value.trim(),description_kn:$("dDescKn").value.trim()};
  const ok=await confirmAction({title:editId?"Update document details?":"Upload this PDF?",message:editId&&!file?"The document's public details will be updated.":"The PDF will be uploaded to Supabase Storage and published to the website.",changes:[
    change("Title",existing?.title_en,payload.title_en),change("Description",existing?.description_en,payload.description_en),...(file?[change("File",existing?.file_name,file.name)]:[])
  ]});
  if(!ok)return;
  const result=await withSaving(async()=>{
    if(editId){
      if(file){
        const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"),path=`documents/${Date.now()}-${safeName}`;
        const upload=await supabaseClient.storage.from("site-media").upload(path,file,{cacheControl:"3600",upsert:false,contentType:"application/pdf"});
        if(upload.error)throw upload.error;
        const oldPath=existing.storage_path;
        const q=await supabaseClient.from("documents").update({...payload,storage_path:path,file_name:file.name}).eq("id",editId).select().single();
        if(q.error){await supabaseClient.storage.from("site-media").remove([path]);throw q.error;}
        if(oldPath)await supabaseClient.storage.from("site-media").remove([oldPath]);
        return q;
      }
      return await supabaseClient.from("documents").update(payload).eq("id",editId).select().single();
    }
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"),path=`documents/${Date.now()}-${safeName}`;
    const upload=await supabaseClient.storage.from("site-media").upload(path,file,{cacheControl:"3600",upsert:false,contentType:"application/pdf"});
    if(upload.error)throw upload.error;
    const q=await supabaseClient.from("documents").insert({...payload,storage_path:path,file_name:file.name}).select().single();
    if(q.error){await supabaseClient.storage.from("site-media").remove([path]);throw q.error;}
    return q;
  },editId?"Document updated successfully":"PDF uploaded successfully");
  if(result?.data){resetDocumentForm();await loadDocuments();}
}
async function loadDocuments(){
  const q=await supabaseClient.from("documents").select("*").order("created_at",{ascending:false});
  if(q.error)return toast(errText(q.error),"error");
  documentRows=q.data||[];$("statDocuments").textContent=documentRows.length;
  $("documentList").innerHTML=documentRows.map(x=>{
    const url=supabaseClient.storage.from("site-media").getPublicUrl(x.storage_path).data.publicUrl;
    return `<div class="item"><div class="item-main"><b>${esc(x.title_en||x.title_kn)}</b><small>${esc(x.file_name)} · ${esc(formatDateTime(x.created_at))}</small><div>${esc(x.description_en||x.description_kn||"")}</div></div><div class="item-actions"><a class="edit-btn" href="${esc(url)}" target="_blank" rel="noopener">View</a><button class="edit-btn" onclick="editDocument(${x.id})">Edit</button><button class="delete-btn" onclick="deleteDocument(${x.id})">Delete</button></div></div>`;
  }).join("")||"<div class=\"empty-state\">No documents yet. Upload the first PDF above.</div>";
}
function editDocument(id){
  const x=documentRows.find(r=>r.id===id);if(!x)return;
  $("dEditId").value=x.id;$("dTitleEn").value=x.title_en||"";$("dTitleKn").value=x.title_kn||"";$("dDescEn").value=x.description_en||"";$("dDescKn").value=x.description_kn||"";$("dFile").value="";
  $("documentModeHint").textContent=`Editing ${x.file_name}. Select a new PDF only if you want to replace it.`;$("cancelDocumentEdit").classList.remove("hidden");setDirty(false);
}
function resetDocumentForm(){resetIds(["dEditId","dTitleEn","dTitleKn","dDescEn","dDescKn"]);$("dFile").value="";$("documentModeHint").textContent="Upload a new PDF or edit an existing document.";$("cancelDocumentEdit").classList.add("hidden");setDirty(false)}
function cancelDocumentEdit(){resetDocumentForm()}

async function deleteDocument(id){
  const row=documentRows.find(x=>x.id===id);if(!row)return;
  const ok=await confirmAction({title:"Delete this document?",message:"This will remove the database record and the actual PDF object from Supabase Storage. The storage space can then be reused.",confirmText:"Delete document",danger:true});
  if(!ok)return;
  const result=await withSaving(async()=>{
    if(row.storage_path){
      const storage=await supabaseClient.storage.from("site-media").remove([row.storage_path]);
      if(storage.error)throw storage.error;
    }
    return await supabaseClient.from("documents").delete().eq("id",id);
  },"Document deleted successfully");
  if(result)await loadDocuments();
}

async function deleteInitiative(id){
  const row=initiativeRows.find(x=>x.id===id);if(!row)return;
  const ok=await confirmAction({title:"Delete this initiative?",message:"The initiative record and all of its uploaded project images will be removed.",confirmText:"Delete initiative",danger:true});
  if(!ok)return;
  const result=await withSaving(async()=>{
    const q=await supabaseClient.from("initiatives").delete().eq("id",id);
    if(q.error)throw q.error;
    const paths=Array.isArray(row.image_paths)?row.image_paths:[];
    if(paths.length){const s=await supabaseClient.storage.from("site-media").remove(paths);if(s.error)throw s.error;}
    return q;
  },"Initiative deleted successfully");
  if(result)await loadInitiatives();
}

async function deleteRow(table,id){
  const row=(table==="news"?newsRows:eventRows).find(x=>x.id===id);if(!row)return;
  const label=table==="news"?"news item":"event";
  const ok=await confirmAction({title:`Delete this ${label}?`,message:`This ${label} will be removed from the public website. This action cannot be undone.`,confirmText:`Delete ${label}`,danger:true});
  if(!ok)return;
  const result=await withSaving(async()=>await supabaseClient.from(table).delete().eq("id",id),`${label[0].toUpperCase()+label.slice(1)} deleted successfully`);
  if(result){if(table==="news")await loadNews();else await loadEvents();}
}

async function saveGallery(){
  const editId=$("gEditId").value,file=$("gFile").files[0],existing=editId?galleryRows.find(x=>String(x.id)===String(editId)):null;
  if(!editId&&!file)return toast("Choose an image first","warning");
  if(file&&!file.type.startsWith("image/"))return toast("Choose an image file","warning");
  if(file&&file.size>10*1024*1024)return toast("Image must be under 10 MB","warning");
  const payload={caption_en:$("gCaptionEn").value.trim(),caption_kn:$("gCaptionKn").value.trim()};
  const ok=await confirmAction({title:editId?"Update gallery photo?":"Upload gallery photo?",message:"The photo and caption will be available to the public gallery after saving.",changes:[
    change("Caption",existing?.caption_en,payload.caption_en),...(file?[change("File",existing?.storage_path?.split("/").pop(),file.name)]:[])
  ]});
  if(!ok)return;
  const result=await withSaving(async()=>{
    if(editId){
      if(file){
        const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"),path=`gallery/${Date.now()}-${safeName}`;
        const upload=await supabaseClient.storage.from("site-media").upload(path,file,{cacheControl:"3600",upsert:false});
        if(upload.error)throw upload.error;
        const q=await supabaseClient.from("gallery").update({...payload,storage_path:path}).eq("id",editId).select().single();
        if(q.error){await supabaseClient.storage.from("site-media").remove([path]);throw q.error;}
        if(existing.storage_path)await supabaseClient.storage.from("site-media").remove([existing.storage_path]);
        return q;
      }
      return await supabaseClient.from("gallery").update(payload).eq("id",editId).select().single();
    }
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"-"),path=`gallery/${Date.now()}-${safeName}`;
    const upload=await supabaseClient.storage.from("site-media").upload(path,file,{cacheControl:"3600",upsert:false});
    if(upload.error)throw upload.error;
    const q=await supabaseClient.from("gallery").insert({...payload,storage_path:path}).select().single();
    if(q.error){await supabaseClient.storage.from("site-media").remove([path]);throw q.error;}
    return q;
  },editId?"Gallery photo updated successfully":"Gallery photo uploaded successfully");
  if(result?.data){resetGalleryForm();await loadGallery();}
}
async function loadGallery(){
  const q=await supabaseClient.from("gallery").select("*").order("created_at",{ascending:false});
  if(q.error)return toast(errText(q.error),"error");
  galleryRows=q.data||[];
  $("galleryList").innerHTML=galleryRows.map(x=>{
    const url=supabaseClient.storage.from("site-media").getPublicUrl(x.storage_path).data.publicUrl;
    return `<div class="gallery-admin-card"><img src="${esc(url)}" alt="${esc(x.caption_en||x.caption_kn||"Gallery photo")}"><div class="gallery-admin-info"><b>${esc(x.caption_en||x.caption_kn||"Untitled photo")}</b><small>${esc(formatDateTime(x.created_at))}</small><div class="item-actions"><button class="edit-btn" onclick="editGallery(${x.id})">Edit</button><button class="delete-btn" onclick="deleteGallery(${x.id})">Delete</button></div></div></div>`;
  }).join("")||"<div class=\"empty-state\">No gallery photos yet.</div>";
}
function editGallery(id){
  const x=galleryRows.find(r=>r.id===id);if(!x)return;
  $("gEditId").value=x.id;$("gCaptionEn").value=x.caption_en||"";$("gCaptionKn").value=x.caption_kn||"";$("gFile").value="";
  $("galleryModeHint").textContent="Editing an existing gallery photo. Select a file to replace it.";$("cancelGalleryEdit").classList.remove("hidden");setDirty(false);
}
function resetGalleryForm(){resetIds(["gEditId","gCaptionEn","gCaptionKn"]);$("gFile").value="";$("galleryModeHint").textContent="Upload a new gallery photo.";$("cancelGalleryEdit").classList.add("hidden");setDirty(false)}
function cancelGalleryEdit(){resetGalleryForm()}
async function deleteGallery(id){
  const row=galleryRows.find(x=>x.id===id);if(!row)return;
  const ok=await confirmAction({title:"Delete this gallery photo?",message:"The database record and actual Storage image will be permanently removed.",confirmText:"Delete photo",danger:true});
  if(!ok)return;
  const result=await withSaving(async()=>{
    if(row.storage_path){const s=await supabaseClient.storage.from("site-media").remove([row.storage_path]);if(s.error)throw s.error;}
    return await supabaseClient.from("gallery").delete().eq("id",id);
  },"Gallery photo deleted successfully");
  if(result)await loadGallery();
}

function formatDate(v){if(!v)return "";const [y,m,d]=String(v).slice(0,10).split("-").map(Number);if(!y)return v;return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(y,m-1,d))}
function formatTime(v){if(!v)return "";const [h,m]=String(v).split(":").map(Number);if(Number.isNaN(h))return v;const d=new Date();d.setHours(h,m||0,0,0);return new Intl.DateTimeFormat("en-IN",{hour:"numeric",minute:"2-digit"}).format(d)}
function formatDateTime(v){if(!v)return "";try{return new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(v))}catch{return v}}
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
installTranslationPairs();
boot();
