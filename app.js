const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const preview = document.getElementById("preview");

const startCameraBtn = document.getElementById("startCameraBtn");
const stopCameraBtn = document.getElementById("stopCameraBtn");
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
let videoTrack = null;
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

async function startCamera(){
  try{
    stopCamera();

    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    });

    video.srcObject = stream;
    videoTrack = stream.getVideoTracks()[0];

    video.classList.remove("hidden");
    preview.classList.add("hidden");

    cameraStatus.innerHTML = "<strong>Status:</strong> Rear camera started. Hold the button to turn flashlight on.";
    await checkTorch();
  }catch(err){
    cameraStatus.innerHTML = "<strong>Status:</strong> Camera blocked/unavailable. Use Android Chrome or try Live Server.";
    torchStatus.textContent = "Unavailable";
    console.error(err);
  }
}

function stopCamera(){
  if(stream){
    stream.getTracks().forEach(t => t.stop());
  }
  stream = null;
  videoTrack = null;
  torchStatus.textContent = "Off";
}

async function checkTorch(){
  try{
    const caps = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
    if(caps.torch){
      torchStatus.textContent = "Supported";
      return true;
    }else{
      torchStatus.textContent = "Not supported";
      return false;
    }
  }catch{
    torchStatus.textContent = "Not supported";
    return false;
  }
}

async function setTorch(on){
  try{
    if(!videoTrack) return;

    const caps = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
    if(!caps.torch){
      torchStatus.textContent = "Not supported";
      cameraStatus.innerHTML = "<strong>Status:</strong> Flashlight not supported on this device/browser.";
      return;
    }

    await videoTrack.applyConstraints({
      advanced: [{ torch: on }]
    });

    torchStatus.textContent = on ? "On" : "Off";
  }catch(err){
    torchStatus.textContent = "Blocked";
    cameraStatus.innerHTML = "<strong>Status:</strong> Flashlight blocked. Try Android Chrome with rear camera.";
    console.error(err);
  }
}

function startPress(){
  if(!stream){
    cameraStatus.innerHTML = "<strong>Status:</strong> Start camera first.";
    return;
  }

  pressStart = Date.now();
  setTorch(true);

  timer = setInterval(() => {
    const seconds = (Date.now() - pressStart) / 1000;
    holdTime.textContent = seconds.toFixed(1) + "s";
  }, 100);

  pressBtn.textContent = "Release to Capture";
}

async function endPress(){
  if(!stream || !pressStart) return;

  clearInterval(timer);
  timer = null;

  await setTorch(false);
  pressBtn.textContent = "Hold to Send Feeling";

  captureMoodPhoto();
  pressStart = 0;
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
  roundRect(ctx, padding, padding, w - padding*2, h - padding*2, 32);
  ctx.clip();
  ctx.drawImage(video, padding, padding, w - padding*2, h - padding*2);
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
  video.classList.add("hidden");

  cameraStatus.innerHTML = "<strong>Status:</strong> Mood photo captured. Flashlight turned off.";
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

async function sharePhoto(){
  if(!capturedBlob) return;

  const file = new File([capturedBlob], "app-press-mood.png", { type:"image/png" });

  if(navigator.canShare && navigator.canShare({ files:[file] })){
    await navigator.share({
      title: "App-Press Mood",
      text: messageText.value || "Thinking of you ❤️",
      files: [file]
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
  const msg = encodeURIComponent(messageText.value || "Thinking of you ❤️");

  if(!num){
    cameraStatus.innerHTML = "<strong>Status:</strong> Add a phone number first.";
    return;
  }

  window.location.href = `sms:${num}?&body=${msg}`;
}

startCameraBtn.addEventListener("click", startCamera);
stopCameraBtn.addEventListener("click", stopCamera);

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