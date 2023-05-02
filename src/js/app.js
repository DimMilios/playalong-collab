"use strict";

//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

// Get the value of the 'f' parameter from the URL
const urlParams = new URLSearchParams(window.location.search);
const fileParam = urlParams.get("f");
const userParam = urlParams.get("u");
const courseParam = urlParams.get("course");
const collabParam = urlParams.get("collab");

var firstWaveform = true;
var gumStream; //stream from getUserMedia()
var rec; //Recorder.js object
var input; //MediaStreamAudioSourceNode we'll be recording
const constraints = {
  audio: { echoCancellation: false },
};
var delayedStart = 2000;
var count = 1;
var speedMatrix = [];
var speedMatrixRatio = [];
var speed = 100;
var speed01 = 1;
window.speed01 = 1;
window.tempo = 90;
speedMatrix[0] = 1;

// Jitsi room parameters
var Jitsi_Room_Name = "test-room";
var Jitsi_User_Name = "test-user";
if (userParam) {
  Jitsi_User_Name = userParam;
}
var Jitsi_Course_Name = "test-room";
if (courseParam) {
  Jitsi_Course_Name = courseParam;
}
var roomNameInput = document.querySelector("#meet-room");
roomNameInput.value = Jitsi_Course_Name;
var Collab = false;
if (!!collabParam && courseParam !== null) {
  Collab = true;
}

var recordedBlobs = []; // Array to hold all the recorded blobs
var selectedBlobs = []; // Array to hold all blobs to be mixed
var recordedBuffers = []; // Array to hold all PCM audio recordings
var selectedBuffers = []; // Array to hold all PCM audio recordings to be mixed
var noRecordings = 0; // Holds how many are the audio recordings
var sampleRate; // this will hold the sample rate used for recordings

// var audio = new Audio('audio/metronome.wav');
// Set the tempo (in beats per minute)
var tempo = 120;

// Calculate the interval between beats (in milliseconds)
var interval = 60000 / tempo;

// shim for AudioContext when it's not avb.
//var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext; //audio context to help us record
var recordButton = document.getElementById("recordButton");
var stopButton = document.getElementById("stopButton");
var pauseButton = document.getElementById("pauseButton");
var playPauseAllButton = document.getElementById("playpauseallButton");
var playAllButton = document.getElementById("playallButton");
var pauseAllButton = document.getElementById("pauseallButton");
var stopAllButton = document.getElementById("stopallButton");
var combineSelectedButton = document.getElementById("combineselectedButton");

var playPauseButton0 = document.getElementById("playPauseButton0");
var playButton0 = document.getElementById("playButton0");
var pauseButton0 = document.getElementById("pauseButton0");
var muteButton0 = document.getElementById("muteButton0");
var stopButton0 = document.getElementById("stopButton0");
var waveform0Container = document.getElementById("waveform0");
var timeline0Container = document.getElementById("timeline0");
var controls0Container = document.getElementById("controls0");
controls0Container.removeAttribute("hidden");

waveform0Container.setAttribute("hidden", "true");
timeline0Container.setAttribute("hidden", "true");
//controls0Container.setAttribute("hidden","true");

playPauseButton0.innerHTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
playPauseButton0.className = "wavesurfer-button btn btn-lg";
playPauseButton0.setAttribute("title", "Play");
playPauseButton0.setAttribute("hidden", "true");
muteButton0.innerHTML =
  '<svg fill="#000000" width="45" height="45" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
muteButton0.className = "wavesurfer-button btn btn-lg";
muteButton0.title = "Mute";
muteButton0.setAttribute("hidden", "true");
stopButton0.innerHTML =
  '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="black" class="bi bi-skip-start-fill" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z" /></svg>';
stopButton0.className = "wavesurfer-button btn btn-lg";
stopButton0.title = "Stop";
stopButton0.setAttribute("hidden", "true");
playButton0.setAttribute("hidden", "true");
pauseButton0.setAttribute("hidden", "true");

//add events to some buttons
recordButton.addEventListener("click", startRecording);
stopButton.addEventListener("click", stopRecording);
pauseButton.addEventListener("click", pauseRecording);
playPauseAllButton.addEventListener("click", playpauseAll);
stopAllButton.addEventListener("click", stopAll);
combineSelectedButton.addEventListener("click", combineSelected);
//playAllButton.addEventListener("click", playAll);
//pauseAllButton.addEventListener("click", pauseAll);

// function to adjust playback speed for backing track and all recordings
function setPlaybackSpeed(s) {
  //let i = speedMatrix.length;
  //console.log("speedMatrix holds",i,"values");
  speed = s;
  speed01 = s / 100;
  window.speed01 = speed01;
  var t = window.tempo;
  //console.log("tempo =", t * speed01);
  parent.metronome.setTempo(t);
  //console.log("speed=", speed);
  //console.log("speed01=", speed01);
  var playButtons = document.querySelectorAll(".play-button");
  //console.log("recordings count:", playButtons.length);
  for (var i = 0; i < playButtons.length; i++) {
    //console.log("recording speed", i + 1, "was", playButtons[i].speed);
    //console.log("desired speed", i + 1, " is", speed / 100);
    playButtons[i].set_speed = speed01 / playButtons[i].speed;
    //console.log("multiply by", playButtons[i].set_speed, "to achieve this");
    //var finalspeed = playButtons[i].set_speed*playButtons[i].speed;
    //console.log("speed",i+1,"=",finalspeed);
  }
}

