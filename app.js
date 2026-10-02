(() => {
  const $ = id => document.getElementById(id);
  const SESSION_MINUTES = 10;
  let peer=null, conn=null, mediaCall=null, sessionId=null, pairingToken=null, participantId=null;
  let expiryTimer=null, reconnectTimer=null, ended=false, photoCount=0, pingTimer=null, pingAt=0;

  const toast = msg => { const t=$("toast"); if(!t)return; t.textContent=msg; t.classList.add("show"); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove("show"),2200); };
  const log = msg => { const el=$("log"); if(!el)return; el.textContent += `[${new Date().toLocaleTimeString()}] ${msg}\n`; el.scrollTop=el.scrollHeight; };
  $("clearLog").onclick=()=>$("log").textContent="";
  window.addEventListener("error",e=>{try{log(`JavaScript error: ${e.message||"unknown"}`)}catch{}});
  window.addEventListener("unhandledrejection",e=>{try{log(`Unhandled error: ${e.reason?.message||String(e.reason)}`)}catch{}});

  const basePath=()=>location.pathname.endsWith("/")?location.pathname:location.pathname.slice(0,location.pathname.lastIndexOf("/")+1);
  const randomToken=()=>{const a=new Uint8Array(18);crypto.getRandomValues(a);return [...a].map(x=>x.toString(16).padStart(2,"0")).join("")};
  const participantUrl=()=>location.origin+basePath()+"participant.html?session="+encodeURIComponent(sessionId)+"&token="+encodeURIComponent(pairingToken);
  const setBadge=(text,state="neutral")=>{const b=$("onlineBadge");b.textContent=text;b.className=`statusBadge ${state}`};
  const setPill=(id,text,on)=>{const e=$(id);e.textContent=text;e.className=`tinyStatus ${on?"on":"off"}`};
  const check=(id,on)=>$(id).classList.toggle("ok",!!on);

  function browserInfo(ua){let browser="Unknown";if(/Edg\//.test(ua))browser="Edge";else if(/Chrome\//.test(ua))browser="Chrome";else if(/Firefox\//.test(ua))browser="Firefox";else if(/Safari\//.test(ua)&&!/Chrome\//.test(ua))browser="Safari";const platform=/Android/i.test(ua)?"Android":/iPhone|iPad|iPod/i.test(ua)?"iOS":/Windows/i.test(ua)?"Windows":/Mac/i.test(ua)?"macOS":"Other";return{browser,platform}}

  function renderQR(url){
    const box=$("qrcode");box.innerHTML="";
    try{if(typeof QRCode!=="undefined"){new QRCode(box,{text:url,width:270,height:270,correctLevel:QRCode.CorrectLevel.H});$("qrState").textContent="READY";log("QR generated locally.");return}}catch(e){log("Local QR renderer failed: "+e.message)}
    const img=document.createElement("img");img.alt="THREATWATCH pairing QR";img.width=270;img.height=270;img.referrerPolicy="no-referrer";img.src="https://api.qrserver.com/v1/create-qr-code/?size=270x270&margin=8&data="+encodeURIComponent(url);img.onload=()=>{$("qrState").textContent="READY";log("QR generated with fallback service.")};img.onerror=()=>{box.innerHTML='<div class="qrLoading"><b>QR unavailable</b><small>Use Copy link below. The session is still valid.</small></div>';$('qrState').textContent="LINK READY";log("QR fallback failed.")};box.appendChild(img);
  }

  function resetUI(){
    ["deviceStatus","participantState"].forEach(id=>$(id).textContent=id==="deviceStatus"?"WAITING":"WAITING");
    $("deviceSub").textContent="No participant connected";$("participantPeer").textContent="No device";$("pairedAt").textContent="Not paired";$("participantPlatform").textContent="—";$("participantBrowser").textContent="—";
    $("connectionQuality").textContent="—";$("latencyText").textContent="Waiting for participant";setPill("cameraPill","OFF",false);setPill("locationPill","OFF",false);setPill("participantState","WAITING",false);
    $("stopCameraBtn").disabled=true;$("stopLocationBtn").disabled=true;$("remoteVideo").srcObject=null;$("videoEmpty").style.display="grid";$("liveTag").hidden=true;$("cameraInfo").textContent="Waiting for participant consent";$("locationInfo").textContent="Waiting for location permission";
    $("lat").textContent=$("lon").textContent=$("acc").textContent="—";$("map").textContent="Location appears after participant consent.";check("checkConnection",false);check("checkCamera",false);check("checkLocation",false);
  }
  function destroyPeer(){try{peer?.destroy()}catch{}peer=null;conn=null;mediaCall=null}

  function startExpiry(){const deadline=Date.now()+SESSION_MINUTES*60000;clearInterval(expiryTimer);expiryTimer=setInterval(()=>{const left=Math.max(0,deadline-Date.now());const sec=Math.ceil(left/1000);$("expiryText").textContent=`${Math.floor(sec/60)}:${String(sec%60).padStart(2,"0")}`;if(!left){clearInterval(expiryTimer);endSession("Session expired after 10 minutes.")}},500)}

  function startPing(){clearInterval(pingTimer);pingTimer=setInterval(()=>{if(conn?.open){pingAt=Date.now();try{conn.send({type:"ping",t:pingAt})}catch{}}},5000)}

  function wireConnection(c){
    c.on("open",()=>{log("Participant data channel opened.");startPing()});
    c.on("data",data=>{
      if(!data||typeof data!=="object")return;
      if(data.type==="hello"){
        if(data.token!==pairingToken){log("Rejected participant with invalid pairing token.");try{c.send({type:"command",command:"session-ended"});c.close()}catch{}return}
        const info=browserInfo(data.ua||"");$("deviceStatus").textContent="CONNECTED";$("deviceSub").textContent="Participant paired";setPill("participantState","CONNECTED",true);$("participantPeer").textContent=participantId;$("participantPlatform").textContent=info.platform;$("participantBrowser").textContent=info.browser;$("pairedAt").textContent=new Date().toLocaleTimeString();$("connectionQuality").textContent="GOOD";$("latencyText").textContent="Data channel active";$("sessionState").textContent="Participant connected";$("sessionMetric").textContent="ACTIVE";$("sessionSub").textContent="Participant connected";setBadge("CONNECTED","good");check("checkConnection",true);log("Participant paired: "+participantId);toast("Participant connected")
      }
      if(data.type==="pong"){const ms=Date.now()-Number(data.t||Date.now());$("connectionQuality").textContent=ms<120?"EXCELLENT":ms<300?"GOOD":"FAIR";$("latencyText").textContent=`${ms} ms round trip`}
      if(data.type==="heartbeat"){$("latencyText").textContent=`Heartbeat ${new Date().toLocaleTimeString()}`}
      if(data.type==="camera"){setPill("cameraPill",data.enabled?"ON":"OFF",!!data.enabled);$("stopCameraBtn").disabled=!data.enabled;$("cameraInfo").textContent=data.enabled?"Participant is sharing camera":"Camera sharing stopped";check("checkCamera",data.enabled)}
      if(data.type==="location"){setPill("locationPill","ON",true);$("stopLocationBtn").disabled=false;$("lat").textContent=Number(data.lat).toFixed(6);$("lon").textContent=Number(data.lon).toFixed(6);$("acc").textContent=Math.round(data.accuracy)+" m";$("locationInfo").textContent=`Updated ${new Date().toLocaleTimeString()}`;$("map").innerHTML=`<a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${data.lat}&mlon=${data.lon}#map=17/${data.lat}/${data.lon}">Open participant location in OpenStreetMap ↗</a>`;check("checkLocation",true)}
      if(data.type==="location-off"){setPill("locationPill","OFF",false);$("stopLocationBtn").disabled=true;$("locationInfo").textContent="Participant stopped location updates";check("checkLocation",false);log("Participant stopped location updates.")}
      if(data.type==="photo"){addPhoto(data.data);log("Photo received after participant capture.");toast("New photo received")}
    });
    c.on("close",()=>{clearInterval(pingTimer);$("deviceStatus").textContent="WAITING";$("deviceSub").textContent="Participant disconnected";setPill("participantState","DISCONNECTED",false);$("connectionQuality").textContent="—";$("latencyText").textContent="Waiting for participant";$("stopCameraBtn").disabled=true;$("stopLocationBtn").disabled=true;$("sessionState").textContent="Ready to pair again";$("sessionMetric").textContent="READY";$("sessionSub").textContent="Waiting for participant";setBadge("ONLINE","good");log("Participant disconnected.")});
    c.on("error",e=>log("Data channel error: "+e.message));
  }

  let viewerScale=1;
  function openPhotoViewer(src){if(!src)return;const modal=$("photoViewer"),img=$("viewerImage"),stage=$("viewerStage");viewerScale=1;img.src=src;$("openOriginal").href=src;$("zoomLevel").textContent="100%";img.style.transform="scale(1)";modal.classList.add("show");modal.setAttribute("aria-hidden","false");document.body.classList.add("viewerOpen");requestAnimationFrame(()=>{stage.scrollLeft=Math.max(0,(stage.scrollWidth-stage.clientWidth)/2);stage.scrollTop=Math.max(0,(stage.scrollHeight-stage.clientHeight)/2)})}
  function closePhotoViewer(){const modal=$("photoViewer");modal.classList.remove("show");modal.setAttribute("aria-hidden","true");document.body.classList.remove("viewerOpen")}
  function setViewerScale(v){viewerScale=Math.max(.5,Math.min(4,v));$("viewerImage").style.transform=`scale(${viewerScale})`;$("zoomLevel").textContent=Math.round(viewerScale*100)+"%"}
  function addPhoto(src){if(!src)return;if(photoCount===0)$("photos").innerHTML="";photoCount++;$("photoCount").textContent=photoCount;const img=document.createElement("img");img.src=src;img.alt="Participant captured photo";img.loading="lazy";img.title="Open photo";img.onclick=()=>openPhotoViewer(src);$("photos").prepend(img)}

  function startSession(){
    ended=false;clearTimeout(reconnectTimer);clearInterval(pingTimer);clearInterval(expiryTimer);destroyPeer();resetUI();photoCount=0;$("photoCount").textContent="0";$("photos").innerHTML='<div class="emptyGallery"><div>▧</div><b>No photos received</b><small>Photos appear only when the participant captures and sends one.</small></div>';
    pairingToken=randomToken();sessionId=pairingToken.slice(0,16);$("sessionId").textContent=sessionId;$("sessionMetric").textContent="READY";$("sessionSub").textContent="Temporary token";$("pairCode").textContent=pairingToken.slice(0,8).toUpperCase();$("joinUrl").textContent=participantUrl();$("copyBtn").disabled=false;$("shareBtn").disabled=false;$("endBtn").disabled=false;$("sessionState").textContent="Starting secure connection…";$("expiryText").textContent="10:00";$("qrState").textContent="STARTING";renderQR(participantUrl());setBadge("STARTING");startExpiry();
    if(typeof Peer==="undefined"){$("sessionState").textContent="PeerJS unavailable";setBadge("ERROR","bad");log("PeerJS library unavailable. Pairing cannot start.");return}
    try{peer=new Peer(sessionId,{debug:1})}catch(e){$("sessionState").textContent="Could not start connection";setBadge("ERROR","bad");log("Peer startup error: "+e.message);return}
    peer.on("open",id=>{$("sessionState").textContent="Ready to pair";setBadge("ONLINE","good");log("Signaling ready: "+id)});
    peer.on("connection",c=>{if(ended){c.close();return}if(conn&&conn.open){c.close();log("Rejected second participant.");return}conn=c;participantId=c.peer;wireConnection(c)});
    peer.on("call",call=>{mediaCall=call;call.answer();call.on("stream",stream=>{$("remoteVideo").srcObject=stream;$("videoEmpty").style.display="none";$("liveTag").hidden=false;setPill("cameraPill","ON",true);$("stopCameraBtn").disabled=false;$("cameraInfo").textContent="Live stream received";check("checkCamera",true);log("Camera stream received.")});call.on("close",()=>{$("remoteVideo").srcObject=null;$("videoEmpty").style.display="grid";$("liveTag").hidden=true;setPill("cameraPill","OFF",false);$("stopCameraBtn").disabled=true;$("cameraInfo").textContent="Camera stream stopped";check("checkCamera",false);log("Camera stream stopped.")});call.on("error",e=>log("Camera call error: "+e.message))});
    peer.on("disconnected",()=>{if(ended)return;setBadge("RECONNECTING");$("sessionState").textContent="Signaling disconnected; reconnecting…";log("Signaling disconnected.");clearTimeout(reconnectTimer);reconnectTimer=setTimeout(()=>{try{peer.reconnect();log("Reconnect requested.")}catch(e){log("Reconnect failed: "+e.message)}},1500)});
    peer.on("error",e=>{if(ended)return;setBadge("ERROR","bad");$("sessionState").textContent="Connection error: "+e.type;log("Peer error: "+e.type+(e.message?" — "+e.message:""))});
  }

  function endSession(reason="Session ended by console."){if(ended)return;ended=true;clearInterval(expiryTimer);clearInterval(pingTimer);clearTimeout(reconnectTimer);try{conn?.send({type:"command",command:"session-ended"})}catch{}try{conn?.close()}catch{}try{mediaCall?.close()}catch{}destroyPeer();$("endBtn").disabled=true;$("shareBtn").disabled=true;$("copyBtn").disabled=true;$("sessionMetric").textContent="ENDED";$("sessionSub").textContent="Token invalidated";$("sessionState").textContent=reason;$("expiryText").textContent="ENDED";$("qrState").textContent="ENDED";setBadge("OFFLINE");log(reason)}

  $("closeViewer").onclick=closePhotoViewer;$("photoViewer").querySelector("[data-close-viewer]").onclick=closePhotoViewer;$("zoomIn").onclick=()=>setViewerScale(viewerScale+.25);$("zoomOut").onclick=()=>setViewerScale(viewerScale-.25);$("zoomFit").onclick=()=>setViewerScale(1);document.addEventListener("keydown",e=>{if(e.key==="Escape")closePhotoViewer();if(e.key==="+")setViewerScale(viewerScale+.25);if(e.key==="-")setViewerScale(viewerScale-.25)});
  $("copyBtn").onclick=async()=>{try{await navigator.clipboard.writeText($("joinUrl").textContent);toast("Participant link copied");log("Participant link copied.")}catch{toast("Copy unavailable");log("Clipboard unavailable.")}};
  $("shareBtn").onclick=async()=>{const url=$("joinUrl").textContent;if(navigator.share){try{await navigator.share({title:"THREATWATCH pairing",text:"Authorized participant link",url});log("Participant link shared.")}catch{}}else $("copyBtn").click()};
  $("newBtn").onclick=()=>startSession();$("endBtn").onclick=()=>{if(confirm("End this session and invalidate its pairing token?"))endSession()};
  $("stopCameraBtn").onclick=()=>{if(conn?.open)conn.send({type:"command",command:"stop-camera"});try{mediaCall?.close()}catch{}setPill("cameraPill","OFF",false);$("stopCameraBtn").disabled=true;check("checkCamera",false);log("Camera stop requested.")};
  $("stopLocationBtn").onclick=()=>{if(conn?.open)conn.send({type:"command",command:"stop-location"});setPill("locationPill","OFF",false);$("stopLocationBtn").disabled=true;check("checkLocation",false);log("Location stop requested.")};
  startSession();
})();
