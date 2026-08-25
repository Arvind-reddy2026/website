const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY
);
let profileRow, contactRow, newsRows=[], eventRows=[], initiativeRows=[], documentRows=[];
const $=id=>document.getElementById(id);

function toast(t){const x=$("toast");x.textContent=t;x.style.display="block";setTimeout(()=>x.style.display="none",1800)}
function errText(e){return e?.message || String(e)}

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab,.panel").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");$(b.dataset.tab).classList.add("active");
});

async function boot(){
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(session) showApp(session); else showLogin();
  supabaseClient.auth.onAuthStateChange((_event, session)=>{
    if(session) showApp(session); else showLogin();
  });
}
function showLogin(){ $("loginScreen").classList.remove("hidden"); $("app").classList.add("hidden"); }
async function showApp(session){
  $("loginScreen").classList.add("hidden"); $("app").classList.remove("hidden");
  $("adminEmail").textContent=session.user.email||"";
  await loadAll();
}
$("loginBtn").onclick=async()=>{
  $("loginError").textContent="";
  const email=$("loginEmail").value.trim(), password=$("loginPassword").value;
  const {error}=await supabaseClient.auth.signInWithPassword({email,password});
  if(error) $("loginError").textContent=errText(error);
};
$("loginPassword").addEventListener("keydown",e=>{if(e.key==="Enter")$("loginBtn").click()});
$("logout").onclick=()=>supabaseClient.auth.signOut();

async function loadAll(){
  const p=await supabaseClient.from("site_profile").select("*").order("id").limit(1).maybeSingle();
  profileRow=p.data;
  if(profileRow){
    $("pName").value=profileRow.name||"";$("pParty").value=profileRow.party||"";$("pConstituency").value=profileRow.constituency||"";
    $("pTagEn").value=profileRow.tagline_en||"";$("pTagKn").value=profileRow.tagline_kn||"";
    $("pAboutEn").value=profileRow.about_en||"";$("pAboutKn").value=profileRow.about_kn||"";
  }
  const c=await supabaseClient.from("site_contact").select("*").order("id").limit(1).maybeSingle();
  contactRow=c.data;
  if(contactRow){
    $("cPhone").value=contactRow.phone||"";$("cEmail").value=contactRow.email||"";$("cWhatsapp").value=contactRow.whatsapp||"";
    $("cOffice").value=contactRow.office||"";$("cInstagram").value=contactRow.instagram||"";$("cFacebook").value=contactRow.facebook||"";$("cYoutube").value=contactRow.youtube||"";
  }
  await Promise.all([loadNews(),loadEvents(),loadInitiatives(),loadDocuments()]);
}
async function saveProfile(){
  const payload={name:$("pName").value,party:$("pParty").value,constituency:$("pConstituency").value,tagline_en:$("pTagEn").value,tagline_kn:$("pTagKn").value,about_en:$("pAboutEn").value,about_kn:$("pAboutKn").value,updated_at:new Date().toISOString()};
  const q=profileRow?.id
    ? await supabaseClient.from("site_profile").update(payload).eq("id",profileRow.id).select().single()
    : await supabaseClient.from("site_profile").insert(payload).select().single();
  if(q.error)return toast(errText(q.error)); profileRow=q.data; toast("Profile saved");
}
async function saveContact(){
  const payload={phone:$("cPhone").value,email:$("cEmail").value,whatsapp:$("cWhatsapp").value,office:$("cOffice").value,instagram:$("cInstagram").value,facebook:$("cFacebook").value,youtube:$("cYoutube").value,updated_at:new Date().toISOString()};
  const q=contactRow?.id
    ? await supabaseClient.from("site_contact").update(payload).eq("id",contactRow.id).select().single()
    : await supabaseClient.from("site_contact").insert(payload).select().single();
  if(q.error)return toast(errText(q.error)); contactRow=q.data; toast("Contact saved");
}
async function addNews(){
  const payload={title_en:$("nTitleEn").value,title_kn:$("nTitleKn").value,body_en:$("nBodyEn").value,body_kn:$("nBodyKn").value,publish_date:$("nDate").value||null};
  if(!payload.title_en)return toast("English title is required");
  const q=await supabaseClient.from("news").insert(payload);
  if(q.error)return toast(errText(q.error));
  ["nTitleEn","nTitleKn","nDate","nBodyEn","nBodyKn"].forEach(id=>$(id).value="");
  await loadNews();toast("News published");
}
async function loadNews(){
  const q=await supabaseClient.from("news").select("*");
  if(q.error)return toast(errText(q.error));
  newsRows=(q.data||[]).sort((a,b)=>{
    const da=new Date(a.publish_date||a.created_at||0).getTime();
    const db=new Date(b.publish_date||b.created_at||0).getTime();
    return db-da;
  });
  const stat=$("statNews"); if(stat) stat.textContent=newsRows.length;
  $("newsList").innerHTML=newsRows.map((x,i)=>`<div class="item"><div><b>${i===0?'<span style="color:#168447;font-size:9px;letter-spacing:.1em;margin-right:7px">LATEST</span>':''}${esc(x.title_en||x.title_kn)}</b><small>${esc(x.publish_date||new Date(x.created_at).toLocaleDateString('en-IN'))}</small><div>${esc(x.body_en||x.body_kn||"")}</div></div><button onclick="deleteRow('news',${x.id})">Delete</button></div>`).join("")||"<p>No news yet.</p>";
}
async function addEvent(){
  const payload={title_en:$("eTitleEn").value,title_kn:$("eTitleKn").value,event_date:$("eDate").value||null,location_en:$("eLocationEn").value,location_kn:$("eLocationKn").value};
  if(!payload.title_en)return toast("English title is required");
  const q=await supabaseClient.from("events").insert(payload);
  if(q.error)return toast(errText(q.error));
  ["eTitleEn","eTitleKn","eDate","eLocationEn","eLocationKn"].forEach(id=>$(id).value="");
  await loadEvents();toast("Event added");
}
async function loadEvents(){
  const q=await supabaseClient.from("events").select("*").order("event_date",{ascending:true});
  if(q.error)return toast(errText(q.error));eventRows=q.data||[];
  const stat=$("statEvents"); if(stat) stat.textContent=eventRows.length;
  $("eventList").innerHTML=eventRows.map(x=>`<div class="item"><div><b>${esc(x.title_en)}</b><small>${esc(x.event_date||"")}</small><div>${esc(x.location_en||"")}</div></div><button onclick="deleteRow('events',${x.id})">Delete</button></div>`).join("")||"<p>No events yet.</p>";
}