const speedValueElem = document.getElementById("speedValue");
const speedSliderElem = document.getElementById("speedSlider");

function setSpeed(s) {
  setPlaybackSpeed(s);
  speedValueElem.innerHTML = s + " %";
  window.playerConfig.set("playbackSpeed", s);
}

function setSpeedRemote(s) {
  setPlaybackSpeed(s);
  speedValueElem.innerHTML = s + " %";
  speedSliderElem.value = +s;
  speedValueElem.animate(speedValueKeyFrames, speedValueTiming);
}

const speedValueKeyFrames = [
  { opacity: 1, transform: "translateY(-10px)", offset: 0 },
  { opacity: 0.2, transform: "translateY(5px)", offset: 0.5 },
  { opacity: 1, transform: "translateY(0px)", offset: 1 },
];
const speedValueTiming = { duration: 600, iterations: 1, easing: "ease-out" };
speedSliderElem?.addEventListener("change", () => {
  speedValueElem.animate(speedValueKeyFrames, speedValueTiming);
});

// recording section ///////////////////////////////////////////////////////
function startRecording() {
  //console.log("recordButton clicked");
  stopAllButton.setAttribute("hidden", "true");
  playPauseAllButton.setAttribute("hidden", "true");
  var playButtons = document.querySelectorAll(".play-button");
  var playPauseButtons = document.querySelectorAll(".play-pause-button");
  //console.log("click all play buttons")
  //console.log("playButtons.length = ",playButtons.length);

  //if (muteButton0.getAttribute("title") === "Mute") {
  //countdown ();
  //}

  if (wavesurfer0.getCurrentTime() === 0) {
    setTimeout(function () {
      playButton0.click();
    }, delayedStart / speed01); // set timeout for some milliseconds (delayedStart)
  } else {
    playButton0.click();
  }

  for (var i = 0; i < playButtons.length; i++) {
    //console.log(i);
    playButtons[i].click();
    //playPauseButtons[i].innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    //playPauseButtons[i].setAttribute("title","Play");
    playPauseButtons[i].setAttribute("title", "Pause");
  }

  recordButton.disabled = true;
  recordButton.setAttribute("title", "");
  recordButton.classList.add("flash");
  stopButton.disabled = false;
  stopButton.setAttribute("title", "Stop recording");
  pauseButton.disabled = false;
  pauseButton.setAttribute("title", "Pause recording");
  playPauseButton0.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';

  /*
		We're using the standard promise based getUserMedia()
		https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
	*/

  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    //console.log("getUserMedia() success, stream created, initializing Recorder.js ...");

    /*
			create an audio context after getUserMedia is called
			sampleRate might change after getUserMedia is called, like it does on macOS when recording through AirPods
			the sampleRate defaults to the one set in your OS for your playback device

		*/
    audioContext = new AudioContext();

    //update the format
    document.getElementById("formats").innerHTML =
      "Format: 1 channel pcm @ " + audioContext.sampleRate / 1000 + "kHz";

    /* assign to gumStream for later use */
    gumStream = stream;

    /* use the stream */
    input = audioContext.createMediaStreamSource(stream);

    /*
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels will double the file size
		*/
    rec = new Recorder(input, { numChannels: 1 });
    sampleRate = rec.context.sampleRate;
    //console.log("sampleRate = ",sampleRate,"Hz");
    //start the recording process

    rec.record();
    //console.log("Recording started");

    //if (start_bar < stop_bar) parent.metronome.setPlayStop(true);
    setTimeout(function () {
      parent.metronome.setPlayStop(true);
    }, delayedStart / speed01);
  });
  //}).catch(function(err) {
  //enable the record button if getUserMedia() fails
  //	recordButton.disabled = false;
  //	stopButton.disabled = false;
  //	pauseButton.disabled = true;
  //});
}

function pauseRecording() {
  //console.log("pauseButton clicked rec.recording=",rec.recording );
  var pauseButtons = document.querySelectorAll(".pause-button");
  var playButtons = document.querySelectorAll(".play-button");
  var playPauseButtons = document.querySelectorAll(".play-pause-button");
  //console.log("click all pause buttons if recording is paused");
  //console.log("and all play buttons if recording is resumed");
  //console.log("pauseButtons.length = ",pauseButtons.length);

  if (rec.recording) {
    //pause recording
    rec.stop();
    parent.metronome.setPlayStop(false);
    pauseButton.disabled = false;
    pauseButton.setAttribute("title", "Resume recording");
    pauseButton.classList.add("flash");
    recordButton.disabled = true;
    recordButton.classList.remove("flash");
    pauseButton0.click();
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton0.title = "Play";
    for (var i = 0; i < pauseButtons.length; i++) {
      //console.log(i);
      pauseButtons[i].click();
      playPauseButtons[i].innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
      //playPauseButtons[i].innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
      playPauseButtons[i].setAttribute("title", "Play");
      //playPauseButtons[i].setAttribute("title","Pause");
    }
  } else {
    //resume recording
    //console.log("Resuming recording...");
    rec.record();
    parent.metronome.setPlayStop(true);
    pauseButton.disabled = false;
    pauseButton.setAttribute("title", "Pause recording");
    pauseButton.classList.remove("flash");
    recordButton.classList.add("flash");
    playButton0.click();
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    playPauseButton0.title = "Pause";
    for (var i = 0; i < pauseButtons.length; i++) {
      //console.log(i);
      playButtons[i].click();
      //playPauseButtons[i].innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
      playPauseButtons[i].innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
      //playPauseButtons[i].setAttribute("title","Play");
      playPauseButtons[i].setAttribute("title", "Pause");
      recordButton.disabled = true;
    }
  }
}

