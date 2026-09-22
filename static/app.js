const code=document.getElementById("code"),nums=document.getElementById("lineNumbers"),marker=document.getElementById("marker"),vars=document.getElementById("variables"),stack=document.getElementById("stack"),out=document.getElementById("output"),err=document.getElementById("error"),timeline=document.getElementById("timeline"),counter=document.getElementById("counter"),label=document.getElementById("stepLabel"),status=document.getElementById("statusText");
let steps=[],current=-1,follow=true;
const LINE_HEIGHT=24.5,EDITOR_TOP=20;

function esc(v){return String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
function lineNums(){nums.innerHTML=code.value.split("\n").map((_,i)=>i+1).join("<br>")}

function linePosition(line){return EDITOR_TOP+(line-1)*LINE_HEIGHT}
function keepLineVisible(line){
  const top=linePosition(line),bottom=top+LINE_HEIGHT;
  const visibleTop=code.scrollTop+EDITOR_TOP;
  const visibleBottom=code.scrollTop+code.clientHeight-EDITOR_TOP;
  if(top<visibleTop) code.scrollTop=Math.max(0,top-EDITOR_TOP-LINE_HEIGHT*2);
  else if(bottom>visibleBottom) code.scrollTop=Math.max(0,bottom-code.clientHeight+EDITOR_TOP+LINE_HEIGHT*2);
}
function updateMarker(line){marker.style.display="block";marker.style.top=(linePosition(line)-code.scrollTop)+"px"}

function show(i){
  if(!steps.length)return;
  current=Math.max(0,Math.min(i,steps.length-1));
  const s=steps[current];
  label.textContent="STEP "+String(s.step).padStart(2,"0");
  counter.textContent=String(s.step).padStart(2,"0")+" / "+String(steps.length).padStart(2,"0");
  const entries=Object.entries(s.locals||{});
  vars.className=entries.length?"":"empty";
  vars.innerHTML=entries.length?entries.map(([k,v])=>'<div class="var"><span class="var-name">'+esc(k)+'</span><span class="var-value">'+esc(JSON.stringify(v))+'</span></div>').join(""):"No user variables at this step.";
  stack.innerHTML=(s.stack||[]).map(f=>'<div class="stack-row '+(f.name=="<module>"?"active":"")+'"><span>'+esc(f.name)+'</span><span class="stack-line">L'+f.line+'</span></div>').join("");
  out.textContent=s.output||"";
  err.classList.toggle("hidden",!s.error);
  if(s.error)err.textContent=s.error.type+": "+s.error.message;
  if(follow)keepLineVisible(s.line);
  updateMarker(s.line);
  draw();
}
function draw(){
  timeline.innerHTML="";
  steps.forEach((s,i)=>{
    const t=document.createElement("button");
    t.className="tick"+(i===current?" active":"");
    t.style.left=(steps.length===1?50:(i/(steps.length-1))*100)+"%";
    t.title="Step "+s.step+" — line "+s.line;
    t.onclick=()=>show(i);
    timeline.appendChild(t);
  });
}
async function run(){
  status.textContent="TRACING…";err.classList.add("hidden");
  try{
    const r=await fetch("/api/run",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:code.value})});
    const d=await r.json();steps=d.steps||[];current=-1;
    if(!steps.length){
      vars.textContent="No executable steps captured.";out.textContent=d.output||"";
      if(d.error){err.classList.remove("hidden");err.textContent=d.error.type+": "+d.error.message}
      status.textContent="RUN COMPLETE";draw();return;
    }
    status.textContent=d.error?"STOPPED WITH ERROR":"TRACE READY";follow=true;show(0);
  }catch(e){status.textContent="CONNECTION ERROR";err.classList.remove("hidden");err.textContent=e.message}
}
function reset(){
  steps=[];current=-1;follow=true;label.textContent="STEP 00";counter.textContent="00 / 00";
  vars.className="empty";vars.textContent="Run the program to inspect state.";stack.innerHTML="";out.textContent="";
  err.classList.add("hidden");marker.style.display="none";draw();status.textContent="LOCAL PYTHON RUNNER";
}

code.addEventListener("input",lineNums);
code.addEventListener("scroll",()=>{nums.scrollTop=code.scrollTop;if(current>=0)updateMarker(steps[current].line)});

// Lightweight editor behavior: keep indentation predictable without fighting normal typing.
code.addEventListener("keydown",e=>{
  if(e.key==="Tab"){
    e.preventDefault();
    const start=code.selectionStart,end=code.selectionEnd;
    code.setRangeText("    ",start,end,"end");
    lineNums();
    return;
  }
  if(e.key!=="Enter")return;

  const start=code.selectionStart,end=code.selectionEnd;
  if(start!==end)return;

  const before=code.value.slice(0,start);
  const currentLine=before.split("\n").pop();
  const baseIndent=(currentLine.match(/^\s*/) || [""])[0];
  const trimmed=currentLine.trimEnd();

  // Python block syntax: after ':' the new line receives one extra indentation level.
  const extra=/[:][ \t]*$/.test(trimmed) ? "    " : "";

  // If the current line is only indentation, preserve it instead of adding more.
  const nextIndent=/^\s*$/.test(trimmed) ? "" : baseIndent+extra;

  e.preventDefault();
  code.setRangeText("\n"+nextIndent,start,end,"end");
  lineNums();
});

document.getElementById("run").onclick=run;
document.getElementById("prev").onclick=()=>show(current-1);
document.getElementById("next").onclick=()=>show(current+1);
document.getElementById("reset").onclick=reset;
document.addEventListener("keydown",e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==="Enter")run();
  if(e.key==="ArrowRight"&&e.altKey)show(current+1);
  if(e.key==="ArrowLeft"&&e.altKey)show(current-1);
});
lineNums();
