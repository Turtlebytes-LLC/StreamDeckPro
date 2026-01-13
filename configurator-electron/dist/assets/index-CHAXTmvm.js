(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const o of a)if(o.type==="childList")for(const c of o.addedNodes)c.tagName==="LINK"&&c.rel==="modulepreload"&&n(c)}).observe(document,{childList:!0,subtree:!0});function s(a){const o={};return a.integrity&&(o.integrity=a.integrity),a.referrerPolicy&&(o.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?o.credentials="include":a.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function n(a){if(a.ep)return;a.ep=!0;const o=s(a);fetch(a.href,o)}})();let i={},T=null,B=[],E=!1,u=null;async function X(){const t=i.streamdeck+"/.device-info.json",e=await window.api.readFile(t);if(e.success)try{u=JSON.parse(e.content),J()}catch{u=null}}function M(){var t;return((t=u==null?void 0:u.profile)==null?void 0:t.buttons)||8}function H(){var t;return((t=u==null?void 0:u.profile)==null?void 0:t.dials)||4}function A(){var t,e;return((e=(t=u==null?void 0:u.profile)==null?void 0:t.touchscreen)==null?void 0:e.zones)||4}function K(){return H()>0}function j(){var t;return((t=u==null?void 0:u.profile)==null?void 0:t.touchscreen)!=null}function J(){const t=(u==null?void 0:u.device_type)||"Stream Deck Plus";document.getElementById("status-text").textContent=`Connected: ${t}`;const e=document.querySelector('[data-tab="dials"]'),s=document.querySelector('[data-tab="touchscreen"]');e&&(e.style.display=K()?"":"none"),s&&(s.style.display=j()?"":"none")}document.addEventListener("DOMContentLoaded",async()=>{i=await window.api.getDirectories(),await X(),G(),Q(),V(),Y(),it(),await g(),K()&&await v(),j()&&await m();const t=(u==null?void 0:u.device_type)||"Stream Deck";r(`Ready to configure your ${t}`,"success")});function G(){E=localStorage.getItem("darkMode")==="true",R(),document.getElementById("theme-toggle").addEventListener("click",()=>{E=!E,localStorage.setItem("darkMode",E),R()})}function R(){const t=document.getElementById("theme-icon");E?(document.documentElement.classList.add("dark"),document.body.classList.add("dark"),t.textContent="☀️"):(document.documentElement.classList.remove("dark"),document.body.classList.remove("dark"),t.textContent="🌙")}function Q(){document.querySelectorAll(".tab").forEach(t=>{t.addEventListener("click",()=>$(t.dataset.tab))})}function $(t){document.querySelectorAll(".tab").forEach(e=>{e.dataset.tab===t?(e.classList.remove("tab-inactive"),e.classList.add("tab-active")):(e.classList.remove("tab-active"),e.classList.add("tab-inactive"))}),document.querySelectorAll(".tab-content").forEach(e=>{e.classList.add("hidden")}),document.getElementById(t+"-tab").classList.remove("hidden")}function V(){document.addEventListener("keydown",t=>{(t.ctrlKey&&t.key==="w"||t.ctrlKey&&t.key==="q"||t.key==="Escape")&&(t.preventDefault(),window.close()),t.ctrlKey&&t.key==="1"&&$("buttons"),t.ctrlKey&&t.key==="2"&&$("dials"),t.ctrlKey&&t.key==="3"&&$("touchscreen"),t.ctrlKey&&t.key==="e"&&(t.preventDefault(),O()),t.ctrlKey&&t.key==="i"&&(t.preventDefault(),U()),t.ctrlKey&&t.key==="d"&&(t.preventDefault(),document.getElementById("theme-toggle").click()),t.ctrlKey&&t.key==="r"&&(t.preventDefault(),z())})}function Y(){document.getElementById("refresh-btn").addEventListener("click",z),document.getElementById("export-btn").addEventListener("click",O),document.getElementById("import-btn").addEventListener("click",U),document.getElementById("autostart-btn").addEventListener("click",N),q()}async function z(){r("Refreshing...","info"),await Promise.all([g(),v(),m()]),r("Refreshed","success")}async function q(){const t=await window.api.checkAutostart(),e=document.getElementById("autostart-btn");t.success&&t.enabled?(e.innerHTML="<span>✓</span> Auto-start ON",e.classList.add("bg-green-500/20")):(e.innerHTML="<span>⚙️</span> Auto-start",e.classList.remove("bg-green-500/20"))}async function N(){const t=await window.api.checkAutostart(),e=!(t.success&&t.enabled);await window.api.toggleAutostart(e),await q(),r(e?"Auto-start enabled":"Auto-start disabled","success")}async function O(){const t=await window.api.browseSaveFile({title:"Export Configuration",defaultPath:"streamdeck-config.tar.gz",filters:[{name:"Tar Archive",extensions:["tar.gz"]}]});if(!t.canceled&&t.filePath){const e=`tar -czf "${t.filePath}" -C "${i.streamdeck}" buttons dials touchscreen`,s=await window.api.execCommand(e);s.success?r("Configuration exported successfully","success"):r("Export failed: "+s.error,"error")}}async function U(){const t=await window.api.browseFile({title:"Import Configuration",filters:[{name:"Tar Archive",extensions:["tar.gz"]}]});if(!t.canceled&&t.filePaths.length>0){const e=`tar -xzf "${t.filePaths[0]}" -C "${i.streamdeck}"`,s=await window.api.execCommand(e);s.success?(r("Configuration imported - reloading...","success"),await Promise.all([g(),v(),m()]),await window.api.restartDaemon()):r("Import failed: "+s.error,"error")}}function r(t,e="info"){const s=document.getElementById("toast-container"),n=document.createElement("div"),a={success:"✓",error:"✕",warning:"⚠",info:"ℹ"},o={success:"bg-deck-success",error:"bg-deck-danger",warning:"bg-deck-warning",info:"bg-deck-primary"};n.className=`toast ${o[e]}`,n.innerHTML=`
    <span class="text-xl">${a[e]}</span>
    <span class="flex-1">${t}</span>
    <button class="btn-icon hover:bg-white/20 text-white" onclick="this.parentElement.remove()">×</button>
  `,s.appendChild(n),setTimeout(()=>{n.style.opacity="0",n.style.transform="translateX(100px)",setTimeout(()=>n.remove(),300)},4e3),tt(t,e)}function tt(t,e="info"){const s=document.getElementById("status-text"),n=document.getElementById("status-indicator");s.textContent=t,s.className="",e==="success"?(s.classList.add("text-deck-success"),n.className="config-indicator config-indicator-active"):e==="error"?(s.classList.add("text-deck-danger"),n.className="config-indicator bg-deck-danger"):e==="warning"?(s.classList.add("text-deck-warning"),n.className="config-indicator bg-deck-warning"):(s.classList.add("text-gray-600","dark:text-gray-400"),n.className="config-indicator config-indicator-active")}async function y(t){return await window.api.fileExists(t)}async function x(t){const e=await window.api.readFile(t);return e.success?e.content:null}async function h(t,e){return await window.api.writeFile(t,e)}async function k(t){return await window.api.deleteFile(t)}async function _(t,e){for(const s of[".png",".jpg",".jpeg",".svg"]){const n=t+"/"+e+s;if(await y(n))return n}return null}async function L(t){const e=await x(t);if(!e)return"Script configured";const s=e.split(`
`);for(const a of s)if(a.startsWith("# Description:"))return a.replace("# Description:","").trim();const n=s.find(a=>a.trim()&&!a.startsWith("#"));return n?n.substring(0,40)+(n.length>40?"...":""):"Script configured"}async function g(){const t=document.getElementById("buttons-container"),e=t.scrollTop;t.innerHTML="";const s=M();for(let n=1;n<=s;n++){const a=await et(n);t.appendChild(a)}t.scrollTop=e,document.getElementById("apply-button-fontsize").onclick=async()=>{const n=document.getElementById("button-fontsize-all").value,a=M();for(let o=1;o<=a;o++)await h(i.buttons+"/button-"+o+"-fontsize.txt",n);r(`Font size ${n} applied to all buttons`,"success"),await g()}}async function et(t){const e=document.createElement("div");e.className="card animate-fade-in";const s=i.buttons+"/button-"+t+".sh",n=await _(i.buttons,"button-"+t),a=i.buttons+"/button-"+t+".txt",o=i.buttons+"/button-"+t+"-position.txt",c=i.buttons+"/button-"+t+"-fontsize.txt",d=await y(s),f=await x(a),p=await x(o)||"bottom",b=await x(c)||"24";let l=`
    <div class="card-header card-header-blue">
      <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">${t}</span>
      <span>Button ${t}</span>
      ${d?'<span class="badge badge-success ml-auto">Configured</span>':'<span class="badge badge-warning ml-auto">Empty</span>'}
    </div>
    <div class="space-y-4">
  `;if(l+='<div class="flex items-start gap-4">',n){const w=await window.api.readImageBase64(n);w.success&&(l+=`<img src="${w.data}" class="image-preview w-16 h-16">`)}else l+=`<div class="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400">
      <span class="text-2xl">🖼</span>
    </div>`;if(l+='<div class="flex-1 space-y-1">',d){const w=await L(s);l+=`<div class="text-deck-success font-medium flex items-center gap-2">
      <span class="config-indicator config-indicator-active"></span>
      ${w}
    </div>`}else l+=`<div class="text-gray-500 dark:text-gray-400 flex items-center gap-2">
      <span class="config-indicator config-indicator-inactive"></span>
      No script assigned
    </div>`;return f&&(l+=`<div class="text-gray-600 dark:text-gray-400 text-sm">Label: "${f}"</div>`),l+="</div></div>",l+='<div class="divider"></div>',l+=`
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
            <button class="btn-warning text-sm" onclick="editScript('${s}')">
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
                 value="${f||""}" placeholder="Enter label...">
          <select id="button-${t}-position" class="input w-28">
            <option value="top" ${p==="top"?"selected":""}>Top</option>
            <option value="middle" ${p==="middle"?"selected":""}>Middle</option>
            <option value="bottom" ${p==="bottom"?"selected":""}>Bottom</option>
          </select>
          <input type="number" id="button-${t}-fontsize" class="input w-16 text-center" 
                 value="${b}" min="10" max="60">
          <button class="btn-success text-sm" onclick="setLabel(${t}, 'button')">
            <span>✓</span> Save
          </button>
        </div>
      </div>
    </div>
  `,l+="</div>",e.innerHTML=l,e}async function v(){const t=document.getElementById("dials-container"),e=t.scrollTop;t.innerHTML="";const s=H();for(let n=1;n<=s;n++){const a=await st(n);t.appendChild(a)}t.scrollTop=e}async function st(t){const e=document.createElement("div");e.className="card animate-fade-in";const s=[{key:"cw",name:"Clockwise",icon:"↻",color:"text-blue-500"},{key:"ccw",name:"Counter-Clockwise",icon:"↺",color:"text-green-500"},{key:"press",name:"Press",icon:"⬇",color:"text-amber-500"},{key:"longpress",name:"Long Press",icon:"⏱",color:"text-red-500"}];let n=0;for(const o of s){const c=i.dials+"/dial-"+t+"-"+o.key+".sh";await y(c)&&n++}let a=`
    <div class="card-header card-header-amber">
      <span class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-bold">${t}</span>
      <span>Dial ${t}</span>
      <span class="badge ${n>0?"badge-success":"badge-warning"} ml-auto">${n}/4</span>
    </div>
    <div class="space-y-1">
  `;for(const o of s){const c=i.dials+"/dial-"+t+"-"+o.key+".sh",d=await y(c);a+=`
      <div class="action-row">
        <div class="action-label">
          <span class="${o.color} text-lg">${o.icon}</span>
          ${o.name}
        </div>
        <div class="action-status ${d?"action-status-configured":""}">
          ${d?await L(c):"Not configured"}
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
    `}return a+="</div>",e.innerHTML=a,e}async function m(){const t=document.getElementById("touchscreen-container"),e=t.scrollTop;t.innerHTML="";const s=A();for(let a=1;a<=s;a++){const o=await nt(a);t.appendChild(o)}const n=await at();t.appendChild(n),t.scrollTop=e,document.getElementById("apply-touch-fontsize").onclick=async()=>{const a=document.getElementById("touch-fontsize-all").value,o=A();for(let c=1;c<=o;c++)await h(i.touch+"/touch-"+c+"-fontsize.txt",a);r(`Font size ${a} applied to all zones`,"success"),await m()}}async function nt(t){const e=document.createElement("div");e.className="card animate-fade-in";const s=await _(i.touch,"touch-"+t),n=i.touch+"/touch-"+t+".txt",a=i.touch+"/touch-"+t+"-position.txt",o=i.touch+"/touch-"+t+"-fontsize.txt",c=await x(n),d=await x(a)||"middle",f=await x(o)||"28",p=[{suffix:"",name:"Tap",icon:"👆"},{suffix:"-longpress",name:"Long Press",icon:"⏱"},{suffix:"-swipe-up",name:"Swipe Up",icon:"⬆️"},{suffix:"-swipe-down",name:"Swipe Down",icon:"⬇️"},{suffix:"-swipe-left",name:"Swipe Left",icon:"⬅️"},{suffix:"-swipe-right",name:"Swipe Right",icon:"➡️"}];let b=0;for(const w of p){const S=i.touch+"/touch-"+t+w.suffix+".sh";await y(S)&&b++}let l=`
    <div class="card-header card-header-purple">
      <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-bold">${t}</span>
      <span>Touch Zone ${t}</span>
      <span class="badge ${b>0?"badge-success":"badge-warning"} ml-auto">${b}/6</span>
    </div>
    <div class="space-y-4">
  `;if(l+='<div class="flex items-start gap-4">',s){const w=await window.api.readImageBase64(s);w.success&&(l+=`<img src="${w.data}" class="w-24 h-12 rounded-lg border-2 border-gray-200 dark:border-gray-700 object-cover">`)}else l+=`<div class="w-24 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 text-sm">
      Zone ${t}
    </div>`;l+='<div class="flex-1 space-y-1">',c&&(l+=`<div class="text-gray-700 dark:text-gray-300 font-medium">Label: "${c}"</div>`),l+="</div></div>",l+=`
    <div class="flex flex-wrap gap-2">
      <button class="btn-primary text-sm" onclick="browseImage(${t}, 'touch')">
        <span>🖼</span> Browse Image
      </button>
      <button class="btn-purple text-sm" onclick="selectIcon(${t}, 'touch')">
        <span>🎨</span> Icons
      </button>
      ${s?`
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
               value="${f}" min="10" max="60">
        <button class="btn-success text-sm" onclick="setLabel(${t}, 'touch')">
          <span>✓</span> Save
        </button>
      </div>
    </div>
  `,l+='<div class="divider"></div>',l+='<div class="space-y-1">';for(const w of p){const S=i.touch+"/touch-"+t+w.suffix+".sh",F=await y(S);l+=`
      <div class="action-row">
        <div class="action-label">
          <span class="text-lg">${w.icon}</span>
          ${w.name}
        </div>
        <div class="action-status ${F?"action-status-configured":""}">
          ${F?await L(S):"Not configured"}
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary text-xs px-2 py-1" onclick="browseTouchScript(${t}, '${w.suffix}')">Browse</button>
          <button class="btn-success text-xs px-2 py-1" onclick="browseTouchExamples(${t}, '${w.suffix}')">Examples</button>
          <button class="btn-purple text-xs px-2 py-1" onclick="recordTouchAction(${t}, '${w.suffix}')">Record</button>
          ${F?`
            <button class="btn-warning text-xs px-2 py-1" onclick="editScript('${S}')">Edit</button>
            <button class="btn-danger text-xs px-2 py-1" onclick="removeTouchScript(${t}, '${w.suffix}')">Remove</button>
          `:""}
        </div>
      </div>
    `}return l+="</div></div>",e.innerHTML=l,e}async function at(){const t=document.createElement("div");t.className="card animate-fade-in";let e=`
    <div class="card-header card-header-rose">
      <span class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">↔️</span>
      <span>Long Swipes</span>
      <span class="text-sm font-normal ml-2 opacity-80">Across 2+ zones</span>
    </div>
    <div class="space-y-1">
  `;for(const s of["left","right"]){const n=i.touch+"/longswipe-"+s+".sh",a=await y(n),o=s==="left"?"⬅️":"➡️",c=s.charAt(0).toUpperCase()+s.slice(1);e+=`
      <div class="action-row">
        <div class="action-label">
          <span class="text-lg">${o}</span>
          Long Swipe ${c}
        </div>
        <div class="action-status ${a?"action-status-configured":""}">
          ${a?await L(n):"Not configured"}
        </div>
        <div class="flex gap-1">
          <button class="btn-secondary text-xs px-2 py-1" onclick="browseLongSwipeScript('${s}')">Browse</button>
          <button class="btn-success text-xs px-2 py-1" onclick="browseLongSwipeExamples('${s}')">Examples</button>
          <button class="btn-purple text-xs px-2 py-1" onclick="recordLongSwipeAction('${s}')">Record</button>
          ${a?`
            <button class="btn-warning text-xs px-2 py-1" onclick="editScript('${n}')">Edit</button>
            <button class="btn-danger text-xs px-2 py-1" onclick="removeLongSwipeScript('${s}')">Remove</button>
          `:""}
        </div>
      </div>
    `}return e+="</div>",t.innerHTML=e,t}window.browseScript=async t=>{const e=await window.api.browseFile({title:"Select Script File",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!e.canceled&&e.filePaths.length>0){const s=i.buttons+"/button-"+t+".sh";await window.api.copyFile(e.filePaths[0],s),await window.api.makeExecutable(s),r("Script assigned to Button "+t,"success"),await g()}};window.removeScript=async t=>{const e=i.buttons+"/button-"+t+".sh";await k(e),r("Script removed from Button "+t,"success"),await g()};window.browseImage=async(t,e)=>{const s=await window.api.browseFile({title:"Select Image File",filters:[{name:"Images",extensions:["png","jpg","jpeg","svg"]}]});if(!s.canceled&&s.filePaths.length>0){const n=e==="button"?i.buttons:i.touch,a=e==="button"?"button-"+t:"touch-"+t,o=s.filePaths[0].split(".").pop(),c=n+"/"+a+"."+o;await window.api.copyFile(s.filePaths[0],c),r("Image set","success"),e==="button"?await g():await m()}};window.removeImage=async(t,e)=>{const s=e==="button"?i.buttons:i.touch,n=e==="button"?"button-"+t:"touch-"+t;for(const a of[".png",".jpg",".jpeg",".svg"]){const o=s+"/"+n+a;await y(o)&&await k(o)}r("Image removed","success"),e==="button"?await g():await m()};window.setLabel=async(t,e)=>{const s=e==="button"?"button":"touch",n=e==="button"?i.buttons:i.touch,a=document.getElementById(s+"-"+t+"-label").value,o=n+"/"+s+"-"+t+".txt",c=n+"/"+s+"-"+t+"-position.txt",d=n+"/"+s+"-"+t+"-fontsize.txt";a.trim()?await h(o,a.trim()):await k(o);const f=document.getElementById(s+"-"+t+"-position").value;await h(c,f);const p=document.getElementById(s+"-"+t+"-fontsize").value;await h(d,p),r("Settings saved","success")};window.selectIcon=(t,e)=>{T={num:t,type:e},ct()};window.editScript=async t=>{await window.api.execCommand('xdg-open "'+t+'"'),r("Opening script in editor","info")};window.browseDialScript=async(t,e)=>{const s=await window.api.browseFile({title:"Select Script File",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!s.canceled&&s.filePaths.length>0){const n=i.dials+"/dial-"+t+"-"+e+".sh";await window.api.copyFile(s.filePaths[0],n),await window.api.makeExecutable(n),r("Script assigned","success"),await v()}};window.removeDialScript=async(t,e)=>{const s=i.dials+"/dial-"+t+"-"+e+".sh";await k(s),r("Script removed","success"),await v()};window.browseTouchScript=async(t,e)=>{const s=await window.api.browseFile({title:"Select Script File",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!s.canceled&&s.filePaths.length>0){const n=i.touch+"/touch-"+t+e+".sh";await window.api.copyFile(s.filePaths[0],n),await window.api.makeExecutable(n),r("Script assigned","success"),await m()}};window.removeTouchScript=async(t,e)=>{const s=i.touch+"/touch-"+t+e+".sh";await k(s),r("Script removed","success"),await m()};window.browseLongSwipeScript=async t=>{const e=await window.api.browseFile({title:"Select Script File",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!e.canceled&&e.filePaths.length>0){const s=i.touch+"/longswipe-"+t+".sh";await window.api.copyFile(e.filePaths[0],s),await window.api.makeExecutable(s),r("Script assigned","success"),await m()}};window.removeLongSwipeScript=async t=>{const e=i.touch+"/longswipe-"+t+".sh";await k(e),r("Script removed","success"),await m()};window.browseExamples=async(t,e)=>{const s=await window.api.browseFile({title:"Select Example Script",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!s.canceled&&s.filePaths.length>0){const n=i.buttons+"/button-"+t+".sh";await window.api.copyFile(s.filePaths[0],n),await window.api.makeExecutable(n),r("Example script assigned","success"),await g()}};window.browseDialExamples=async(t,e)=>{const s=await window.api.browseFile({title:"Select Example Script",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!s.canceled&&s.filePaths.length>0){const n=i.dials+"/dial-"+t+"-"+e+".sh";await window.api.copyFile(s.filePaths[0],n),await window.api.makeExecutable(n),r("Example script assigned","success"),await v()}};window.browseTouchExamples=async(t,e)=>{const s=await window.api.browseFile({title:"Select Example Script",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!s.canceled&&s.filePaths.length>0){const n=i.touch+"/touch-"+t+e+".sh";await window.api.copyFile(s.filePaths[0],n),await window.api.makeExecutable(n),r("Example script assigned","success"),await m()}};window.browseLongSwipeExamples=async t=>{const e=await window.api.browseFile({title:"Select Example Script",defaultPath:i.examples,filters:[{name:"Shell Scripts",extensions:["sh"]}]});if(!e.canceled&&e.filePaths.length>0){const s=i.touch+"/longswipe-"+t+".sh";await window.api.copyFile(e.filePaths[0],s),await window.api.makeExecutable(s),r("Example script assigned","success"),await m()}};window.recordAction=async(t,e)=>{const s=P("Button "+t);document.body.appendChild(s);const n=await C(s);if(n.length>0){const a=I(n),o=i.buttons+"/button-"+t+".sh";await h(o,a),await window.api.makeExecutable(o),r("Recorded "+n.length+" actions","success"),await g()}document.body.removeChild(s)};window.recordDialAction=async(t,e)=>{const s={cw:"Clockwise",ccw:"Counter-Clockwise",press:"Press",longpress:"Long Press"},n=P("Dial "+t+" - "+s[e]);document.body.appendChild(n);const a=await C(n);if(a.length>0){const o=I(a),c=i.dials+"/dial-"+t+"-"+e+".sh";await h(c,o),await window.api.makeExecutable(c),r("Recorded "+a.length+" actions","success"),await v()}document.body.removeChild(n)};window.recordTouchAction=async(t,e)=>{const s={"":"Tap","-longpress":"Long Press","-swipe-up":"Swipe Up","-swipe-down":"Swipe Down","-swipe-left":"Swipe Left","-swipe-right":"Swipe Right"},n=P("Touch Zone "+t+" - "+s[e]);document.body.appendChild(n);const a=await C(n);if(a.length>0){const o=I(a),c=i.touch+"/touch-"+t+e+".sh";await h(c,o),await window.api.makeExecutable(c),r("Recorded "+a.length+" actions","success"),await m()}document.body.removeChild(n)};window.recordLongSwipeAction=async t=>{const e=P("Long Swipe "+t.charAt(0).toUpperCase()+t.slice(1));document.body.appendChild(e);const s=await C(e);if(s.length>0){const n=I(s),a=i.touch+"/longswipe-"+t+".sh";await h(a,n),await window.api.makeExecutable(a),r("Recorded "+s.length+" actions","success"),await m()}document.body.removeChild(e)};function P(t){const e=document.createElement("div");return e.className="modal-backdrop",e.innerHTML=`
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
  `,e}function C(t){return new Promise(e=>{const s=[],n=t.querySelector("#recorded-events"),a=c=>{c.preventDefault(),c.stopPropagation();const d=c.key,f=c.code,p=[];c.ctrlKey&&p.push("ctrl"),c.shiftKey&&p.push("shift"),c.altKey&&p.push("alt"),c.metaKey&&p.push("super");const b={type:"key",key:d,code:f,modifiers:p};s.push(b);const l=p.length>0?p.join("+")+"+":"",w=d===" "?"Space":d;n.innerHTML+=`<div class="text-blue-600 dark:text-blue-400">Key: ${l}${w}</div>`,n.scrollTop=n.scrollHeight},o=c=>{if(c.target.closest("#record-cancel")||c.target.closest("#record-save"))return;c.preventDefault();const d=c.button===0?"left":c.button===1?"middle":"right";s.push({type:"mouse",button:d}),n.innerHTML+=`<div class="text-green-600 dark:text-green-400">Mouse: ${d} click</div>`,n.scrollTop=n.scrollHeight};document.addEventListener("keydown",a),document.addEventListener("mousedown",o),t.querySelector("#record-save").onclick=()=>{document.removeEventListener("keydown",a),document.removeEventListener("mousedown",o),e(s)},t.querySelector("#record-cancel").onclick=()=>{document.removeEventListener("keydown",a),document.removeEventListener("mousedown",o),e([])}})}function ot(t,e){const s={" ":"space",Enter:"Return",Escape:"Escape",Tab:"Tab",Backspace:"BackSpace",Delete:"Delete",Insert:"Insert",Home:"Home",End:"End",PageUp:"Page_Up",PageDown:"Page_Down",ArrowUp:"Up",ArrowDown:"Down",ArrowLeft:"Left",ArrowRight:"Right",PrintScreen:"Print",ScrollLock:"Scroll_Lock",Pause:"Pause",CapsLock:"Caps_Lock",NumLock:"Num_Lock",ContextMenu:"Menu",F1:"F1",F2:"F2",F3:"F3",F4:"F4",F5:"F5",F6:"F6",F7:"F7",F8:"F8",F9:"F9",F10:"F10",F11:"F11",F12:"F12"};return s[t]?s[t]:t.length===1?t.toLowerCase():t}function I(t){let e=`#!/bin/bash

`;for(const s of t)if(s.type==="key"){const n=ot(s.key,s.code),a=s.modifiers.join("+"),o=a?a+"+"+n:n;e+=`xdotool key "${o}"
`}else if(s.type==="mouse"){const n=s.button==="left"?1:s.button==="middle"?2:3;e+=`xdotool click ${n}
`}return e}function it(){document.getElementById("close-icon-modal").addEventListener("click",W),document.getElementById("icon-category").addEventListener("change",D),document.getElementById("icon-color").addEventListener("change",D),document.getElementById("icon-search").addEventListener("input",Z)}async function ct(){const t=document.getElementById("icon-modal");t.classList.remove("hidden"),t.classList.add("flex"),await D()}function W(){const t=document.getElementById("icon-modal");t.classList.add("hidden"),t.classList.remove("flex")}async function D(){const t=document.getElementById("icon-category").value,e=document.getElementById("icon-color").value,s=i.icons+"/"+t+"/"+e,n=await window.api.listDirectory(s);if(n.success)B=n.files.filter(a=>a.endsWith(".png")),Z();else{B=[];const a=document.getElementById("icon-grid");a.innerHTML=`
      <div class="col-span-6 empty-state">
        <div class="empty-state-icon">📭</div>
        <div>No icons found in this category/color</div>
        <div class="text-sm mt-2">Try a different combination</div>
      </div>
    `}}function Z(){const t=document.getElementById("icon-search").value.toLowerCase(),e=B.filter(a=>a.toLowerCase().includes(t)),s=document.getElementById("icon-grid");s.innerHTML="";const n=Math.min(e.length,48);for(let a=0;a<n;a++){const o=e[a],c=document.getElementById("icon-category").value,d=document.getElementById("icon-color").value,f=i.icons+"/"+c+"/"+d+"/"+o,p=document.createElement("div");p.className="icon-item group relative",p.title=o.replace(".png",""),p.onclick=()=>lt(f),window.api.readImageBase64(f).then(b=>{if(b.success){const l=document.createElement("img");l.src=b.data,l.className="w-10 h-10",p.appendChild(l)}}),s.appendChild(p)}if(n===0)s.innerHTML=`
      <div class="col-span-6 empty-state">
        <div class="empty-state-icon">🔍</div>
        <div>No matching icons</div>
      </div>
    `;else if(e.length>48){const a=document.createElement("div");a.className="col-span-6 text-center text-sm text-gray-500 dark:text-gray-400 py-4",a.textContent=`Showing first 48 of ${e.length} icons. Refine your search to see more.`,s.appendChild(a)}}async function lt(t){if(!T)return;const{num:e,type:s}=T,n=s==="button"?i.buttons:i.touch,a=s==="button"?"button-"+e:"touch-"+e,o=n+"/"+a+".png";await window.api.copyFile(t,o),r("Icon applied","success"),W(),s==="button"?await g():await m()}