function stopRecording() {
  //console.log("stopButton clicked");
  var stopButtons = document.querySelectorAll(".stop-button");
  var playButtons = document.querySelectorAll(".play-button");
  var playPauseButtons = document.querySelectorAll(".play-pause-button");
  //console.log("click all stop buttons")
  //console.log("stopButtons.length = ",stopButtons.length);
  for (var i = 0; i < stopButtons.length; i++) {
    //console.log(i);
    stopButtons[i].click();
    playButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    //playPauseButtons[i].innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    playPauseButtons[i].setAttribute("title", "Play");
    //playPauseButtons[i].setAttribute("title","Pause");
  }
  stopButton0.click();

  //disable the stop button, enable the record too allow for new recordings
  stopButton.disabled = true;
  stopButton.setAttribute("title", "");
  recordButton.disabled = false;
  recordButton.setAttribute("title", "Start recording");
  pauseButton.disabled = true;
  pauseButton.setAttribute("title", "");
  recordButton.classList.remove("flash");
  pauseButton.classList.remove("flash");
  playPauseButton0.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseButton0.title = "Play";
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseAllButton.hidden = false;
  playPauseAllButton.title = "Play all";
  stopAllButton.hidden = false;
  stopAllButton.title = "Stop all";
  combineSelectedButton.hidden = false;
  //reset button just in case the recording is stopped while paused
  pauseButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';

  //tell the recorder to stop the recording
  rec.stop();
  noRecordings++;
  //console.log("Number of recordings = ",noRecordings);

  //stop metronome
  parent.metronome.setPlayStop(false);

  //stop microphone access
  gumStream.getAudioTracks()[0].stop();

  //get the raw PCM audio data as an array of float32 numbers
  rec.getBuffer(function (buffer) {
    recordedBuffers.push(buffer); //push the buffer to an array
    console.log("recordedBuffers = ", recordedBuffers);
  });
  //create the wav blob and pass it on to createDownloadLink

  if (!Collab) {
    rec.exportWAV(createDownloadLink);
  }

  rec.exportWAV(function (blob) {
    recordedBlobs.push(blob);
    console.log("recordedBlobs", recordedBlobs);

    // Yjs only accepts UInt8Array types
    if (!!Collab && window.sharedRecordedBlobs != null) {
      blob.arrayBuffer().then((binaryData) => {
        let id = "";
        for (let num of crypto.getRandomValues(new Uint8Array(8))) {
          id += num.toString(16);
        }
        const uint8Data = new Uint8Array(binaryData);
        window.sharedRecordedBlobs.push([{ id, data: uint8Data }]);
      });
    }
  });

  //recordedBuffers.forEach(buffer => {
  //	console.log("length",buffer.byteLength);
  //});
}
// end recording section ///////////////////////////////////////////////////////

