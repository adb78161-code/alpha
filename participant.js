(() => {
  const $ = id => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const session = params.get('session');
  const token = params.get('token');
  let peer=null, conn=null, stream=null, mediaCall=null, watchId=null, heartbeat=null, ended=false;
  let locationRequested=false, lastPosition=null;

  // Local device storage: captures and location metadata are retained on Device B.
  const DB_NAME='threatwatch-device-b';
  const DB_VERSION=1;
  let localDb=null;
  function openLocalDb(){return new Promise((resolve,reject)=>{if(!('indexedDB' in window)){resolve(null);return}const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('captures'))db.createObjectStore('captures',{keyPath:'id',autoIncrement:true});if(!db.objectStoreNames.contains('locations'))db.createObjectStore('locations',{keyPath:'id',autoIncrement:true});};req.onsuccess=()=>{localDb=req.result;resolve(localDb)};req.onerror=()=>resolve(null)})}
  function localSave(store,value){if(!localDb)return;try{localDb.transaction(store,'readwrite').objectStore(store).add(value)}catch{}}
  openLocalDb();

  const setStatus=(text,on=false)=>{const el=$('sessionStatus');el.textContent=text;el.className='status'+(on?' on':'')};
  const setMessage=t=>$('message').textContent=t;
  const enableUI=ok=>{ $('selfieBtn').disabled=!ok; $('proBtn').disabled=!ok; $('filterBtn').disabled=!ok; };

  if(!session||!token){setStatus('INVALID');setMessage('Invalid session.');enableUI(false);return;}
  setMessage('Connecting…');

  if(typeof Peer==='undefined'){setStatus('ERROR');setMessage('Connection service unavailable.');enableUI(false);return;}
  peer=new Peer(undefined,{debug:1});

  peer.on('open',()=>{
    conn=peer.connect(session,{reliable:true,metadata:{role:'participant',token}});
    conn.on('open',()=>{
      setStatus('CONNECTED',true);setMessage('Ready.');enableUI(true);
      try{conn.send({type:'hello',token,ua:navigator.userAgent})}catch{}
      heartbeat=setInterval(()=>{if(conn?.open)try{conn.send({type:'heartbeat'})}catch{}},5000);
    });
    conn.on('data',data=>{
      if(!data)return;
      if(data.type==='ping'&&conn?.open)try{conn.send({type:'pong',t:data.t})}catch{}
      if(data.type==='command'){
        if(data.command==='stop-camera')stopCamera();
        if(data.command==='stop-location')stopLocation();
        if(data.command==='session-ended')leave('Session ended by console.');
      }
    });
    conn.on('close',()=>{clearInterval(heartbeat);if(!ended){setStatus('OFFLINE');setMessage('Session disconnected.');enableUI(false)}});
  });
  peer.on('error',()=>{setStatus('ERROR');setMessage('Unable to connect.');enableUI(false)});

  async function enableCamera(){
    if(!conn?.open)return;
    try{
      if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera unavailable');
      stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'},width:{ideal:1280},height:{ideal:720}},audio:false});
      $('localVideo').srcObject=stream;$('preview').classList.add('show');$('selfieBtn').classList.add('active');
      mediaCall=peer.call(session,stream,{metadata:{consent:'camera-enabled'}});
      mediaCall.on('error',()=>{});
      conn.send({type:'camera',enabled:true});setMessage('Selfie camera is active.');
    }catch(e){setMessage('Camera permission was not granted.');}
  }

  function stopCamera(){
    if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;try{mediaCall?.close()}catch{}mediaCall=null;
    $('localVideo').srcObject=null;$('preview').classList.remove('show');$('selfieBtn').classList.remove('active');
    try{conn?.send({type:'camera',enabled:false})}catch{}
  }

  function sendLocation(pos){
    const c=pos.coords;
    lastPosition={lat:c.latitude,lon:c.longitude,accuracy:c.accuracy,timestamp:Date.now()};
    localSave('locations',{...lastPosition,savedAt:Date.now()});
    try{conn?.send({type:'location',...lastPosition})}catch{}
    return lastPosition;
  }

  function enableLocation(){
    if(!conn?.open||watchId!==null||locationRequested)return;
    locationRequested=true;
    if(!navigator.geolocation){setMessage('Location is unavailable in this browser.');locationRequested=false;return;}
    watchId=navigator.geolocation.watchPosition(pos=>{
      sendLocation(pos);
      $('proBtn').classList.add('active');setMessage('Pro location is active.');
    },()=>{setMessage('Location permission was not granted.');watchId=null;locationRequested=false},{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
  }

  function getLocationForFilter(){
    return new Promise((resolve,reject)=>{
      if(lastPosition){resolve(lastPosition);return;}
      if(!navigator.geolocation){reject(new Error('Location unavailable'));return;}
      setMessage('Allow location to add it to the Filter watermark.');
      navigator.geolocation.getCurrentPosition(pos=>{
        const loc=sendLocation(pos);
        resolve(loc);
      },reject,{enableHighAccuracy:true,maximumAge:5000,timeout:15000});
    });
  }

  function stopLocation(){
    if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;locationRequested=false;$('proBtn').classList.remove('active');
    try{conn?.send({type:'location-off'})}catch{}
  }

  async function captureFiltered(){
    if(!stream||!conn?.open){setMessage('Tap Selfie first.');return;}
    try{
      const loc=await getLocationForFilter();
      const video=$('localVideo'), track=stream.getVideoTracks()[0], s=track.getSettings();
      const maxW=1024,w=Math.min(s.width||1280,maxW),h=Math.round(w*((s.height||720)/(s.width||1280)));
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');
      ctx.filter='brightness(1.04) contrast(1.06) saturate(1.12)';ctx.drawImage(video,0,0,w,h);

      // Burn the participant-approved location into the captured image.
      const stamp=new Date(loc.timestamp||Date.now());
      const lines=[
        `Location ${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}`,
        `±${Math.round(loc.accuracy)} m  •  ${stamp.toLocaleString()}`,
        'THREATWATCH • FILTER'
      ];
      const pad=Math.max(12,Math.round(w*.018));
      const font=Math.max(13,Math.round(w*.017));
      const lineH=Math.round(font*1.45);
      const boxH=pad*2+lineH*lines.length;
      const boxY=h-boxH-pad;
      ctx.filter='none';ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(pad,boxY,w-pad*2,boxH);
      ctx.fillStyle='#fff';ctx.font=`600 ${font}px system-ui,-apple-system,Segoe UI,sans-serif`;
      lines.forEach((line,i)=>ctx.fillText(line,pad*1.6,boxY+pad+font+i*lineH));

      const data=canvas.toDataURL('image/jpeg',.86);
      localSave('captures',{data,filter:'location-watermark',location:loc,savedAt:Date.now()});
      try{conn.send({type:'photo',data,filter:'location-watermark',location:loc})}catch{return}
      setMessage('Filtered selfie captured with location watermark.');
      $('filterBtn').classList.add('active');setTimeout(()=>$('filterBtn').classList.remove('active'),900);
    }catch{
      setMessage('Location permission is required to add the watermark.');
    }
  }

  // The Pro button is the only visible way to request location. A normal web page
  // cannot silently bypass the browser permission prompt.
  $('selfieBtn').onclick=()=>stream?stopCamera():enableCamera();
  $('proBtn').onclick=()=>watchId===null?enableLocation():stopLocation();
  $('filterBtn').onclick=captureFiltered;
  $('closePreview').onclick=stopCamera;
  $('disconnectBtn').onclick=()=>leave('You left the session.');

  function leave(msg){ended=true;stopCamera();stopLocation();clearInterval(heartbeat);try{conn?.close();peer?.destroy()}catch{}setStatus('OFFLINE');setMessage(msg);enableUI(false)}
})();
