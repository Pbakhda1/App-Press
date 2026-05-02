const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const preview = document.getElementById("preview");

const startCameraBtn = document.getElementById("startCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");
const takeSelfieBtn = document.getElementById("takeSelfieBtn");
const pressBtn = document.getElementById("pressBtn");

const phoneNumber = document.getElementById("phoneNumber");
const messageText = document.getElementById("messageText");
const moodSelect = document.getElementById("moodSelect");

const holdTime = document.getElementById("holdTime");
const moodName = document.getElementById("moodName");
const torchStatus = document.getElementById("torchStatus");
const cameraStatus = document.getElementById("cameraStatus");

const shareBtn = document.getElementById("shareBtn");
const downloadBtn = document.getElementById("downloadBtn");
const smsBtn = document.getElementById("smsBtn");

let stream = null;
let track = null;
let mode = "front";
let pressStart = 0;
let timer = null;
let capturedBlob = null;
let capturedDataUrl = null;

const moods = {
  calm: { name:"Blue Calm", bg:["#1d4ed8","#60a5fa"] },
  love: { name:"Pink Love", bg:["#be185d","#f9a8d4"] },
  happy:{ name:"Yellow Happy", bg:["#ca8a04","#fde68a"] },
  angry:{ name:"Red Intense", bg:["#991b1b","#fb7185"] },
  peace:{ name:"Green Peace", bg:["#047857","#86efac"] },
  dream:{ name:"Purple Dream", bg:["#6d28d9","#c4b5fd"] }
};

moodSelect.addEventListener("change", () => {
  moodName.textContent = moods[moodSelect.value].name;
});

function stopCurrentStream(){
  if(stream){
    stream.getTracks().forEach(t => t.stop());
  }
  stream = null;
  track = null;
}

async function startFrontCamera(){
  try{
    stopCurrentStream();
    mode = "front";

    stream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:{ ideal:"user" }, width:{ ideal:1280 }, height:{ ideal:720 } },
      audio:false
    });

    track = stream.getVideoTracks()[0];
    video.srcObject = stream;

    video.classList.remove("hidden");
    preview.classList.add("hidden");

    torchStatus.textContent = "Rear only";
    cameraStatus.innerHTML = "<strong>Status:</strong> Front camera ready. Tap Take Selfie First.";
  }catch(err){
    cameraStatus.innerHTML = "<strong>Status:</strong> Front camera blocked/unavailable.";
    console.error(err);
  }
}

async function startRearFlashlight(){
  try{
    stopCurrentStream();
    mode = "rear";

    stream = await navigator.mediaDevices.getUserMedia({
      video:{ facingMode:{ ideal:"environment" }, width:{ ideal:640 }, height:{ ideal:480 } },
      audio:false
    });

    track = stream.getVideoTracks()[0];
    video.srcObject = stream;

    const caps = track.getCapabilities ? track.getCapabilities() : {};

    if(caps.torch){
      await track.applyConstraints({ advanced:[{ torch:true }] });
      torchStatus.textContent = "On";
      cameraStatus.innerHTML = "<strong>Status:</strong> Flashlight on while holding.";
    }else{
      torchStatus.textContent = "Not supported";
      cameraStatus.innerHTML = "<strong>Status:</strong> Flashlight not supported on this phone/browser.";
    }
  }catch(err){
    torchStatus.textContent = "Unavailable";
    cameraStatus.innerHTML = "<strong>Status:</strong> Rear flashlight unavailable.";
    console.error(err);
  }
}

async function turnFlashlightOff(){
  try{
    if(track && mode === "rear"){
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      if(caps.torch){
        await track.applyConstraints({ advanced:[{ torch:false }] });
      }
    }
  }catch(err){
    console.error(err);
  }

  torchStatus.textContent = "Off";
  stopCurrentStream();
}

function stopCamera(){
  stopCurrentStream();
  torchStatus.textContent = "Off";
  cameraStatus.innerHTML = "<strong>Status:</strong> Camera stopped.";
}

function takeSelfie(){
  if(!stream || mode !== "front"){
    cameraStatus.innerHTML = "<strong>Status:</strong> Start front camera first.";
    return;
  }

  captureMoodPhoto();
  cameraStatus.innerHTML = "<strong>Status:</strong> Selfie saved. Now hold Flashlight Glow.";
}