function createDownloadLink(blob, id) {
  var url = URL.createObjectURL(blob);

  // create a new container element for the waveform, timeline, and buttons
  var scrollContainer = document.createElement("div");
  scrollContainer.id = "scrollContainer" + count;
  scrollContainer.classList.add("waveform-class");
  scrollContainer.style.height = "70px";
  scrollContainer.style.overflow = "auto";
  //scrollContainer.speed = speed;
  document.body.appendChild(scrollContainer); // append the container to the body

  // create a new container element for wavesurfer
  var container = document.createElement("div");
  container.id = "waveform" + count;
  container.classList.add("waveform-class");
  scrollContainer.appendChild(container); // append the container to the body

  var timelineContainer = document.createElement("div");
  timelineContainer.id = "timeline" + count;
  timelineContainer.classList.add("timeline-class");
  scrollContainer.appendChild(timelineContainer); // append the container to the body

  var buttonContainer = document.createElement("div");
  buttonContainer.id = "buttons" + count;
  buttonContainer.classList.add("buttons-class");
  document.body.appendChild(buttonContainer); // append the container to the body

  // create a new wavesurfer instance
  var wavesurfer = WaveSurfer.create({
    container: "#waveform" + count,
    waveColor: "#345",
    minPxPerSec: 100,
    cursorWidth: 1,
    height: 50,
    scrollParent: "#scrollContainer" + count,
    scrollParent: true,
    progressColor: "#e81",
    plugins: [
      WaveSurfer.cursor.create({
        showTime: true,
        opacity: 1,
        customShowTimeStyle: {
          "background-color": "#345",
          color: "#0f5",
          padding: "2px",
          "font-size": "10px",
        },
      }),
      WaveSurfer.timeline.create({
        container: "#timeline" + count, // specify the container for the timeline
        height: 20, // specify the height of the timeline
      }),
    ],
    //backend: 'MediaElement' // to be able to use soundtouch
  });
  wavesurfer.load(url);

  //wavesurfer.on('ready', function () {
  //	let st = new window.soundtouch.SoundTouch(wavesurfer.backend.ac.sampleRate);
  //	var audioElement = wavesurfer.backend.getAudioElement();
  //	var soundTouch = new soundTouch.SoundTouch(audioElement);
  //});

  //let soundtouchNode;

  wavesurfer.on("ready", function () {
    let st = new window.soundtouch.SoundTouch(wavesurfer.backend.ac.sampleRate);
    let buffer = wavesurfer.backend.buffer;
    let channels = buffer.numberOfChannels;
    let l = buffer.getChannelData(0);
    let r = channels > 1 ? buffer.getChannelData(1) : l;
    let length = buffer.length;
    let seekingPos = null;
    let seekingDiff = 0;

    let source = {
      extract: function (target, numFrames, position) {
        if (seekingPos != null) {
          seekingDiff = seekingPos - position;
          seekingPos = null;
        }
        position += seekingDiff;
        for (let i = 0; i < numFrames; i++) {
          target[i * 2] = l[i + position];
          target[i * 2 + 1] = r[i + position];
        }
        return Math.min(numFrames, length - position);
      },
    };

    let soundtouchNode;

    wavesurfer.on("play", function () {
      seekingPos = ~~(wavesurfer.backend.getPlayedPercents() * length);
      st.tempo = wavesurfer.getPlaybackRate();

      if (st.tempo === 1) {
        wavesurfer.backend.disconnectFilters();
      } else {
        if (!soundtouchNode) {
          let filter = new window.soundtouch.SimpleFilter(source, st);
          soundtouchNode = window.soundtouch.getWebAudioNode(
            wavesurfer.backend.ac,
            filter
          );
        } else {
        }
        wavesurfer.backend.setFilter(soundtouchNode);
      }
    });

    wavesurfer.on("pause", function () {
      soundtouchNode && soundtouchNode.disconnect();
    });

    wavesurfer.on("seek", function () {
      seekingPos = ~~(wavesurfer.backend.getPlayedPercents() * length);
    });
  });

  //console.log("wavesufer speed was",speed,"%");

  wavesurfer.on("finish", function () {
    //wavesurfer.seekTo(0); // move the cursor to the beggining of the wavesurfer waveform
    playPauseButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton.title = "Play";
  });

  // create the buttons /////////////////////////////////////////////
  // create mute buttons
  var muteButton = document.createElement("button");
  muteButton.innerHTML =
    '<svg fill="#000000" width="25" height="25" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
  muteButton.className = "wavesurfer-button mute-button btn btn-lg";
  muteButton.style.marginRight = "30px";
  muteButton.setAttribute("title", "Mute");
  muteButton.addEventListener("click", function () {
    if (wavesurfer.getMute()) {
      wavesurfer.setMute(false);
      muteButton.setAttribute("title", "Mute");
      muteButton.innerHTML =
        '<svg fill="#000000" width="25" height="25" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
    } else {
      wavesurfer.setMute(true);
      muteButton.setAttribute("title", "Unmute");
      muteButton.innerHTML =
        '<svg fill="#000000" width="25" height="25" viewBox="0 0 19 19" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m2 7.5v3c0 .8.6 1.5 1.4 1.5h2.3l3.2 2.8c.1.1.3.2.4.2s.2 0 .3-.1c.2-.1.4-.4.4-.7v-.9l-7.2-7.2c-.5.2-.8.8-.8 1.4zm8 2v-5.8c0-.3-.1-.5-.4-.7-.1 0-.2 0-.3 0s-.3 0-.4.2l-2.8 2.5-4.1-4.1-1 1 3.4 3.4 5.6 5.6 3.6 3.6 1-1z" fill-rule="evenodd"/></svg>';
    }
  });
  buttonContainer.appendChild(muteButton);

  // create play/pause buttons (for "play" function go to hidden "playButton" below)
  var playPauseButton = document.createElement("button");
  playPauseButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseButton.className = "wavesurfer-button play-pause-button btn btn-lg";
  playPauseButton.title = "Play";
  playPauseButton.addEventListener("click", function () {
    if (wavesurfer.isPlaying()) {
      wavesurfer.pause();
      playPauseButton.setAttribute("title", "Play");
      playPauseButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    } else {
      playButton.click();
      playPauseButton.setAttribute("title", "Pause");
      playPauseButton.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    }
  });
  buttonContainer.appendChild(playPauseButton);

  // create hidden seperate play and pause buttons to control recordings
  var playButton = document.createElement("button");
  playButton.style.display = "none";
  playButton.innerHTML = "Play";
  playButton.speed = speed01;
  playButton.set_speed = 1.0;
  playButton.set_pitch = 1 / playButton.speed;
  playButton.className = "wavesurfer-button play-button";
  playButton.addEventListener("click", function () {
    wavesurfer.setPlaybackRate(playButton.set_speed);
    //if (!soundtouchNode) {
    //	let filter = new window.soundtouch.SimpleFilter(source, st);
    //	soundtouchNode = window.soundtouch.getWebAudioNode(wavesurfer.backend.ac, filter);
    //}else{
    //}
    //wavesurfer.backend.setFilter(soundtouchNode);
    //soundTouch.setPitch(5);
    wavesurfer.play();
  });
  buttonContainer.appendChild(playButton);

  var pauseButton = document.createElement("button");
  pauseButton.style.display = "none";
  pauseButton.innerHTML = "Pause";
  pauseButton.className = "wavesurfer-button btn btn-lg pause-button";
  pauseButton.addEventListener("click", function () {
    wavesurfer.pause();
  });
  buttonContainer.appendChild(pauseButton);

  //create stop buttons
  var stopButton = document.createElement("button");
  stopButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="black" class="bi bi-skip-start-fill" viewBox="0 0 16 16"><path d="M4 4a.5.5 0 0 1 1 0v3.248l6.267-3.636c.54-.313 1.232.066 1.232.696v7.384c0 .63-.692 1.01-1.232.697L5 8.753V12a.5.5 0 0 1-1 0V4z" /></svg>';
  stopButton.className = "wavesurfer-button btn btn-lg stop-button";
  stopButton.title = "Stop";

  stopButton.addEventListener("click", function () {
    wavesurfer.stop();
    playPauseButton.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton.title = "Play";
  });
  buttonContainer.appendChild(stopButton);

  //create download buttons
  var downloadButton = document.createElement("button");
  downloadButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-download" viewBox="0 0 16 16"><path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" /><path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" /></svg>';
  downloadButton.className = "wavesurfer-button btn btn-lg wavesurfer-button";
  downloadButton.setAttribute("title", "Download");
  downloadButton.addEventListener("click", function () {
    // create a temporary link element to trigger the download
    var tempLink = document.createElement("a");
    var unique_filename = new Date().toISOString();
    tempLink.download = unique_filename + ".wav";
    tempLink.href = url;
    tempLink.click();
  });
  buttonContainer.appendChild(downloadButton);

  function deleteHandler(event) {
    wavesurfer.stop();
    if (firstWaveform) {
      wavesurfer.destroy();
      firstWaveform = false;
    }
    timelineContainer.parentNode.removeChild(timelineContainer);
    container.parentNode.removeChild(container);
    buttonContainer.parentNode.removeChild(buttonContainer);
    scrollContainer.remove();

    if (event.currentTarget.dataset.collabId) {
      let indexToDelete = -1;
      let yarray = window.sharedRecordedBlobs.toArray();
      for (let i = 0; i < yarray.length; i++) {
        console.log({
          elemCollabId: deleteButton.dataset.collabId,
          collabId: yarray[i],
        });
        if (
          window.awareness.clientID === window.ydoc.clientID &&
          yarray[i]?.id === deleteButton.dataset.collabId
        ) {
          indexToDelete = i;
        }
      }
      if (indexToDelete > -1) {
        window.ydoc.transact(() => {
          window.sharedRecordedBlobs.delete(indexToDelete, 1);
          window.deletedSharedRecordedBlobIds.push([
            event.currentTarget.dataset.collabId,
          ]);
        });
      }
    }
  }

  //create delete buttons
  var deleteButton = document.createElement("button");
  deleteButton.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" width="25" height="25" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M6 7V18C6 19.1046 6.89543 20 8 20H16C17.1046 20 18 19.1046 18 18V7M6 7H5M6 7H8M18 7H19M18 7H16M10 11V16M14 11V16M8 7V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V7M8 7H16" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path> </g></svg>';
  deleteButton.className = "wavesurfer-button btn btn-lg delete-button";
  deleteButton.setAttribute("title", "Delete recording");
  deleteButton.dataset.collabId = id;
  deleteButton.addEventListener("click", function (event) {
    if (window.confirm("This track will be deleted for everyone. Are you sure you want to continue?")) {
      deleteHandler(event);
    }
  });
  buttonContainer.appendChild(deleteButton);

  var hiddenDeleteButton = document.createElement("button");
  hiddenDeleteButton.classList.add("hidden-delete-btn");
  hiddenDeleteButton.setAttribute("hidden", true);
  hiddenDeleteButton.style.display = "none";
  hiddenDeleteButton.dataset.collabId = id;
  hiddenDeleteButton.addEventListener("click", deleteHandler);
  buttonContainer.appendChild(hiddenDeleteButton);

  // add the speed property to the wavesurfer instance
  Object.defineProperty(wavesurfer, "speed", {
    get: function () {
      return scrollContainer.speed;
    },
    set: function (value) {
      scrollContainer.speed = speed;
      this.setPlaybackRate(speed);
    },
  });

  // increase the count variable
  count++;
}
window.createDownloadLink = createDownloadLink;

