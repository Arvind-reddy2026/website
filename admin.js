let data=loadSiteData();
const $=id=>document.getElementById(id);
function toast(t){const x=$("toast");x.textContent=t;x.style.display="block";setTimeout(()=>x.style.display="none",1600)}
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
 document.querySelectorAll(".tab,.panel").forEach(x=>x.classList.remove("active"));
 b.classList.add("active");$(b.dataset.tab).classList.add("active");
});
function fill(){
 $("pName").value=data.profile.name;$("pParty").value=data.profile.party;$("pConstituency").value=data.profile.constituency;
 $("pTagEn").value=data.profile.taglineEn;$("pTagKn").value=data.profile.taglineKn;$("pAboutEn").value=data.profile.aboutEn;$("pAboutKn").value=data.profile.aboutKn;
 $("cPhone").value=data.contact.phone;$("cEmail").value=data.contact.email;$("cWhatsapp").value=data.contact.whatsapp;$("cOffice").value=data.contact.office;
 $("cInstagram").value=data.contact.instagram;$("cFacebook").value=data.contact.facebook;$("cYoutube").value=data.contact.youtube;render();
}
function persist(){saveSiteData(data);toast("Saved locally")}
function saveProfile(){data.profile={name:$("pName").value,party:$("pParty").value,constituency:$("pConstituency").value,taglineEn:$("pTagEn").value,taglineKn:$("pTagKn").value,aboutEn:$("pAboutEn").value,aboutKn:$("pAboutKn").value};persist()}
function saveContact(){data.contact={phone:$("cPhone").value,email:$("cEmail").value,whatsapp:$("cWhatsapp").value,office:$("cOffice").value,instagram:$("cInstagram").value,facebook:$("cFacebook").value,youtube:$("cYoutube").value};persist()}
function addNews(){if(!$("nTitle").value)return;data.news.unshift({id:Date.now(),title:$("nTitle").value,date:$("nDate").value,body:$("nBody").value});$("nTitle").value="";$("nBody").value="";persist();render()}
function addEvent(){if(!$("eTitle").value)return;data.events.unshift({id:Date.now(),title:$("eTitle").value,date:$("eDate").value,location:$("eLocation").value});$("eTitle").value="";$("eLocation").value="";persist();render()}
function addGallery(){
 const f=$("gFile").files[0]; if(!f)return;
 const r=new FileReader();r.onload=()=>{data.gallery.unshift({id:Date.now(),src:r.result,caption:$("gCaption").value});persist();render()};r.readAsDataURL(f);
}
function del(type,id){data[type]=data[type].filter(x=>x.id!==id);persist();render()}
function render(){
 $("newsList").innerHTML=data.news.map(x=>`<div class="item"><div><b>${esc(x.title)}</b><small>${esc(x.date||"")}</small><div>${esc(x.body||"")}</div></div><button onclick="del('news',${x.id})">Delete</button></div>`).join("")||"<p>No news yet.</p>";
 $("eventList").innerHTML=data.events.map(x=>`<div class="item"><div><b>${esc(x.title)}</b><div>${esc(x.date||"")} · ${esc(x.location||"")}</div></div><button onclick="del('events',${x.id})">Delete</button></div>`).join("")||"<p>No events yet.</p>";
 $("galleryList").innerHTML=data.gallery.map(x=>`<div class="thumb"><img src="${x.src}" alt=""><div>${esc(x.caption||"")} <button onclick="del('gallery',${x.id})">Delete</button></div></div>`).join("")||"<p>No additional photos yet.</p>";
}
function esc(v){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function exportData(){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="arvind-reddy-site-backup.json";a.click();URL.revokeObjectURL(a.href)}
function restoreData(input){const f=input.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{data=JSON.parse(r.result);saveSiteData(data);fill();toast("Backup restored")}catch{toast("Invalid JSON")}};r.readAsText(f)}
function resetData(){if(confirm("Reset all locally stored admin data?")){localStorage.removeItem("arvindReddySiteData");data=loadSiteData();fill();toast("Reset complete")}}
fill();