function captureMoodPhoto(){
  const mood = moods[moodSelect.value];

  const w = video.videoWidth || 640;
  const h = video.videoHeight || 480;

  canvas.width = w;
  canvas.height = h;

  const ctx = canvas.getContext("2d");

  const grad = ctx.createLinearGradient(0,0,w,h);
  grad.addColorStop(0,mood.bg[0]);
  grad.addColorStop(1,mood.bg[1]);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,w,h);

  const padding = Math.round(w * 0.06);

  ctx.save();
  roundRect(ctx, padding, padding, w - padding * 2, h - padding * 2, 32);
  ctx.clip();

  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, padding, padding, w - padding * 2, h - padding * 2);

  ctx.restore();

  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.fillRect(0, h - 90, w, 90);

  ctx.fillStyle = "white";
  ctx.font = `${Math.floor(w * 0.045)}px Arial`;
  ctx.fillText(messageText.value || "Thinking of you ❤️", 28, h - 52);

  ctx.font = `${Math.floor(w * 0.032)}px Arial`;
  ctx.fillText(`Mood: ${mood.name}`, 28, h - 24);

  capturedDataUrl = canvas.toDataURL("image/png");

  canvas.toBlob(blob => {
    capturedBlob = blob;
    shareBtn.disabled = false;
    downloadBtn.disabled = false;
    smsBtn.disabled = false;
  }, "image/png");

  preview.src = capturedDataUrl;
  preview.classList.remove("hidden");
}

function roundRect(ctx, x, y, w, h, r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);
  ctx.closePath();
}

async function startPress(){
  pressStart = Date.now();

  timer = setInterval(() => {
    const seconds = (Date.now() - pressStart) / 1000;
    holdTime.textContent = seconds.toFixed(1) + "s";
  }, 100);

  pressBtn.textContent = "Release to Turn Off";
  await startRearFlashlight();
}

async function endPress(){
  if(!pressStart) return;

  clearInterval(timer);
  timer = null;

  await turnFlashlightOff();

  pressBtn.textContent = "Hold Flashlight Glow";
  pressStart = 0;

  cameraStatus.innerHTML = "<strong>Status:</strong> Flashlight glow ended.";
}

async function sharePhoto(){
  if(!capturedBlob) return;

  const file = new File([capturedBlob], "app-press-mood.png", { type:"image/png" });

  if(navigator.canShare && navigator.canShare({ files:[file] })){
    await navigator.share({
      title:"App-Press Mood",
      text:messageText.value || "Thinking of you ❤️",
      files:[file]
    });
  }else{
    cameraStatus.innerHTML = "<strong>Status:</strong> Share not supported. Download photo instead.";
  }
}

function downloadPhoto(){
  if(!capturedDataUrl) return;
  const a = document.createElement("a");
  a.href = capturedDataUrl;
  a.download = "app-press-mood.png";
  a.click();
}

function openSmsDraft(){
  const num = phoneNumber.value.trim();

  const msg = encodeURIComponent(
    (messageText.value || "Thinking of you ❤️") +
    "\n\nI sent you an App-Press mood glow. Open App-Press and hold your Flashlight Glow button to glow back."
  );

  if(!num){
    cameraStatus.innerHTML = "<strong>Status:</strong> Add a phone number first.";
    return;
  }

  window.location.href = `sms:${num}?&body=${msg}`;
}

startCameraBtn.addEventListener("click", startFrontCamera);
stopCameraBtn.addEventListener("click", stopCamera);
takeSelfieBtn.addEventListener("click", takeSelfie);

pressBtn.addEventListener("mousedown", startPress);
pressBtn.addEventListener("mouseup", endPress);
pressBtn.addEventListener("mouseleave", endPress);

pressBtn.addEventListener("touchstart", e => {
  e.preventDefault();
  startPress();
}, { passive:false });

pressBtn.addEventListener("touchend", e => {
  e.preventDefault();
  endPress();
}, { passive:false });

shareBtn.addEventListener("click", sharePhoto);
downloadBtn.addEventListener("click", downloadPhoto);
smsBtn.addEventListener("click", openSmsDraft);

window.addEventListener("beforeunload", stopCamera);