function combineSelected() {
  //console.log("combine files to single wav clicked");
  var length = 0;
  var maxRecLenth = 0;
  var noBuffers = 0;
  var muteButtons = document.querySelectorAll(".mute-button");
  var selectedBuffers = [];
  for (var i = 0; i < muteButtons.length; i++) {
    if (muteButtons[i].title == "Mute") {
      //console.log("Recording no",i+1," will be included in the mix");
      combineSelectedButton.title = "Mixing audio...";
      noBuffers++;
      selectedBuffers.push(i);
    }
  }
  selectedBuffers = selectedBuffers.map(function (index) {
    return recordedBuffers[index];
  });
  //console.log("selectedBuffers= ", selectedBuffers);
  //console.log("recordedBuffers= ", recordedBuffers);
  //console.log(noBuffers, " audio recordings to be mixed to a single wav file");

  /*
	DEBUG --> CORRECT, array values are being read
	let value = selectedBuffers[0][0][4000];
	console.log ("selectedBuffers[0][0][4000] = ",value);
	let value0 = recordedBuffers[0][0][4000];
	console.log ("selectedBuffers[0][0][4000] = ",value0);
	let value2 = selectedBuffers[1][0][4000];
	console.log ("selectedBuffers[1][0][4000] = ",value2);
	let value3 = selectedBuffers[2][0][4000];
	console.log ("selectedBuffers[2][0][4000] = ",value3);
	*/

  for (let n = 0; n < noBuffers; n++) {
    length = selectedBuffers[n][0].length;
    //console.log("Recording's ",n+1," lenght = ",length);
    if (length > maxRecLenth) {
      maxRecLenth = length;
    }
  }
  //console.log("maximum length of selected recordings = ",maxRecLenth);
  mixAudioBuffers(selectedBuffers, maxRecLenth);
}

