/* global window, document */
"use strict";
require('./requestFullScreen');
var variables = require('../variables');
var html = require('../html');
var util = require('../util');
var media = require('../media');
var dom = html.dom;
var buttonDom = html.button;

var namespace = variables.namespace;
var displayHidden = variables.displayHidden;
var dateHelper = util.date;

var URL = window.URL;
var MediaSource = window.MediaSource||window.WebKitMediaSource;

var name = 'control-';
var meta = {
	className: {
		container: 'control',
		scroll: name+'scroll',
		scrollPointer: name+'scroll-pointer',
		scrollTouch: name+'scroll-touch',
		scrollBg: name+'scroll-bg',
		scrollBg1: name+'scroll-bg1',
		scrollBg2: name+'scroll-bg2',
		btnPlay: name+'btn-play',
		btnVolume: name+'btn-volume',
		btnSwipe: name+'btn-swipe',
		btnView: name+'btn-view',
		btnFullScreen: name+'btn-fullscreen',
		txtTime: name+'txt-time'
	},
	error: {
		'notSupportFullScreen': { msg: '您的浏览器不支持全屏!' }
	}
};

var defaultControlOptions = {
	autoplay: false,
	loop: false,
	scroll: true,
	btnPlay: true,
	btnVolume: true,
	btnSwipe: true,
	btnView: true,
	btnFullScreen: true,
	txtTime: true,
	dragFile: true
};

