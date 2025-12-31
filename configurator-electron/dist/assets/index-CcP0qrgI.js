(function(){const s=document.createElement("link").relList;if(s&&s.supports&&s.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const c of o.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&n(c)}).observe(document,{childList:!0,subtree:!0});function e(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(a){if(a.ep)return;a.ep=!0;const o=e(a);fetch(a.href,o)}})();let i={},C=null,T=[],E=!1;document.addEventListener("DOMContentLoaded",async()=>{i=await window.api.getDirectories(),z(),O(),q(),U(),V(),await g(),await v(),await w(),r("Ready to configure your Stream Deck","success")});function z(){E=localStorage.getItem("darkMode")==="true",D(),document.getElementById("theme-toggle").addEventListener("click",()=>{E=!E,localStorage.setItem("darkMode",E),D()})}function D(){const t=document.getElementById("theme-icon");E?(document.documentElement.classList.add("dark"),document.body.classList.add("dark"),t.textContent="☀️"):(document.documentElement.classList.remove("dark"),document.body.classList.remove("dark"),t.textContent="🌙")}function O(){document.querySelectorAll(".tab").forEach(t=>{t.addEventListener("click",()=>S(t.dataset.tab))})}function S(t){document.querySelectorAll(".tab").forEach(s=>{s.dataset.tab===t?(s.classList.remove("tab-inactive"),s.classList.add("tab-active")):(s.classList.remove("tab-active"),s.classList.add("tab-inactive"))}),document.querySelectorAll(".tab-content").forEach(s=>{s.classList.add("hidden")}),document.getElementById(t+"-tab").classList.remove("hidden")}function q(){document.addEventListener("keydown",t=>{(t.ctrlKey&&t.key==="w"||t.ctrlKey&&t.key==="q"||t.key==="Escape")&&(t.preventDefault(),window.close()),t.ctrlKey&&t.key==="1"&&S("buttons"),t.ctrlKey&&t.key==="2"&&S("dials"),t.ctrlKey&&t.key==="3"&&S("touchscreen"),t.ctrlKey&&t.key==="e"&&(t.preventDefault(),A()),t.ctrlKey&&t.key==="i"&&(t.preventDefault(),R()),t.ctrlKey&&t.key==="d"&&(t.preventDefault(),document.getElementById("theme-toggle").click())})}function U(){document.getElementById("export-btn").addEventListener("click",A),document.getElementById("import-btn").addEventListener("click",R),document.getElementById("autostart-btn").addEventListener("click",_),M()}async function M(){const t=await window.api.checkAutostart(),s=document.getElementById("autostart-btn");t.success&&t.enabled?(s.innerHTML="<span>✓</span> Auto-start ON",s.classList.add("bg-green-500/20")):(s.innerHTML="<span>⚙️</span> Auto-start",s.classList.remove("bg-green-500/20"))}async function _(){const t=await window.api.checkAutostart(),s=!(t.success&&t.enabled);await window.api.toggleAutostart(s),await M(),r(s?"Auto-start enabled":"Auto-start disabled","success")}async function A(){const t=await window.api.browseSaveFile({title:"Export Configuration",defaultPath:"streamdeck-config.tar.gz",filters:[{name:"Tar Archive",extensions:["tar.gz"]}]});if(!t.canceled&&t.filePath){const s=`tar -czf "${t.filePath}" -C "${i.streamdeck}" buttons dials touchscreen`,e=await window.api.execCommand(s);e.success?r("Configuration exported successfully","success"):r("Export failed: "+e.error,"error")}}async function R(){const t=await window.api.browseFile({title:"Import Configuration",filters:[{name:"Tar Archive",extensions:["tar.gz"]}]});if(!t.canceled&&t.filePaths.length>0){const s=`tar -xzf "${t.filePaths[0]}" -C "${i.streamdeck}"`,e=await window.api.execCommand(s);e.success?(r("Configuration imported - reloading...","success"),await Promise.all([g(),v(),w()]),await window.api.restartDaemon()):r("Import failed: "+e.error,"error")}}function r(t,s="info"){const e=document.getElementById("toast-container"),n=document.createElement("div"),a={success:"✓",error:"✕",warning:"⚠",info:"ℹ"},o={success:"bg-deck-success",error:"bg-deck-danger",warning:"bg-deck-warning",info:"bg-deck-primary"};n.className=`toast ${o[s]}`,n.innerHTML=`
    <span class="text-xl">${a[s]}</span>
    <span class="flex-1">${t}</span>
    <button class="btn-icon hover:bg-white/20 text-white" onclick="this.parentElement.remove()">×</button>
  `,e.appendChild(n),setTimeout(()=>{n.style.opacity="0",n.style.transform="translateX(100px)",setTimeout(()=>n.remove(),300)},4e3),W(t,s)}function W(t,s="info"){const e=document.getElementById("status-text"),n=document.getElementById("status-indicator");e.textContent=t,e.className="",s==="success"?(e.classList.add("text-deck-success"),n.className="config-indicator config-indicator-active"):s==="error"?(e.classList.add("text-deck-danger"),n.className="config-indicator bg-deck-danger"):s==="warning"?(e.classList.add("text-deck-warning"),n.className="config-indicator bg-deck-warning"):(e.classList.add("text-gray-600","dark:text-gray-400"),n.className="config-indicator config-indicator-active")}async function h(t){return await window.api.fileExists(t)}async function y(t){const s=await window.api.readFile(t);return s.success?s.content:null}async function b(t,s){return await window.api.writeFile(t,s)}async function x(t){return await window.api.deleteFile(t)}async function H(t,s){for(const e of[".png",".jpg",".jpeg",".svg"]){const n=t+"/"+s+e;if(await h(n))return n}return null}async function $(t){const s=await y(t);if(!s)return"Script configured";const e=s.split(`
`);for(const a of e)if(a.startsWith("# Description:"))return a.replace("# Description:","").trim();const n=e.find(a=>a.trim()&&!a.startsWith("#"));return n?n.substring(0,40)+(n.length>40?"...":""):"Script configured"}async function g(){const t=document.getElementById("buttons-container"),s=t.scrollTop;t.innerHTML="";for(let e=1;e<=8;e++){const n=await Z(e);t.appendChild(n)}t.scrollTop=s,document.getElementById("apply-button-fontsize").onclick=async()=>{const e=document.getElementById("button-fontsize-all").value;for(let n=1;n<=8;n++)await b(i.buttons+"/button-"+n+"-fontsize.txt",e);r(`Font size ${e} applied to all buttons`,"success"),await g()}}async function Z(t){const s=document.createElement("div");s.className="card animate-fade-in";const e=i.buttons+"/button-"+t+".sh",n=await H(i.buttons,"button-"+t),a=i.buttons+"/button-"+t+".txt",o=i.buttons+"/button-"+t+"-position.txt",c=i.buttons+"/button-"+t+"-fontsize.txt",d=await h(e),m=await y(a),p=await y(o)||"bottom",f=await y(c)||"24";let l=`
    <div class="card-header card-header-blue">
      <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">${t}</span>
      <span>Button ${t}</span>
      ${d?'<span class="badge badge-success ml-auto">Configured</span>':'<span class="badge badge-warning ml-auto">Empty</span>'}
    </div>
    <div class="space-y-4">
  `;if(l+='<div class="flex items-start gap-4">',n){const u=await window.api.readImageBase64(n);u.success&&(l+=`<img src="${u.data}" class="image-preview w-16 h-16">`)}else l+=`<div class="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400">
      <span class="text-2xl">🖼</span>
    </div>`;if(l+='<div class="flex-1 space-y-1">',d){const u=await $(e);l+=`<div class="text-deck-success font-medium flex items-center gap-2">
      <span class="config-indicator config-indicator-active"></span>
      ${u}
    </div>`}else l+=`<div class="text-gray-500 dark:text-gray-400 flex items-center gap-2">
      <span class="config-indicator config-indicator-inactive"></span>
      No script assigned
    </div>`;return m&&(l+=`<div class="text-gray-600 dark:text-gray-400 text-sm">Label: "${m}"</div>`),l+="</div></div>",l+='<div class="divider"></div>',l+=`
    <div class="space-y-3">
      <div>
        <span class="label">Script</span>
        <div class="flex flex-wrap gap-2 mt-1">
          <button class="btn-primary text-sm" onclick="browseScript(${t})">
            <span>📁</span> Browse
          </button>
          <button class="btn-success text-sm" onclick="browseExamples(${t}, 'button')">
            <span>📚</span> Examples
          </button>
          <button class="btn-purple text-sm" onclick="recordAction(${t}, 'button')">
            <span>⌨️</span> Record
          </button>
          ${d?`
            <button class="btn-warning text-sm" onclick="editScript('${e}')">
              <span>✏️</span> Edit
            </button>
            <button class="btn-danger text-sm" onclick="removeScript(${t})">
              <span>🗑</span> Remove
            </button>
          `:""}
        </div>
      </div>
      
      <div>
        <span class="label">Image</span>
        <div class="flex flex-wrap gap-2 mt-1">
          <button class="btn-primary text-sm" onclick="browseImage(${t}, 'button')">
            <span>🖼</span> Browse
          </button>
          <button class="btn-purple text-sm" onclick="selectIcon(${t}, 'button')">
            <span>🎨</span> Icons
          </button>
          ${n?`
            <button class="btn-danger text-sm" onclick="removeImage(${t}, 'button')">
              <span>🗑</span> Remove
            </button>
          `:""}
        </div>
      </div>

      <div>
        <span class="label">Label & Style</span>
        <div class="flex flex-wrap gap-2 mt-1 items-center">
          <input type="text" id="button-${t}-label" class="input flex-1" 
                 value="${m||""}" placeholder="Enter label...">
          <select id="button-${t}-position" class="input w-28">
            <option value="top" ${p==="top"?"selected":""}>Top</option>
            <option value="middle" ${p==="middle"?"selected":""}>Middle</option>
            <option value="bottom" ${p==="bottom"?"selected":""}>Bottom</option>
          </select>
          <input type="number" id="button-${t}-fontsize" class="input w-16 text-center" 
                 value="${f}" min="10" max="60">
          <button class="btn-success text-sm" onclick="setLabel(${t}, 'button')">
            <span>✓</span> Save
          </button>
        </div>
      </div>
    </div>
  `,l+="</div>",s.innerHTML=l,s}async function v(){const t=document.getElementById("dials-container"),s=t.scrollTop;t.innerHTML="";for(let e=1;e<=4;e++){const n=await X(e);t.appendChild(n)}t.scrollTop=s}async function X(t){const s=document.createElement("div");s.className="card animate-fade-in";const e=[{key:"cw",name:"Clockwise",icon:"↻",color:"text-blue-500"},{key:"ccw",name:"Counter-Clockwise",icon:"↺",color:"text-green-500"},{key:"press",name:"Press",icon:"⬇",color:"text-amber-500"},{key:"longpress",name:"Long Press",icon:"⏱",color:"text-red-500"}];let n=0;for(const o of e){const c=i.dials+"/dial-"+t+"-"+o.key+".sh";await h(c)&&n++}let a=`
    <div class="card-header card-header-amber">
      <span class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">${t}</span>
      <span>Dial ${t}</span>
      <span class="badge ${n>0?"badge-success":"badge-warning"} ml-auto">${n}/4</span>
    </div>
    <div class="space-y-1">
  `;for(const o of e){const c=i.dials+"/dial-"+t+"-"+o.key+".sh",d=await h(c);a+=`
      <div class="action-row">
        <div class="action-label">
          <span class="${o.color} text-lg">${o.icon}</span>
          ${o.name}
        </div>
        <div class="action-status ${d?"action-status-configured":""}">
          ${d?await $(c):"Not configured"}
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary text-xs px-2 py-1" onclick="browseDialScript(${t}, '${o.key}')">Browse</button>
          <button class="btn-success text-xs px-2 py-1" onclick="browseDialExamples(${t}, '${o.key}')">Examples</button>
          <button class="btn-purple text-xs px-2 py-1" onclick="recordDialAction(${t}, '${o.key}')">Record</button>
          ${d?`
            <button class="btn-warning text-xs px-2 py-1" onclick="editScript('${c}')">Edit</button>
            <button class="btn-danger text-xs px-2 py-1" onclick="removeDialScript(${t}, '${o.key}')">Remove</button>
          `:""}
        </div>
      </div>
    `}return a+="</div>",s.innerHTML=a,s}async function w(){const t=document.getElementById("touchscreen-container"),s=t.scrollTop;t.innerHTML="";for(let n=1;n<=4;n++){const a=await G(n);t.appendChild(a)}const e=await J();t.appendChild(e),t.scrollTop=s,document.getElementById("apply-touch-fontsize").onclick=async()=>{const n=document.getElementById("touch-fontsize-all").value;for(let a=1;a<=4;a++)await b(i.touch+"/touch-"+a+"-fontsize.txt",n);r(`Font size ${n} applied to all zones`,"success"),await w()}}async function G(t){const s=document.createElement("div");s.className="card animate-fade-in";const e=await H(i.touch,"touch-"+t),n=i.touch+"/touch-"+t+".txt",a=i.touch+"/touch-"+t+"-position.txt",o=i.touch+"/touch-"+t+"-fontsize.txt",c=await y(n),d=await y(a)||"middle",m=await y(o)||"28",p=[{suffix:"",name:"Tap",icon:"👆"},{suffix:"-longpress",name:"Long Press",icon:"⏱"},{suffix:"-swipe-up",name:"Swipe Up",icon:"⬆️"},{suffix:"-swipe-down",name:"Swipe Down",icon:"⬇️"},{suffix:"-swipe-left",name:"Swipe Left",icon:"⬅️"},{suffix:"-swipe-right",name:"Swipe Right",icon:"➡️"}];let f=0;for(const u of p){const k=i.touch+"/touch-"+t+u.suffix+".sh";await h(k)&&f++}let l=`
    <div class="card-header card-header-purple">
      <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">${t}</span>
      <span>Touch Zone ${t}</span>
      <span class="badge ${f>0?"badge-success":"badge-warning"} ml-auto">${f}/6</span>
    </div>
    <div class="space-y-4">
  `;if(l+='<div class="flex items-start gap-4">',e){const u=await window.api.readImageBase64(e);u.success&&(l+=`<img src="${u.data}" class="w-24 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-700 object-cover">`)}else l+=`<div class="w-24 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 text-sm">
      Zone ${t}
    </div>`;l+='<div class="flex-1 space-y-1">',c&&(l+=`<div class="text-gray-700 dark:text-gray-300 font-medium">Label: "${c}"</div>`),l+="</div></div>",l+=`
    <div class="flex flex-wrap gap-2">
      <button class="btn-primary text-sm" onclick="browseImage(${t}, 'touch')">
        <span>🖼</span> Browse Image
      </button>
      <button class="btn-purple text-sm" onclick="selectIcon(${t}, 'touch')">
        <span>🎨</span> Icons
      </button>
      ${e?`
        <button class="btn-danger text-sm" onclick="removeImage(${t}, 'touch')">
          <span>🗑</span> Remove
        </button>
      `:""}
    </div>
  `,l+=`
    <div>
      <span class="label">Label & Style</span>
      <div class="flex flex-wrap gap-2 mt-1 items-center">
        <input type="text" id="touch-${t}-label" class="input flex-1" 
               value="${c||""}" placeholder="Enter label...">
        <select id="touch-${t}-position" class="input w-28">
          <option value="top" ${d==="top"?"selected":""}>Top</option>
          <option value="middle" ${d==="middle"?"selected":""}>Middle</option>
          <option value="bottom" ${d==="bottom"?"selected":""}>Bottom</option>
        </select>
        <input type="number" id="touch-${t}-fontsize" class="input w-16 text-center" 
               value="${m}" min="10" max="60">
        <button class="btn-success text-sm" onclick="setLabel(${t}, 'touch')">
          <span>✓</span> Save
        </button>
      </div>
    </div>
  `,l+='<div class="divider"></div>',l+='<div class="space-y-1">';for(const u of p){const k=i.touch+"/touch-"+t+u.suffix+".sh",F=await h(k);l+=`
      <div class="action-row">
        <div class="action-label">
          <span class="text-lg">${u.icon}</span>
          ${u.name}
        </div>
        <div class="action-status ${F?"action-status-configured":""}">
          ${F?await $(k):"Not configured"}
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary text-xs px-2 py-1" onclick="browseTouchScript(${t}, '${u.suffix}')">Browse</button>
          <button class="btn-success text-xs px-2 py-1" onclick="browseTouchExamples(${t}, '${u.suffix}')">Examples</button>
          <button class="btn-purple text-xs px-2 py-1" onclick="recordTouchAction(${t}, '${u.suffix}')">Record</button>
          ${F?`
            <button class="btn-warning text-xs px-2 py-1" onclick="editScript('${k}')">Edit</button>
            <button class="btn-danger text-xs px-2 py-1" onclick="removeTouchScript(${t}, '${u.suffix}')">Remove</button>
          `:""}
        </div>
      </div>
    `}return l+="</div></div>",s.innerHTML=l,s}async function J(){const t=document.createElement("div");t.className="card animate-fade-in";let s=`
    <div class="card-header card-header-rose">
      <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">↔️</span>
      <span>Long Swipes</span>
      <span class="text-sm font-normal ml-2 opacity-80">Across 2+ zones</span>
    </div>
    <div class="space-y-1">
  `;for(const e of["left","right"]){const n=i.touch+"/longswipe-"+e+".sh",a=await h(n),o=e==="left"?"⬅️":"➡️",c=e.charAt(0).toUpperCase()+e.slice(1);s+=`
      <div class="action-row">
        <div class="action-label">
          <span class="text-lg">${o}</span>
          Long Swipe ${c}
        </div>
        <div class="action-status ${a?"action-status-configured":""}">
          ${a?await $(n):"Not configured"}
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary text-xs px-2 py-1" onclick="browseLongSwipeScript('${e}')">Browse</button>
          <button class="btn-success text-xs px-2 py-1" onclick="browseLongSwipeExamples('${e}')">Examples</button>
          <button class="btn-purple text-xs px-2 py-1" onclick="recordLongSwipeAction('${e}')">Record</button>
          ${a?`
            <button class="btn-warning text-xs px-2 py-1" onclick="editScript('${n}')">Edit</button>
            <button class="btn-danger text-xs px-2 py-1" onclick="removeLongSwipeScript('${e}')">Remove</button>
          `:""}
        </div>
      </div>
    `}return s+="</div>",t.innerHTML=s,t}window.browseScript=async t=>{const s=await window.api.browseFile({title:"Select Script File",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!s.canceled&&s.filePaths.length>0){const e=i.buttons+"/button-"+t+".sh";await window.api.copyFile(s.filePaths[0],e),await window.api.makeExecutable(e),r("Script assigned to Button "+t,"success"),await g()}};window.removeScript=async t=>{const s=i.buttons+"/button-"+t+".sh";await x(s),r("Script removed from Button "+t,"success"),await g()};window.browseImage=async(t,s)=>{const e=await window.api.browseFile({title:"Select Image File",filters:[{name:"Images",extensions:["png","jpg","jpeg","svg"]}]});if(!e.canceled&&e.filePaths.length>0){const n=s==="button"?i.buttons:i.touch,a=s==="button"?"button-"+t:"touch-"+t,o=e.filePaths[0].split(".").pop(),c=n+"/"+a+"."+o;await window.api.copyFile(e.filePaths[0],c),r("Image set","success"),s==="button"?await g():await w()}};window.removeImage=async(t,s)=>{const e=s==="button"?i.buttons:i.touch,n=s==="button"?"button-"+t:"touch-"+t;for(const a of[".png",".jpg",".jpeg",".svg"]){const o=e+"/"+n+a;await h(o)&&await x(o)}r("Image removed","success"),s==="button"?await g():await w()};window.setLabel=async(t,s)=>{const e=s==="button"?"button":"touch",n=s==="button"?i.buttons:i.touch,a=document.getElementById(e+"-"+t+"-label").value,o=n+"/"+e+"-"+t+".txt",c=n+"/"+e+"-"+t+"-position.txt",d=n+"/"+e+"-"+t+"-fontsize.txt";a.trim()?await b(o,a.trim()):await x(o);const m=document.getElementById(e+"-"+t+"-position").value;await b(c,m);const p=document.getElementById(e+"-"+t+"-fontsize").value;await b(d,p),r("Settings saved","success")};window.selectIcon=(t,s)=>{C={num:t,type:s},Y()};window.editScript=async t=>{await window.api.execCommand('xdg-open "'+t+'"'),r("Opening script in editor","info")};window.browseDialScript=async(t,s)=>{const e=await window.api.browseFile({title:"Select Script File",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!e.canceled&&e.filePaths.length>0){const n=i.dials+"/dial-"+t+"-"+s+".sh";await window.api.copyFile(e.filePaths[0],n),await window.api.makeExecutable(n),r("Script assigned","success"),await v()}};window.removeDialScript=async(t,s)=>{const e=i.dials+"/dial-"+t+"-"+s+".sh";await x(e),r("Script removed","success"),await v()};window.browseTouchScript=async(t,s)=>{const e=await window.api.browseFile({title:"Select Script File",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!e.canceled&&e.filePaths.length>0){const n=i.touch+"/touch-"+t+s+".sh";await window.api.copyFile(e.filePaths[0],n),await window.api.makeExecutable(n),r("Script assigned","success"),await w()}};window.removeTouchScript=async(t,s)=>{const e=i.touch+"/touch-"+t+s+".sh";await x(e),r("Script removed","success"),await w()};window.browseLongSwipeScript=async t=>{const s=await window.api.browseFile({title:"Select Script File",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!s.canceled&&s.filePaths.length>0){const e=i.touch+"/longswipe-"+t+".sh";await window.api.copyFile(s.filePaths[0],e),await window.api.makeExecutable(e),r("Script assigned","success"),await w()}};window.removeLongSwipeScript=async t=>{const s=i.touch+"/longswipe-"+t+".sh";await x(s),r("Script removed","success"),await w()};window.browseExamples=async(t,s)=>{const e=await window.api.browseFile({title:"Select Example Script",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!e.canceled&&e.filePaths.length>0){const n=i.buttons+"/button-"+t+".sh";await window.api.copyFile(e.filePaths[0],n),await window.api.makeExecutable(n),r("Example script assigned","success"),await g()}};window.browseDialExamples=async(t,s)=>{const e=await window.api.browseFile({title:"Select Example Script",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!e.canceled&&e.filePaths.length>0){const n=i.dials+"/dial-"+t+"-"+s+".sh";await window.api.copyFile(e.filePaths[0],n),await window.api.makeExecutable(n),r("Example script assigned","success"),await v()}};window.browseTouchExamples=async(t,s)=>{const e=await window.api.browseFile({title:"Select Example Script",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!e.canceled&&e.filePaths.length>0){const n=i.touch+"/touch-"+t+s+".sh";await window.api.copyFile(e.filePaths[0],n),await window.api.makeExecutable(n),r("Example script assigned","success"),await w()}};window.browseLongSwipeExamples=async t=>{const s=await window.api.browseFile({title:"Select Example Script",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!s.canceled&&s.filePaths.length>0){const e=i.touch+"/longswipe-"+t+".sh";await window.api.copyFile(s.filePaths[0],e),await window.api.makeExecutable(e),r("Example script assigned","success"),await w()}};window.recordAction=async(t,s)=>{const e=L("Button "+t);document.body.appendChild(e);const n=await P(e);if(n.length>0){const a=I(n),o=i.buttons+"/button-"+t+".sh";await b(o,a),await window.api.makeExecutable(o),r("Recorded "+n.length+" actions","success"),await g()}document.body.removeChild(e)};window.recordDialAction=async(t,s)=>{const e={cw:"Clockwise",ccw:"Counter-Clockwise",press:"Press",longpress:"Long Press"},n=L("Dial "+t+" - "+e[s]);document.body.appendChild(n);const a=await P(n);if(a.length>0){const o=I(a),c=i.dials+"/dial-"+t+"-"+s+".sh";await b(c,o),await window.api.makeExecutable(c),r("Recorded "+a.length+" actions","success"),await v()}document.body.removeChild(n)};window.recordTouchAction=async(t,s)=>{const e={"":"Tap","-longpress":"Long Press","-swipe-up":"Swipe Up","-swipe-down":"Swipe Down","-swipe-left":"Swipe Left","-swipe-right":"Swipe Right"},n=L("Touch Zone "+t+" - "+e[s]);document.body.appendChild(n);const a=await P(n);if(a.length>0){const o=I(a),c=i.touch+"/touch-"+t+s+".sh";await b(c,o),await window.api.makeExecutable(c),r("Recorded "+a.length+" actions","success"),await w()}document.body.removeChild(n)};window.recordLongSwipeAction=async t=>{const s=L("Long Swipe "+t.charAt(0).toUpperCase()+t.slice(1));document.body.appendChild(s);const e=await P(s);if(e.length>0){const n=I(e),a=i.touch+"/longswipe-"+t+".sh";await b(a,n),await window.api.makeExecutable(a),r("Recorded "+e.length+" actions","success"),await w()}document.body.removeChild(s)};function L(t){const s=document.createElement("div");return s.className="modal-backdrop",s.innerHTML=`
    <div class="modal-content w-2/3 max-w-2xl">
      <div class="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg px-6 py-4 flex items-center gap-3">
        <span class="text-2xl">⌨️</span>
        <span>Record Action - ${t}</span>
      </div>
      <div class="p-6">
        <p class="text-gray-700 dark:text-gray-300 mb-4">Press keyboard keys or click mouse buttons. Click "Stop & Save" when done.</p>
        <div class="bg-gray-100 dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl p-4 min-h-32 max-h-64 overflow-auto font-mono text-sm">
          <div id="recorded-events" class="text-gray-500 dark:text-gray-400">Waiting for input...</div>
        </div>
      </div>
      <div class="flex gap-3 justify-end px-6 pb-6">
        <button id="record-cancel" class="btn-danger">Cancel</button>
        <button id="record-save" class="btn-success">Stop & Save</button>
      </div>
    </div>
  `,s}function P(t){return new Promise(s=>{const e=[],n=t.querySelector("#recorded-events"),a=c=>{c.preventDefault(),c.stopPropagation();const d=c.key,m=c.code,p=[];c.ctrlKey&&p.push("ctrl"),c.shiftKey&&p.push("shift"),c.altKey&&p.push("alt"),c.metaKey&&p.push("super");const f={type:"key",key:d,code:m,modifiers:p};e.push(f);const l=p.length>0?p.join("+")+"+":"",u=d===" "?"Space":d;n.innerHTML+=`<div class="text-blue-600 dark:text-blue-400">Key: ${l}${u}</div>`,n.scrollTop=n.scrollHeight},o=c=>{if(c.target.closest("#record-cancel")||c.target.closest("#record-save"))return;c.preventDefault();const d=c.button===0?"left":c.button===1?"middle":"right";e.push({type:"mouse",button:d}),n.innerHTML+=`<div class="text-green-600 dark:text-green-400">Mouse: ${d} click</div>`,n.scrollTop=n.scrollHeight};document.addEventListener("keydown",a),document.addEventListener("mousedown",o),t.querySelector("#record-save").onclick=()=>{document.removeEventListener("keydown",a),document.removeEventListener("mousedown",o),s(e)},t.querySelector("#record-cancel").onclick=()=>{document.removeEventListener("keydown",a),document.removeEventListener("mousedown",o),s([])}})}function Q(t,s){const e={" ":"space",Enter:"Return",Escape:"Escape",Tab:"Tab",Backspace:"BackSpace",Delete:"Delete",Insert:"Insert",Home:"Home",End:"End",PageUp:"Page_Up",PageDown:"Page_Down",ArrowUp:"Up",ArrowDown:"Down",ArrowLeft:"Left",ArrowRight:"Right",PrintScreen:"Print",ScrollLock:"Scroll_Lock",Pause:"Pause",CapsLock:"Caps_Lock",NumLock:"Num_Lock",ContextMenu:"Menu",F1:"F1",F2:"F2",F3:"F3",F4:"F4",F5:"F5",F6:"F6",F7:"F7",F8:"F8",F9:"F9",F10:"F10",F11:"F11",F12:"F12"};return e[t]?e[t]:t.length===1?t.toLowerCase():t}function I(t){let s=`#!/bin/bash

`;for(const e of t)if(e.type==="key"){const n=Q(e.key,e.code),a=e.modifiers.join("+"),o=a?a+"+"+n:n;s+=`xdotool key "${o}"
`}else if(e.type==="mouse"){const n=e.button==="left"?1:e.button==="middle"?2:3;s+=`xdotool click ${n}
`}return s}function V(){document.getElementById("close-icon-modal").addEventListener("click",K),document.getElementById("icon-category").addEventListener("change",B),document.getElementById("icon-color").addEventListener("change",B),document.getElementById("icon-search").addEventListener("input",j)}async function Y(){const t=document.getElementById("icon-modal");t.classList.remove("hidden"),t.classList.add("flex"),await B()}function K(){const t=document.getElementById("icon-modal");t.classList.add("hidden"),t.classList.remove("flex")}async function B(){const t=document.getElementById("icon-category").value,s=document.getElementById("icon-color").value,e=i.icons+"/"+t+"/"+s,n=await window.api.listDirectory(e);if(n.success)T=n.files.filter(a=>a.endsWith(".png")),j();else{T=[];const a=document.getElementById("icon-grid");a.innerHTML=`
      <div class="col-span-6 empty-state">
        <div class="empty-state-icon">📭</div>
        <div>No icons found in this category/color</div>
        <div class="text-sm mt-2">Try a different combination</div>
      </div>
    `}}function j(){const t=document.getElementById("icon-search").value.toLowerCase(),s=T.filter(a=>a.toLowerCase().includes(t)),e=document.getElementById("icon-grid");e.innerHTML="";const n=Math.min(s.length,48);for(let a=0;a<n;a++){const o=s[a],c=document.getElementById("icon-category").value,d=document.getElementById("icon-color").value,m=i.icons+"/"+c+"/"+d+"/"+o,p=document.createElement("div");p.className="icon-item group relative",p.title=o.replace(".png",""),p.onclick=()=>N(m),window.api.readImageBase64(m).then(f=>{if(f.success){const l=document.createElement("img");l.src=f.data,l.className="w-10 h-10",p.appendChild(l)}}),e.appendChild(p)}if(n===0)e.innerHTML=`
      <div class="col-span-6 empty-state">
        <div class="empty-state-icon">🔍</div>
        <div>No matching icons</div>
      </div>
    `;else if(s.length>48){const a=document.createElement("div");a.className="col-span-6 text-center text-sm text-gray-500 dark:text-gray-400 py-4",a.textContent=`Showing first 48 of ${s.length} icons. Refine your search to see more.`,e.appendChild(a)}}async function N(t){if(!C)return;const{num:s,type:e}=C,n=e==="button"?i.buttons:i.touch,a=e==="button"?"button-"+s:"touch-"+s,o=n+"/"+a+".png";await window.api.copyFile(t,o),r("Icon applied","success"),K(),e==="button"?await g():await w()}