function mixAudioBuffers(buffers, length) {
  //console.log("mixAudioBuffers started");
  //console.log("buffers[0][0][4000] =", buffers[0][0][4000]);
  var mixData = new Array(length).fill(0);
  for (let i = 0; i < buffers.length; i++) {
    for (let j = 0; j < buffers[i][0].length; j++) {
      mixData[j] = mixData[j] + buffers[i][0][j];
    }
  }
  for (let k = 0; k < mixData.length; k++) {
    mixData[k] = mixData[k] / buffers.length;
  }
  //console.log ("mixData = ",mixData);
  dataToWave(mixData); // This creates the blob with PCM32 audio from float32 array and saves it

  /* DEBUG
	const channelDataJson = JSON.stringify(mixData);
	const blob = new Blob([channelDataJson], { type: 'application/json' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = 'channelData.json';
	link.click();	// Click the link to download the file
	// END DEBUG -->> CORRECT, data written to wav in python sf.write(mixdata,sampleRate) produces the expected mixed audio
	*/
}

function dataToWave(Float32BitSampleArray) {
  // https://gist.github.com/meziantou/edb7217fddfbb70e899e
  // https://stackoverflow.com/questions/73891141/should-i-convert-32-bit-float-audio-samples-into-a-16-bit-pcm-data-wav-file-in-m
  var dataTypeSize = 32, // 32 bit PCM data
    totalDataSize = (dataTypeSize / 8) * Float32BitSampleArray.length,
    sizeOfFileDescriptor = totalDataSize + 36,
    numberOfChannels = 1,
    bytesPerSample = (numberOfChannels * dataTypeSize) / 8,
    blockAlign = numberOfChannels * bytesPerSample,
    bitsPerSample = bytesPerSample * 8,
    byteRate = sampleRate * bytesPerSample * numberOfChannels,
    buffer = new ArrayBuffer(44 + totalDataSize),
    view = new DataView(buffer),
    format = 1;
  function writeStringIntoBuffer(index, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(index + i, str.charCodeAt(i));
    }
  }
  function write32BitInt(index, val) {
    view.setUint32(index, val, true);
  }
  function write16BitInt(index, val) {
    view.setUint16(index, val, true);
  }
  writeStringIntoBuffer(0, "RIFF");
  write32BitInt(4, sizeOfFileDescriptor);
  writeStringIntoBuffer(8, "WAVE");
  writeStringIntoBuffer(12, "fmt ");
  write32BitInt(16, 16);
  write16BitInt(20, format);
  write16BitInt(22, numberOfChannels);
  write32BitInt(24, sampleRate);
  write32BitInt(28, byteRate);
  write16BitInt(32, blockAlign);
  write16BitInt(34, bitsPerSample);
  writeStringIntoBuffer(36, "data");
  write32BitInt(40, totalDataSize);

  //console.log("view=",view); // to view file size to be filled with audio data and check if correct

  // Write audio data
  const dataView = new DataView(buffer, 44);
  for (let i = 0; i < Float32BitSampleArray.length; i++) {
    const byteOffset = i * 4;
    const intSample =
      Math.max(-1, Math.min(1, Float32BitSampleArray[i])) * 0x7fffffff;
    dataView.setInt32(byteOffset, intSample, true);
  }
  var mixBlob = new Blob([view], { type: "audio/wav" });
  //console.log("vmixBlob=",mixBlob);
  const url = URL.createObjectURL(mixBlob); // Create a link to download the file
  var tempLink = document.createElement("a");
  var unique_filename = new Date().toISOString();
  tempLink.download = unique_filename + ".wav";
  tempLink.href = url;
  tempLink.click();
}

// Create an instance of wavesurfer for the audio file to be followed
let wavesurfer0 = {};

// Read a file
function readSingleFile(e) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var reader = new FileReader();
  waveform0Container.removeAttribute("hidden");
  timeline0Container.removeAttribute("hidden");
  controls0Container.removeAttribute("hidden");
  stopButton0.removeAttribute("hidden");
  playPauseButton0.removeAttribute("hidden");
  muteButton0.removeAttribute("hidden");
  reader.onload = function (e) {
    var contents = e.target.result;
    wavesurfer0.loadArrayBuffer(contents);
    displayContents(contents);
  };
  reader.readAsArrayBuffer(file);
}