async function deleteRow(table,id){
  if(!confirm(`Delete this ${table === "news" ? "news item" : "event"}?`)) return;
  const q=await supabaseClient.from(table).delete().eq("id",id);
  if(q.error)return toast(errText(q.error));
  if(table === "news") await loadNews();
  if(table === "events") await loadEvents();
  toast("Deleted");
}

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
boot();

async function addInitiative(){
  const payload={
    title_en:$('iTitleEn').value.trim(),
    title_kn:$('iTitleKn').value.trim(),
    category_en:$('iCategoryEn').value.trim(),
    category_kn:$('iCategoryKn').value.trim(),
    summary_en:$('iSummaryEn').value.trim(),
    summary_kn:$('iSummaryKn').value.trim(),
    body_en:$('iBodyEn').value.trim(),
    body_kn:$('iBodyKn').value.trim(),
    impact_en:$('iImpactEn').value.trim(),
    impact_kn:$('iImpactKn').value.trim(),
    initiative_date:$('iDate').value||null,
    location_en:$('iLocationEn').value.trim(),
    location_kn:$('iLocationKn').value.trim(),
    image_paths:[]
  };
  if(!payload.title_en && !payload.title_kn) return toast('Add an initiative title');

  const files=Array.from($('iFiles').files||[]).slice(0,5);
  for(const file of files){
    if(!file.type.startsWith('image/')) return toast('Only image files are allowed');
    if(file.size>10*1024*1024) return toast('Each image must be under 10 MB');
  }

  const uploaded=[];
  for(const file of files){
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'-');
    const path=`initiatives/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safeName}`;
    const upload=await supabaseClient.storage.from('site-media').upload(path,file,{cacheControl:'3600',upsert:false});
    if(upload.error){
      if(uploaded.length) await supabaseClient.storage.from('site-media').remove(uploaded);
      return toast('Image upload failed: '+errText(upload.error));
    }
    uploaded.push(path);
  }
  payload.image_paths=uploaded;

  const q=await supabaseClient.from('initiatives').insert(payload);
  if(q.error){
    if(uploaded.length) await supabaseClient.storage.from('site-media').remove(uploaded);
    return toast('Initiative save failed: '+errText(q.error));
  }
  ['iTitleEn','iTitleKn','iCategoryEn','iCategoryKn','iDate','iLocationEn','iLocationKn','iSummaryEn','iSummaryKn','iBodyEn','iBodyKn','iImpactEn','iImpactKn'].forEach(id=>$(id).value='');
  $('iFiles').value='';
  await loadInitiatives();
  toast('Initiative published');
}

