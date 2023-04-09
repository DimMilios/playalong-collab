var timerID=null;
var interval=60;

self.onmessage=function(e){
	if (e.data=="start") {
		timerID=setInterval(function(){postMessage("tick");},interval)
	}
	else if (e.data.interval) {
		// console.log("setting interval");
		interval=e.data.interval;
		// console.log("interval="+interval);
		if (timerID) {
			clearInterval(timerID);
			timerID=setInterval(function(){postMessage("tick");},interval)
		}
	}
	else if (e.data=="stop") {
		// console.log("stopping");
		clearInterval(timerID);
		timerID=null;
	}
};

postMessage('hi there');