// Load a file from url
function loadUrlFile(e) {
  var reader = new FileReader();
  waveform0Container.removeAttribute("hidden");
  timeline0Container.removeAttribute("hidden");
  controls0Container.removeAttribute("hidden");
  stopButton0.removeAttribute("hidden");
  playPauseButton0.removeAttribute("hidden");
  muteButton0.removeAttribute("hidden");
  //console.log("file = ",e);
  wavesurfer0.load(
    `https://musicolab.hmu.gr/apprepository/downloadPublicFile.php?f=${e}`
  );
  reader.onload = function (e) {
    var contents = e.target.result;
    console.log("contents =", contents);
    wavesurfer0.loadArrayBuffer(contents);
    displayContents(contents);
  };
}

function playpauseAll() {
  if (playPauseAllButton.getAttribute("title") === "Play all") {
    //console.log("playPauseAllButton (PLAY) clicked");
    //console.log("Play ALL");
    playPauseAllButton.setAttribute("title", "Pause all");
    playAll();
  } else {
    pauseAll();
    //console.log("Pause ALL");
    playPauseAllButton.setAttribute("title", "Play all");
  }
}

// Playall button
function playAll() {
  //console.log("playPauseAllButton (PLAY) clicked");
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
  playPauseAllButton.title = "Pause all";
  var playButtons = document.querySelectorAll(".play-button");
  var playPauseButtons = document.querySelectorAll(".play-pause-button");
  //console.log("now, I will click all play buttons");
  //console.log("playButtons.length = ",playButtons.length);
  for (var i = 0; i < playButtons.length; i++) {
    //console.log(i);
    playButtons[i].click();
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor"	class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    playPauseButtons[i].setAttribute("title", "Pause");
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    playPauseButton0.setAttribute("title", "Pause");
  }

  if (wavesurfer0.getCurrentTime() === 0) {
    setTimeout(function () {
      playButton0.click();
    }, delayedStart / speed01);
  } else {
    playButton0.click();
  }
}

function pauseAll() {
  //console.log("playPauseAllButton (PAUSE) clicked");
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseAllButton.title = "Play all";
  pauseButton0.click();
  var playPauseButtons = document.querySelectorAll(".play-pause-button");
  var pauseButtons = document.querySelectorAll(".pause-button");
  //console.log("now I will click all play buttons");
  //console.log("pauseButtons.length = ",pauseButtons.length);
  for (var i = 0; i < pauseButtons.length; i++) {
    //console.log(i);
    pauseButtons[i].click();
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButtons[i].setAttribute("title", "Play");
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButton0.setAttribute("title", "Play");
  }
}

function stopAll() {
  //console.log("stopAllButton clicked");
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  playPauseAllButton.title = "Play all";
  stopButton0.click();
  var stopButtons = document.querySelectorAll(".stop-button");
  var playButtons = document.querySelectorAll(".play-button");
  var playPauseButtons = document.querySelectorAll(".play-pause-button");
  //console.log("click all stop buttons")
  //console.log("stopButtons.length = ",stopButtons.length);
  for (var i = 0; i < stopButtons.length; i++) {
    //console.log(i);
    stopButtons[i].click();
    playButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playButtons[i].setAttribute("title", "Play");
    playPauseButtons[i].innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    playPauseButtons[i].setAttribute("title", "Play");
  }
}

function displayContents(contents) {
  var element = document.getElementById("file-content");
  element.textContent = contents;
}

document
  .getElementById("file-input")
  .addEventListener("change", readSingleFile, false);

function showHiddenButtons() {
  playPauseAllButton.hidden = false;
  playPauseAllButton.setAttribute("title", "Play all");
  playPauseAllButton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';

  stopAllButton.hidden = false;
  combineSelectedButton.hidden = false;
}

function initBuffers() {
  console.log("initializing buffers");
  for (let { data } of window.sharedRecordedBlobs) {
    let blob = new Blob([data]);
    recordedBlobs.push(blob);

    blob.arrayBuffer().then((buffer) => {
      recordedBuffers.push([new Float32Array(buffer)]);
    });
  }
}