async function loadInitiatives(){
  const q=await supabaseClient.from('initiatives').select('*').order('initiative_date',{ascending:false}).order('created_at',{ascending:false});
  if(q.error) return toast(errText(q.error));
  initiativeRows=q.data||[];
  const stat=$("statInitiatives"); if(stat) stat.textContent=initiativeRows.length;
  $('initiativeList').innerHTML=initiativeRows.map(x=>{
    const title=x.title_en||x.title_kn||'Untitled';
    const imgs=Array.isArray(x.image_paths)?x.image_paths.length:0;
    return `<div class="item initiative-admin-item"><div><b>${esc(title)}</b><small>${esc(x.category_en||x.category_kn||'')} · ${esc(x.initiative_date||'')} ${esc(x.location_en||x.location_kn||'')}</small><div>${esc(x.summary_en||x.summary_kn||'')}</div><small>${imgs} image${imgs===1?'':'s'}</small></div><button onclick="deleteInitiative(${x.id})">Delete</button></div>`;
  }).join('')||'<p>No initiatives yet.</p>';
}

async function deleteInitiative(id){
  if(!confirm('Delete this initiative and its uploaded images?')) return;
  const row=initiativeRows.find(x=>x.id===id);
  const q=await supabaseClient.from('initiatives').delete().eq('id',id);
  if(q.error) return toast(errText(q.error));
  const paths=Array.isArray(row?.image_paths)?row.image_paths:[];
  if(paths.length) await supabaseClient.storage.from('site-media').remove(paths);
  await loadInitiatives();
  toast('Initiative deleted');
}

async function addDocument(){
  const file=$("dFile").files[0];

  if(!file){
    return toast("Choose a PDF first");
  }

  // Some browsers report PDFs with an empty or generic MIME type.
  // Validate by extension instead of rejecting a valid PDF because of file.type.
  const isPdf = file.name.toLowerCase().endsWith(".pdf");
  if(!isPdf){
    return toast("Please select a .pdf file");
  }

  // Keep the client-side limit comfortably below common free storage limits.
  if(file.size > 20 * 1024 * 1024){
    return toast("PDF must be under 20 MB");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `documents/${Date.now()}-${safeName}`;

  const upload = await supabaseClient.storage
    .from("site-media")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf"
    });

  if(upload.error){
    console.error("PDF storage upload error:", upload.error);
    return toast("PDF upload failed: " + (upload.error.message || "Storage error"));
  }

  const q = await supabaseClient
    .from("documents")
    .insert({
      title_en: $("dTitleEn").value.trim() || file.name,
      title_kn: $("dTitleKn").value.trim(),
      description_en: $("dDescEn").value.trim(),
      description_kn: $("dDescKn").value.trim(),
      storage_path: path,
      file_name: file.name
    });

  if(q.error){
    console.error("PDF database insert error:", q.error);
    await supabaseClient.storage.from("site-media").remove([path]);
    return toast("PDF record failed: " + (q.error.message || "Database error"));
  }

  $("dFile").value = "";
  $("dTitleEn").value = "";
  $("dTitleKn").value = "";
  $("dDescEn").value = "";
  $("dDescKn").value = "";

  await loadDocuments();
  toast("PDF uploaded successfully");
}
async function loadDocuments(){
  const q=await supabaseClient.from("documents").select("*").order("created_at",{ascending:false});
  if(q.error)return toast(errText(q.error));
  documentRows=q.data||[];
  const stat=$("statDocuments"); if(stat) stat.textContent=documentRows.length;
  $("documentList").innerHTML=documentRows.map(x=>{
    const url=supabaseClient.storage.from("site-media").getPublicUrl(x.storage_path).data.publicUrl;
    return `<div class="item"><div><b>${esc(x.title_en)}</b><small>${esc(x.file_name)}</small><div>${esc(x.description_en||"")}</div></div><div><a href="${esc(url)}" target="_blank">View</a> <button onclick="deleteDocument(${x.id},'${encodeURIComponent(x.storage_path)}')">Delete</button></div></div>`;
  }).join("")||"<p>No documents yet.</p>";
}
async function deleteDocument(id,encodedPath){
  if(!confirm("Delete this document?"))return;
  const path=decodeURIComponent(encodedPath);
  const q=await supabaseClient.from("documents").delete().eq("id",id);
  if(q.error)return toast(errText(q.error));
  await supabaseClient.storage.from("site-media").remove([path]);
  await loadDocuments();toast("Document deleted");
}