function Control(options){
	this.init(options);
}
Control.prototype = {
	constructor: Control,
	init: function(options){
		var self = this;
		var container = options.container;
		var video = options.video;
		var renderer = options.renderer;
		var controlOptions = util.extend({}, defaultControlOptions, options.control);
		var autoplay = controlOptions.autoplay;
		var loop = controlOptions.loop;
		var dragFile = controlOptions.dragFile;
		
		video.setAttribute('webkit-playsinline','');  //行内播放
		video.setAttribute('preload','');  //行内播放
		
		renderer.keyframe = function(){
			self.keyframe();
		};
		if(dragFile){
			var canvas = renderer.renderer.domElement;
			canvas.addEventListener( 'dragover', handleDragFile, false );
			canvas.addEventListener( 'drop', handleDropFile, false );
		}
		
		var controlContainer = dom.createElement({ className: namespace+meta.className.container });
		var scroll = dom.createElement({ className: namespace+meta.className.scroll });
		var scrollTouch = dom.createElement({ className: namespace+meta.className.scrollTouch });
		var scrollPointer = dom.createElement({ className: namespace+meta.className.scrollPointer });
		var scrollBg = dom.createElement({ className: namespace+meta.className.scrollBg });
		var scrollBg1 = dom.createElement({ className: namespace+meta.className.scrollBg1 });
		var scrollBg2 = dom.createElement({ className: namespace+meta.className.scrollBg2 });
		var btnPlay = buttonDom.createElement({ className: namespace+meta.className.btnPlay });
		var btnVolume = buttonDom.createElement({ className: namespace+meta.className.btnVolume });
		var btnSwipe = buttonDom.createElement({ className: namespace+meta.className.btnSwipe });
		var btnView = buttonDom.createElement({ className: namespace+meta.className.btnView });
		var btnFullScreen = buttonDom.createElement({ className: namespace+meta.className.btnFullScreen });
		var txtTime = dom.createElement({ className: namespace+meta.className.txtTime });
		
		var controlComponents = {
			scroll: scroll,
			btnPlay: btnPlay,
			btnVolume: btnVolume,
			btnSwipe: btnSwipe,
			btnView: btnView,
			btnFullScreen: btnFullScreen,
			txtTime: txtTime
		};
		for(var i in controlComponents){
			var component = controlComponents[i];
			var componentOption = controlOptions[i];
			if(!componentOption){
				component.classList.add(displayHidden);
			}
		}
		
		scroll.appendChild(scrollTouch);
		scroll.appendChild(scrollPointer);
		scroll.appendChild(scrollBg);
		scroll.appendChild(scrollBg1);
		scroll.appendChild(scrollBg2);
		controlContainer.appendChild(scroll);
		controlContainer.appendChild(btnPlay);
		controlContainer.appendChild(txtTime);
		controlContainer.appendChild(btnFullScreen);
		controlContainer.appendChild(btnView);
		controlContainer.appendChild(btnSwipe);
		controlContainer.appendChild(btnVolume);
		
		container.appendChild(controlContainer);
		
		self.container = container;
		self.video = video;
		self.renderer = renderer;
		self.scroll = scroll;
		self.scrollPointer = scrollPointer;
		self.scrollBg1 = scrollBg1;
		self.scrollBg2 = scrollBg2;
		self.btnPlay = btnPlay;
		self.btnVolume = btnVolume;
		self.btnSwipe = btnSwipe;
		self.btnView = btnView;
		self.btnFullScreen = btnFullScreen;
		self.txtTime = txtTime;
		
		dom.addAttribute(video,'loop', loop);
		dom.addAttribute(video,'autoplay', autoplay);
		
		video.load(); // must call after setting/changing source
		self.play();
		self.pause();
		if(autoplay){
			self.play();
		}
		
		self.renderVolume();
		self.useTouch();
		self.useFullMotion();
		
		//bind event
		var isInit = false;
		var isPlaying = false;
		video.addEventListener('canplay', function(){ //canplaythrough ios not support. 2b event
			renderer.loadVideo(video);
			
			if(self.isPlaying())isPlaying=true;
			self.play();
			if(!isPlaying)self.pause();
			isPlaying=false;
			
			self.keyframe();
			if(!isInit){
				//self.initPlay();  //will loop this
				isInit = true;
			}
		});
		
		video.addEventListener('ended', function(){
			self.initPlay();
		});
		
		video.addEventListener('volumechange', function(){
			//no validate in mobile to set volume
			self.renderVolume();
		});
		
		var progress = 0;
		var isTouchPointer = false;
		scroll.addEventListener('click', function(e){
			if(isTouchPointer)return;
			//var x = e.x||e.pageX;
			//var width = x - scroll.offsetLeft;
			var width = e.offsetX;
			var total = scroll.offsetWidth||1;
			progress = width/total;
			progress = Math.min(Math.max(0, progress), 1);
			self.playProcess(progress);
		});
		scrollPointer.addEventListener('touchstart', function(){
			if(self.isPlaying())isPlaying=true;
			isTouchPointer = true;
			self.stop();
		});
		scrollPointer.addEventListener('touchmove', function(e){
			if(isTouchPointer){
				var x = e.touches[0].pageX;
				var rect = scroll.getBoundingClientRect();
				var width = x - rect.left;
				var total = scroll.offsetWidth||1;
				progress = width/total;
				progress = Math.min(Math.max(0, progress), 1);
				scrollPointer.style.left = progress*100 + '%';
				scrollBg2.style.width = progress*100 + '%';
			}
		});
		scrollPointer.addEventListener('touchend', function(){
			if(isTouchPointer){
				self.playProcess(progress);
				
				self.play();
				if(isPlaying){
					isPlaying = false;
				}else{
					self.pause();
				}
			}
			isTouchPointer = false;
		});
		
		btnPlay.addEventListener('click', handleBtnPlay);
		btnVolume.addEventListener('click', handleBtnVolume);
		btnSwipe.addEventListener('click', handleBtnSwipe);
		btnView.addEventListener('click', handleBtnView);
		btnFullScreen.addEventListener('click', handleBtnFullScreen);
		
		
		function handleBtnPlay(e){
			var target = e.target||e.srcElement;
			self.togglePlay(target);
		}
		
		function handleBtnVolume(){
			self.toggleVolume();
		}
		
		function handleBtnSwipe(){
			self.toggleSwipe();
		}
		
		function handleBtnView(){
			self.toggleView();
		}
		
		function handleBtnFullScreen(){
			var isFullScreen = container.hasAttribute('fullscreen');
			if(isFullScreen){
				self.cancelFullScreen();
			}else{
				self.requestFullScreen();
			}
		}
		
		function handleDragFile(e){
			e.stopPropagation();
			e.preventDefault();
			e.dataTransfer.dropEffect = 'copy';
		}
		
		function handleDropFile(e){
			e.stopPropagation();
			e.preventDefault();
			var files = e.dataTransfer.files;
			var file = files[0];
			var src = URL.createObjectURL(file);
			loadVideo(src);
		}
		
		function loadVideo(src){
			self.stop();
			video.src = src;
			video.load();
		}
	},
	load: function(src){
		var self = this;
		var video = self.video;
		if(typeof src === 'string'){
			video.src = src;
		}else if(util.isArray(src)){
			var bytes = src;
			var mediaSource = new MediaSource();
				// setup the media source
			mediaSource.addEventListener('sourceopen', function() {
				var videoBuffer = mediaSource.addSourceBuffer('video/mp4;codecs=avc1.4d400d'),  //'video/mp4;codecs=avc1.4d400d'
					audioBuffer = mediaSource.addSourceBuffer('audio/mp4;codecs=mp4a.40.2'),  //'audio/mp4;codecs=mp4a.40.2'
					transmuxer = new media.mp2t.Transmuxer(),
					videoSegments = [],
					audioSegments = [];
				// expose the machinery for debugging
				
				// transmux the MPEG-TS data to BMFF segments
				transmuxer.on('data', function(segment) {
					if (segment.type === 'video') {
						videoSegments.push(segment);
					} else {
						audioSegments.push(segment);
					}
				});
				transmuxer.push(bytes);  //media.hazeVideo
				transmuxer.end();
				// buffer up the video data
				videoBuffer.appendBuffer(videoSegments.shift().data);
				videoBuffer.addEventListener('updateend', function() {
					if (videoSegments.length) {
						videoBuffer.appendBuffer(videoSegments.shift().data);
					}
				});
				// buffer up the audio data
				audioBuffer.appendBuffer(audioSegments.shift().data);
				audioBuffer.addEventListener('updateend', function() {
					if (audioSegments.length) {
						audioBuffer.appendBuffer(audioSegments.shift().data);
					}
				});
				
				self.sourceBuffer = videoBuffer;
			});
			
			video.src = URL.createObjectURL(mediaSource);
			self.mediaSource = mediaSource;
		}
		if(src){
			video.load();
			video.play();
			video.pause();
		}
	},
	keyframe: function(){  //param: renderer
		var self = this;
		var video = self.video;
		var scrollPointer = self.scrollPointer;
		var scrollBg1 = self.scrollBg1;
		var scrollBg2 = self.scrollBg2;
		var txtTime = self.txtTime;
		var currentTime = video.currentTime||0;
		var duration = video.duration||1;
		var buffered = video.buffered;
		var bufferedSize = buffered.length;
		var currentBuffer = bufferedSize===0?0:buffered.end(bufferedSize-1);
		
		var loadProgress = Math.floor( currentBuffer/duration*10000 )/100;
		scrollBg1.style.width = loadProgress+'%';
		
		var progress = Math.floor( currentTime/duration*10000 )/100;
		scrollPointer.style.left = progress+'%';
		scrollBg2.style.width = progress+'%';
		
		var currentStr = dateHelper.durationToStr(currentTime*1000, 'hh:mm:ss', 'hh');
		var durationStr = dateHelper.durationToStr(duration*1000, 'hh:mm:ss', 'hh');
		txtTime.innerHTML = currentStr + '/' + durationStr;
	},
	initPlay: function(){
		var self = this;
		self.playProcess(0);
		self.keyframe();
		self.pause();
	},
	togglePlay: function(){
		var self = this;
		var target = self.btnPlay;
		var isPause = target.hasAttribute('pause');
		if(isPause){
			self.play();
		}else{
			self.pause();
		}
	},
	isPlaying: function(){
		var self = this;
		var target = self.btnPlay;
		var isPause = target.hasAttribute('pause');
		return !isPause;
		//return !self.video.paused;
	},
	play: function(){
		var self = this;
		var target = self.btnPlay;
		target.removeAttribute('pause');
		self.renderer.start();
		self.video.play();
	},
	pause: function(){
		var self = this;
		var target = self.btnPlay;
		target.setAttribute('pause', '');
		this.renderer.pause();
		self.video.pause();
	},
	stop: function(){
		this.renderer.stop();
		this.pause();
	},
	playProcess: function(progress){  //0 - 1
		var self = this;
		var video = self.video;
		
		var duration = video.duration;
		var currentTime = Math.floor(duration*progress);
		video.currentTime = currentTime;
	},
	toggleVolume: function(){  //set muted
		var self = this;
		var video = self.video;
		if(video.muted){
			video.muted = false;
		}else{
			video.muted = true;
		}
		self.renderVolume();
	},
	renderVolume: function(){
		var self = this;
		var video = self.video;
		var target = self.btnVolume;
		var volume = video.volume;
		var muted = video.muted;
		if(muted){
			target.setAttribute('volume', 0);
		}else{
			if(volume<0.333){
				target.setAttribute('volume', 1);
			}else if(volume>=0.333&&volume<0.667){
				target.setAttribute('volume', 2);
			}else{
				target.setAttribute('volume', 3);
			}
		}
	},
	setVolume: function(volume){  //0.0 - 1.0
		var self = this;
		var video = self.video;
		var target = self.btnVolume;
		if(volume<0.333){
			target.setAttribute('volume', 1);
		}else if(volume>=0.333&&volume<0.667){
			target.setAttribute('volume', 2);
		}else{
			target.setAttribute('volume', 3);
		}
		video.volume = volume;
	},
	toggleSwipe: function(){
		var self = this;
		var target = self.btnSwipe;
		var type = target.getAttribute('swipe_type');
		if(type==='motion'){
			self.useTouch();
		}else if(window.DeviceMotionEvent){
			self.useDeviceMotion();
		}
	},
	useTouch: function(){
		var self = this;
		var target = self.btnSwipe;
		var renderer = self.renderer;
		renderer.useTouch = true;
		renderer.useDeviceMotion = false;
		target.setAttribute('swipe_type', 'touch');
	},
	useDeviceMotion: function(){
		if(window.DeviceOrientationEvent){
			var self = this;
			var target = self.btnSwipe;
			var renderer = self.renderer;
			renderer.useTouch = false;
			renderer.useDeviceMotion = true;
			target.setAttribute('swipe_type', 'motion');
		}
	},
	toggleView: function(){
		var self = this;
		var target = self.btnView;
		var type = target.getAttribute('view_type');
		if(type==='fm'){
			self.useVirtualReality();
		}else{
			self.useFullMotion();
		}
	},
	useFullMotion: function(){
		var self = this;
		var target = self.btnView;
		var renderer = self.renderer;
		renderer.useFullMotion = true;
		renderer.useVirtualReality = false;
		target.setAttribute('view_type', 'fm');
	},
	useVirtualReality: function(){
		var self = this;
		var target = self.btnView;
		var renderer = self.renderer;
		renderer.useFullMotion = false;
		renderer.useVirtualReality = true;
		target.setAttribute('view_type', 'vr');
	},
	requestFullScreen: function(){
		var self = this;
		var target = self.container;
		target.setAttribute('fullscreen', '');
		if(!window.requestFullScreen(target)){
			window.alert(meta.error.notSupportFullScreen.msg);
		}
	},
	cancelFullScreen: function(){
		var self = this;
		var target = self.container;
		target.removeAttribute('fullscreen');
		document.cancelFullScreen();
	}
};


module.exports = Control;