// Init & load audio file
document.addEventListener("DOMContentLoaded", function () {
  let playPauseButton0 = document.querySelector("#playPauseButton0"),
    muteButton0 = document.querySelector("#muteButton0"),
    stopButton0 = document.querySelector("#stopButton0"),
    selectedfile = document
      .getElementById("file-input")
      .addEventListener("change", readSingleFile, false);
  wavesurfer0 = WaveSurfer.create({
    container: document.querySelector("#waveform0"),
    height: 50,
    scrollParent: true,
    plugins: [
      WaveSurfer.cursor.create({
        showTime: true,
        opacity: 1,
        customShowTimeStyle: {
          "background-color": "#555",
          color: "#0f5",
          padding: "2px",
          "font-size": "10px",
        },
      }),
      WaveSurfer.timeline.create({
        container: document.querySelector("#timeline0"), // specify the container for the timeline
        height: 20, // specify the height of the timeline
      }),
    ],
  });

  wavesurfer0.on("error", function (e) {
    console.warn(e);
  });
  // Load audio from URL
  // wavesurfer0.load('./files/piano.wav');

  //////////////////// if file parameter in url, load audio file to follow
  // Check if the 'f' parameter is present in the URL
  if (fileParam) {
    //console.log("file = ",fileParam);
    loadUrlFile(fileParam);
  } else {
    console.log('Missing "f" parameter in URL, no audio file loaded');
  }

  wavesurfer0.on("ready", function () {
    let st = new window.soundtouch.SoundTouch(
      wavesurfer0.backend.ac.sampleRate
    );
    let buffer = wavesurfer0.backend.buffer;
    let channels = buffer.numberOfChannels;
    let l = buffer.getChannelData(0);
    let r = channels > 1 ? buffer.getChannelData(1) : l;
    let length = buffer.length;
    let seekingPos = null;
    let seekingDiff = 0;

    let source = {
      extract: function (target, numFrames, position) {
        if (seekingPos != null) {
          seekingDiff = seekingPos - position;
          seekingPos = null;
        }
        position += seekingDiff;
        for (let i = 0; i < numFrames; i++) {
          target[i * 2] = l[i + position];
          target[i * 2 + 1] = r[i + position];
        }
        return Math.min(numFrames, length - position);
      },
    };

    let soundtouchNode;

    wavesurfer0.on("play", function () {
      seekingPos = ~~(wavesurfer0.backend.getPlayedPercents() * length);
      st.tempo = wavesurfer0.getPlaybackRate();

      if (st.tempo === 1) {
        wavesurfer0.backend.disconnectFilters();
      } else {
        if (!soundtouchNode) {
          let filter = new window.soundtouch.SimpleFilter(source, st);
          soundtouchNode = window.soundtouch.getWebAudioNode(
            wavesurfer0.backend.ac,
            filter
          );
        } else {
        }
        wavesurfer0.backend.setFilter(soundtouchNode);
      }
    });

    wavesurfer0.on("pause", function () {
      soundtouchNode && soundtouchNode.disconnect();
    });

    wavesurfer0.on("seek", function () {
      seekingPos = ~~(wavesurfer0.backend.getPlayedPercents() * length);
    });
  });

  // Play-pause button
  playPauseButton0.onclick = function () {
    console.log("speed01 =", speed01);
    wavesurfer0.setPlaybackRate(speed01);
    wavesurfer0.playPause();
    if (wavesurfer0.isPlaying()) {
      playPauseButton0.setAttribute("title", "Pause");
      playPauseButton0.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="currentColor" class="bi bi-pause-fill" viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" /></svg>';
    } else {
      playPauseButton0.setAttribute("title", "Play");
      playPauseButton0.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
    }
  };

  // Play button
  playButton0.onclick = function () {
    wavesurfer0.setPlaybackRate(speed01);
    wavesurfer0.play();
  };
  // Pause button
  pauseButton0.onclick = function () {
    wavesurfer0.pause();
  };
  // Mute-Unmute button
  muteButton0.onclick = function () {
    //wavesurfer0.toggleMute();
    if (wavesurfer0.getMute()) {
      wavesurfer0.setMute(false);
      muteButton0.setAttribute("title", "Mute");
      muteButton0.innerHTML =
        '<svg fill="#000000" width="45" height="45" viewBox="-2.5 0 19 19" xmlns="http://www.w3.org/2000/svg" class="cf-icon-svg"><path d="M7.365 4.785v9.63c0 .61-.353.756-.784.325l-2.896-2.896H1.708A1.112 1.112 0 0 1 .6 10.736V8.464a1.112 1.112 0 0 1 1.108-1.108h1.977L6.581 4.46c.43-.43.784-.285.784.325zm2.468 7.311a3.53 3.53 0 0 0 0-4.992.554.554 0 0 0-.784.784 2.425 2.425 0 0 1 0 3.425.554.554 0 1 0 .784.783zm1.791 1.792a6.059 6.059 0 0 0 0-8.575.554.554 0 1 0-.784.783 4.955 4.955 0 0 1 0 7.008.554.554 0 1 0 .784.784z"/></svg>';
    } else {
      wavesurfer0.setMute(true);
      muteButton0.setAttribute("title", "Unmute");
      muteButton0.innerHTML =
        '<svg fill="#000000" width="45" height="45" viewBox="0 0 19 19" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="m2 7.5v3c0 .8.6 1.5 1.4 1.5h2.3l3.2 2.8c.1.1.3.2.4.2s.2 0 .3-.1c.2-.1.4-.4.4-.7v-.9l-7.2-7.2c-.5.2-.8.8-.8 1.4zm8 2v-5.8c0-.3-.1-.5-.4-.7-.1 0-.2 0-.3 0s-.3 0-.4.2l-2.8 2.5-4.1-4.1-1 1 3.4 3.4 5.6 5.6 3.6 3.6 1-1z" fill-rule="evenodd"/></svg>';
    }
  };
  // Stop button
  stopButton0.onclick = function () {
    wavesurfer0.stop();
    playPauseButton0.setAttribute("title", "Play");
    playPauseButton0.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="45" height="45" fill="green" class="bi bi-play-fill" viewBox="0 0 16 16"><path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>';
  };
});
