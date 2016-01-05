(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function( factory ) {
	if (typeof define !== 'undefined' && define.amd) {
		define([], factory);
	} else if (typeof module !== 'undefined' && module.exports) {
		module.exports = factory();
	} else {
		window.scrollMonitor = factory();
	}
})(function() {

	var scrollTop = function() {
		return window.pageYOffset ||
			(document.documentElement && document.documentElement.scrollTop) ||
			document.body.scrollTop;
	};

	var exports = {};

	var watchers = [];

	var VISIBILITYCHANGE = 'visibilityChange';
	var ENTERVIEWPORT = 'enterViewport';
	var FULLYENTERVIEWPORT = 'fullyEnterViewport';
	var EXITVIEWPORT = 'exitViewport';
	var PARTIALLYEXITVIEWPORT = 'partiallyExitViewport';
	var LOCATIONCHANGE = 'locationChange';
	var STATECHANGE = 'stateChange';

	var eventTypes = [
		VISIBILITYCHANGE,
		ENTERVIEWPORT,
		FULLYENTERVIEWPORT,
		EXITVIEWPORT,
		PARTIALLYEXITVIEWPORT,
		LOCATIONCHANGE,
		STATECHANGE
	];

	var defaultOffsets = {top: 0, bottom: 0};

	var getViewportHeight = function() {
		return window.innerHeight || document.documentElement.clientHeight;
	};

	var getDocumentHeight = function() {
		// jQuery approach
		// whichever is greatest
		return Math.max(
			document.body.scrollHeight, document.documentElement.scrollHeight,
			document.body.offsetHeight, document.documentElement.offsetHeight,
			document.documentElement.clientHeight
		);
	};

	exports.viewportTop = null;
	exports.viewportBottom = null;
	exports.documentHeight = null;
	exports.viewportHeight = getViewportHeight();

	var previousDocumentHeight;
	var latestEvent;

	var calculateViewportI;
	function calculateViewport() {
		exports.viewportTop = scrollTop();
		exports.viewportBottom = exports.viewportTop + exports.viewportHeight;
		exports.documentHeight = getDocumentHeight();
		if (exports.documentHeight !== previousDocumentHeight) {
			calculateViewportI = watchers.length;
			while( calculateViewportI-- ) {
				watchers[calculateViewportI].recalculateLocation();
			}
			previousDocumentHeight = exports.documentHeight;
		}
	}

	function recalculateWatchLocationsAndTrigger() {
		exports.viewportHeight = getViewportHeight();
		calculateViewport();
		updateAndTriggerWatchers();
	}

	var recalculateAndTriggerTimer;
	function debouncedRecalcuateAndTrigger() {
		clearTimeout(recalculateAndTriggerTimer);
		recalculateAndTriggerTimer = setTimeout( recalculateWatchLocationsAndTrigger, 100 );
	}

	var updateAndTriggerWatchersI;
	function updateAndTriggerWatchers() {
		// update all watchers then trigger the events so one can rely on another being up to date.
		updateAndTriggerWatchersI = watchers.length;
		while( updateAndTriggerWatchersI-- ) {
			watchers[updateAndTriggerWatchersI].update();
		}

		updateAndTriggerWatchersI = watchers.length;
		while( updateAndTriggerWatchersI-- ) {
			watchers[updateAndTriggerWatchersI].triggerCallbacks();
		}

	}

	function ElementWatcher( watchItem, offsets ) {
		var self = this;

		this.watchItem = watchItem;

		if (!offsets) {
			this.offsets = defaultOffsets;
		} else if (offsets === +offsets) {
			this.offsets = {top: offsets, bottom: offsets};
		} else {
			this.offsets = {
				top: offsets.top || defaultOffsets.top,
				bottom: offsets.bottom || defaultOffsets.bottom
			};
		}

		this.callbacks = {}; // {callback: function, isOne: true }

		for (var i = 0, j = eventTypes.length; i < j; i++) {
			self.callbacks[eventTypes[i]] = [];
		}

		this.locked = false;

		var wasInViewport;
		var wasFullyInViewport;
		var wasAboveViewport;
		var wasBelowViewport;

		var listenerToTriggerListI;
		var listener;
		function triggerCallbackArray( listeners ) {
			if (listeners.length === 0) {
				return;
			}
			listenerToTriggerListI = listeners.length;
			while( listenerToTriggerListI-- ) {
				listener = listeners[listenerToTriggerListI];
				listener.callback.call( self, latestEvent );
				if (listener.isOne) {
					listeners.splice(listenerToTriggerListI, 1);
				}
			}
		}
		this.triggerCallbacks = function triggerCallbacks() {

			if (this.isInViewport && !wasInViewport) {
				triggerCallbackArray( this.callbacks[ENTERVIEWPORT] );
			}
			if (this.isFullyInViewport && !wasFullyInViewport) {
				triggerCallbackArray( this.callbacks[FULLYENTERVIEWPORT] );
			}


			if (this.isAboveViewport !== wasAboveViewport &&
				this.isBelowViewport !== wasBelowViewport) {

				triggerCallbackArray( this.callbacks[VISIBILITYCHANGE] );

				// if you skip completely past this element
				if (!wasFullyInViewport && !this.isFullyInViewport) {
					triggerCallbackArray( this.callbacks[FULLYENTERVIEWPORT] );
					triggerCallbackArray( this.callbacks[PARTIALLYEXITVIEWPORT] );
				}
				if (!wasInViewport && !this.isInViewport) {
					triggerCallbackArray( this.callbacks[ENTERVIEWPORT] );
					triggerCallbackArray( this.callbacks[EXITVIEWPORT] );
				}
			}

			if (!this.isFullyInViewport && wasFullyInViewport) {
				triggerCallbackArray( this.callbacks[PARTIALLYEXITVIEWPORT] );
			}
			if (!this.isInViewport && wasInViewport) {
				triggerCallbackArray( this.callbacks[EXITVIEWPORT] );
			}
			if (this.isInViewport !== wasInViewport) {
				triggerCallbackArray( this.callbacks[VISIBILITYCHANGE] );
			}
			switch( true ) {
				case wasInViewport !== this.isInViewport:
				case wasFullyInViewport !== this.isFullyInViewport:
				case wasAboveViewport !== this.isAboveViewport:
				case wasBelowViewport !== this.isBelowViewport:
					triggerCallbackArray( this.callbacks[STATECHANGE] );
			}

			wasInViewport = this.isInViewport;
			wasFullyInViewport = this.isFullyInViewport;
			wasAboveViewport = this.isAboveViewport;
			wasBelowViewport = this.isBelowViewport;

		};

		this.recalculateLocation = function() {
			if (this.locked) {
				return;
			}
			var previousTop = this.top;
			var previousBottom = this.bottom;
			if (this.watchItem.nodeName) { // a dom element
				var cachedDisplay = this.watchItem.style.display;
				if (cachedDisplay === 'none') {
					this.watchItem.style.display = '';
				}

				var boundingRect = this.watchItem.getBoundingClientRect();
				this.top = boundingRect.top + exports.viewportTop;
				this.bottom = boundingRect.bottom + exports.viewportTop;

				if (cachedDisplay === 'none') {
					this.watchItem.style.display = cachedDisplay;
				}

			} else if (this.watchItem === +this.watchItem) { // number
				if (this.watchItem > 0) {
					this.top = this.bottom = this.watchItem;
				} else {
					this.top = this.bottom = exports.documentHeight - this.watchItem;
				}

			} else { // an object with a top and bottom property
				this.top = this.watchItem.top;
				this.bottom = this.watchItem.bottom;
			}

			this.top -= this.offsets.top;
			this.bottom += this.offsets.bottom;
			this.height = this.bottom - this.top;

			if ( (previousTop !== undefined || previousBottom !== undefined) && (this.top !== previousTop || this.bottom !== previousBottom) ) {
				triggerCallbackArray( this.callbacks[LOCATIONCHANGE] );
			}
		};

		this.recalculateLocation();
		this.update();

		wasInViewport = this.isInViewport;
		wasFullyInViewport = this.isFullyInViewport;
		wasAboveViewport = this.isAboveViewport;
		wasBelowViewport = this.isBelowViewport;
	}

	ElementWatcher.prototype = {
		on: function( event, callback, isOne ) {

			// trigger the event if it applies to the element right now.
			switch( true ) {
				case event === VISIBILITYCHANGE && !this.isInViewport && this.isAboveViewport:
				case event === ENTERVIEWPORT && this.isInViewport:
				case event === FULLYENTERVIEWPORT && this.isFullyInViewport:
				case event === EXITVIEWPORT && this.isAboveViewport && !this.isInViewport:
				case event === PARTIALLYEXITVIEWPORT && this.isAboveViewport:
					callback.call( this, latestEvent );
					if (isOne) {
						return;
					}
			}

			if (this.callbacks[event]) {
				this.callbacks[event].push({callback: callback, isOne: isOne||false});
			} else {
				throw new Error('Tried to add a scroll monitor listener of type '+event+'. Your options are: '+eventTypes.join(', '));
			}
		},
		off: function( event, callback ) {
			if (this.callbacks[event]) {
				for (var i = 0, item; item = this.callbacks[event][i]; i++) {
					if (item.callback === callback) {
						this.callbacks[event].splice(i, 1);
						break;
					}
				}
			} else {
				throw new Error('Tried to remove a scroll monitor listener of type '+event+'. Your options are: '+eventTypes.join(', '));
			}
		},
		one: function( event, callback ) {
			this.on( event, callback, true);
		},
		recalculateSize: function() {
			this.height = this.watchItem.offsetHeight + this.offsets.top + this.offsets.bottom;
			this.bottom = this.top + this.height;
		},
		update: function() {
			this.isAboveViewport = this.top < exports.viewportTop;
			this.isBelowViewport = this.bottom > exports.viewportBottom;

			this.isInViewport = (this.top <= exports.viewportBottom && this.bottom >= exports.viewportTop);
			this.isFullyInViewport = (this.top >= exports.viewportTop && this.bottom <= exports.viewportBottom) ||
								 (this.isAboveViewport && this.isBelowViewport);

		},
		destroy: function() {
			var index = watchers.indexOf(this),
				self  = this;
			watchers.splice(index, 1);
			for (var i = 0, j = eventTypes.length; i < j; i++) {
				self.callbacks[eventTypes[i]].length = 0;
			}
		},
		// prevent recalculating the element location
		lock: function() {
			this.locked = true;
		},
		unlock: function() {
			this.locked = false;
		}
	};

	var eventHandlerFactory = function (type) {
		return function( callback, isOne ) {
			this.on.call(this, type, callback, isOne);
		};
	};

	for (var i = 0, j = eventTypes.length; i < j; i++) {
		var type =  eventTypes[i];
		ElementWatcher.prototype[type] = eventHandlerFactory(type);
	}

	try {
		calculateViewport();
	} catch (e) {
		try {
			window.$(calculateViewport);
		} catch (e) {
			throw new Error('If you must put scrollMonitor in the <head>, you must use jQuery.');
		}
	}

	function scrollMonitorListener(event) {
		latestEvent = event;
		calculateViewport();
		updateAndTriggerWatchers();
	}

	if (window.addEventListener) {
		window.addEventListener('scroll', scrollMonitorListener);
		window.addEventListener('resize', debouncedRecalcuateAndTrigger);
	} else {
		// Old IE support
		window.attachEvent('onscroll', scrollMonitorListener);
		window.attachEvent('onresize', debouncedRecalcuateAndTrigger);
	}

	exports.beget = exports.create = function( element, offsets ) {
		if (typeof element === 'string') {
			element = document.querySelector(element);
		} else if (element && element.length > 0) {
			element = element[0];
		}

		var watcher = new ElementWatcher( element, offsets );
		watchers.push(watcher);
		watcher.update();
		return watcher;
	};

	exports.update = function() {
		latestEvent = null;
		calculateViewport();
		updateAndTriggerWatchers();
	};
	exports.recalculateLocations = function() {
		exports.documentHeight = 0;
		exports.update();
	};

	return exports;
});

},{}],2:[function(require,module,exports){
var scrollMonitor = require('scrollMonitor')

/**
 * Image Loading
 */
function loadImages () {
  var imgs = document.querySelectorAll('img[data-src]')
  for (var i = 0; i < imgs.length; i++) {
    watchImage(imgs[i])
  }
}

/** 
 * Watch Image
 */
function watchImage (img) {
  var watcher = scrollMonitor.create(img, window.innerHeight/2)

  var loadImg = function loadImg () {
    if (img.hasAttribute('data-src')) {
      img.setAttribute('src', img.getAttribute('data-src'))
      img.removeAttribute('data-src')
    }
  }

  watcher.enterViewport(loadImg)
}

loadImages()
},{"scrollMonitor":1}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvc2Nyb2xsTW9uaXRvci9zY3JvbGxNb25pdG9yLmpzIiwicHVibGljL19zb3VyY2UvbWFpbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIihmdW5jdGlvbiggZmFjdG9yeSApIHtcblx0aWYgKHR5cGVvZiBkZWZpbmUgIT09ICd1bmRlZmluZWQnICYmIGRlZmluZS5hbWQpIHtcblx0XHRkZWZpbmUoW10sIGZhY3RvcnkpO1xuXHR9IGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSB7XG5cdFx0bW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG5cdH0gZWxzZSB7XG5cdFx0d2luZG93LnNjcm9sbE1vbml0b3IgPSBmYWN0b3J5KCk7XG5cdH1cbn0pKGZ1bmN0aW9uKCkge1xuXG5cdHZhciBzY3JvbGxUb3AgPSBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gd2luZG93LnBhZ2VZT2Zmc2V0IHx8XG5cdFx0XHQoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50ICYmIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3ApIHx8XG5cdFx0XHRkb2N1bWVudC5ib2R5LnNjcm9sbFRvcDtcblx0fTtcblxuXHR2YXIgZXhwb3J0cyA9IHt9O1xuXG5cdHZhciB3YXRjaGVycyA9IFtdO1xuXG5cdHZhciBWSVNJQklMSVRZQ0hBTkdFID0gJ3Zpc2liaWxpdHlDaGFuZ2UnO1xuXHR2YXIgRU5URVJWSUVXUE9SVCA9ICdlbnRlclZpZXdwb3J0Jztcblx0dmFyIEZVTExZRU5URVJWSUVXUE9SVCA9ICdmdWxseUVudGVyVmlld3BvcnQnO1xuXHR2YXIgRVhJVFZJRVdQT1JUID0gJ2V4aXRWaWV3cG9ydCc7XG5cdHZhciBQQVJUSUFMTFlFWElUVklFV1BPUlQgPSAncGFydGlhbGx5RXhpdFZpZXdwb3J0Jztcblx0dmFyIExPQ0FUSU9OQ0hBTkdFID0gJ2xvY2F0aW9uQ2hhbmdlJztcblx0dmFyIFNUQVRFQ0hBTkdFID0gJ3N0YXRlQ2hhbmdlJztcblxuXHR2YXIgZXZlbnRUeXBlcyA9IFtcblx0XHRWSVNJQklMSVRZQ0hBTkdFLFxuXHRcdEVOVEVSVklFV1BPUlQsXG5cdFx0RlVMTFlFTlRFUlZJRVdQT1JULFxuXHRcdEVYSVRWSUVXUE9SVCxcblx0XHRQQVJUSUFMTFlFWElUVklFV1BPUlQsXG5cdFx0TE9DQVRJT05DSEFOR0UsXG5cdFx0U1RBVEVDSEFOR0Vcblx0XTtcblxuXHR2YXIgZGVmYXVsdE9mZnNldHMgPSB7dG9wOiAwLCBib3R0b206IDB9O1xuXG5cdHZhciBnZXRWaWV3cG9ydEhlaWdodCA9IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB3aW5kb3cuaW5uZXJIZWlnaHQgfHwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodDtcblx0fTtcblxuXHR2YXIgZ2V0RG9jdW1lbnRIZWlnaHQgPSBmdW5jdGlvbigpIHtcblx0XHQvLyBqUXVlcnkgYXBwcm9hY2hcblx0XHQvLyB3aGljaGV2ZXIgaXMgZ3JlYXRlc3Rcblx0XHRyZXR1cm4gTWF0aC5tYXgoXG5cdFx0XHRkb2N1bWVudC5ib2R5LnNjcm9sbEhlaWdodCwgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbEhlaWdodCxcblx0XHRcdGRvY3VtZW50LmJvZHkub2Zmc2V0SGVpZ2h0LCBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQub2Zmc2V0SGVpZ2h0LFxuXHRcdFx0ZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsaWVudEhlaWdodFxuXHRcdCk7XG5cdH07XG5cblx0ZXhwb3J0cy52aWV3cG9ydFRvcCA9IG51bGw7XG5cdGV4cG9ydHMudmlld3BvcnRCb3R0b20gPSBudWxsO1xuXHRleHBvcnRzLmRvY3VtZW50SGVpZ2h0ID0gbnVsbDtcblx0ZXhwb3J0cy52aWV3cG9ydEhlaWdodCA9IGdldFZpZXdwb3J0SGVpZ2h0KCk7XG5cblx0dmFyIHByZXZpb3VzRG9jdW1lbnRIZWlnaHQ7XG5cdHZhciBsYXRlc3RFdmVudDtcblxuXHR2YXIgY2FsY3VsYXRlVmlld3BvcnRJO1xuXHRmdW5jdGlvbiBjYWxjdWxhdGVWaWV3cG9ydCgpIHtcblx0XHRleHBvcnRzLnZpZXdwb3J0VG9wID0gc2Nyb2xsVG9wKCk7XG5cdFx0ZXhwb3J0cy52aWV3cG9ydEJvdHRvbSA9IGV4cG9ydHMudmlld3BvcnRUb3AgKyBleHBvcnRzLnZpZXdwb3J0SGVpZ2h0O1xuXHRcdGV4cG9ydHMuZG9jdW1lbnRIZWlnaHQgPSBnZXREb2N1bWVudEhlaWdodCgpO1xuXHRcdGlmIChleHBvcnRzLmRvY3VtZW50SGVpZ2h0ICE9PSBwcmV2aW91c0RvY3VtZW50SGVpZ2h0KSB7XG5cdFx0XHRjYWxjdWxhdGVWaWV3cG9ydEkgPSB3YXRjaGVycy5sZW5ndGg7XG5cdFx0XHR3aGlsZSggY2FsY3VsYXRlVmlld3BvcnRJLS0gKSB7XG5cdFx0XHRcdHdhdGNoZXJzW2NhbGN1bGF0ZVZpZXdwb3J0SV0ucmVjYWxjdWxhdGVMb2NhdGlvbigpO1xuXHRcdFx0fVxuXHRcdFx0cHJldmlvdXNEb2N1bWVudEhlaWdodCA9IGV4cG9ydHMuZG9jdW1lbnRIZWlnaHQ7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gcmVjYWxjdWxhdGVXYXRjaExvY2F0aW9uc0FuZFRyaWdnZXIoKSB7XG5cdFx0ZXhwb3J0cy52aWV3cG9ydEhlaWdodCA9IGdldFZpZXdwb3J0SGVpZ2h0KCk7XG5cdFx0Y2FsY3VsYXRlVmlld3BvcnQoKTtcblx0XHR1cGRhdGVBbmRUcmlnZ2VyV2F0Y2hlcnMoKTtcblx0fVxuXG5cdHZhciByZWNhbGN1bGF0ZUFuZFRyaWdnZXJUaW1lcjtcblx0ZnVuY3Rpb24gZGVib3VuY2VkUmVjYWxjdWF0ZUFuZFRyaWdnZXIoKSB7XG5cdFx0Y2xlYXJUaW1lb3V0KHJlY2FsY3VsYXRlQW5kVHJpZ2dlclRpbWVyKTtcblx0XHRyZWNhbGN1bGF0ZUFuZFRyaWdnZXJUaW1lciA9IHNldFRpbWVvdXQoIHJlY2FsY3VsYXRlV2F0Y2hMb2NhdGlvbnNBbmRUcmlnZ2VyLCAxMDAgKTtcblx0fVxuXG5cdHZhciB1cGRhdGVBbmRUcmlnZ2VyV2F0Y2hlcnNJO1xuXHRmdW5jdGlvbiB1cGRhdGVBbmRUcmlnZ2VyV2F0Y2hlcnMoKSB7XG5cdFx0Ly8gdXBkYXRlIGFsbCB3YXRjaGVycyB0aGVuIHRyaWdnZXIgdGhlIGV2ZW50cyBzbyBvbmUgY2FuIHJlbHkgb24gYW5vdGhlciBiZWluZyB1cCB0byBkYXRlLlxuXHRcdHVwZGF0ZUFuZFRyaWdnZXJXYXRjaGVyc0kgPSB3YXRjaGVycy5sZW5ndGg7XG5cdFx0d2hpbGUoIHVwZGF0ZUFuZFRyaWdnZXJXYXRjaGVyc0ktLSApIHtcblx0XHRcdHdhdGNoZXJzW3VwZGF0ZUFuZFRyaWdnZXJXYXRjaGVyc0ldLnVwZGF0ZSgpO1xuXHRcdH1cblxuXHRcdHVwZGF0ZUFuZFRyaWdnZXJXYXRjaGVyc0kgPSB3YXRjaGVycy5sZW5ndGg7XG5cdFx0d2hpbGUoIHVwZGF0ZUFuZFRyaWdnZXJXYXRjaGVyc0ktLSApIHtcblx0XHRcdHdhdGNoZXJzW3VwZGF0ZUFuZFRyaWdnZXJXYXRjaGVyc0ldLnRyaWdnZXJDYWxsYmFja3MoKTtcblx0XHR9XG5cblx0fVxuXG5cdGZ1bmN0aW9uIEVsZW1lbnRXYXRjaGVyKCB3YXRjaEl0ZW0sIG9mZnNldHMgKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0dGhpcy53YXRjaEl0ZW0gPSB3YXRjaEl0ZW07XG5cblx0XHRpZiAoIW9mZnNldHMpIHtcblx0XHRcdHRoaXMub2Zmc2V0cyA9IGRlZmF1bHRPZmZzZXRzO1xuXHRcdH0gZWxzZSBpZiAob2Zmc2V0cyA9PT0gK29mZnNldHMpIHtcblx0XHRcdHRoaXMub2Zmc2V0cyA9IHt0b3A6IG9mZnNldHMsIGJvdHRvbTogb2Zmc2V0c307XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRoaXMub2Zmc2V0cyA9IHtcblx0XHRcdFx0dG9wOiBvZmZzZXRzLnRvcCB8fCBkZWZhdWx0T2Zmc2V0cy50b3AsXG5cdFx0XHRcdGJvdHRvbTogb2Zmc2V0cy5ib3R0b20gfHwgZGVmYXVsdE9mZnNldHMuYm90dG9tXG5cdFx0XHR9O1xuXHRcdH1cblxuXHRcdHRoaXMuY2FsbGJhY2tzID0ge307IC8vIHtjYWxsYmFjazogZnVuY3Rpb24sIGlzT25lOiB0cnVlIH1cblxuXHRcdGZvciAodmFyIGkgPSAwLCBqID0gZXZlbnRUeXBlcy5sZW5ndGg7IGkgPCBqOyBpKyspIHtcblx0XHRcdHNlbGYuY2FsbGJhY2tzW2V2ZW50VHlwZXNbaV1dID0gW107XG5cdFx0fVxuXG5cdFx0dGhpcy5sb2NrZWQgPSBmYWxzZTtcblxuXHRcdHZhciB3YXNJblZpZXdwb3J0O1xuXHRcdHZhciB3YXNGdWxseUluVmlld3BvcnQ7XG5cdFx0dmFyIHdhc0Fib3ZlVmlld3BvcnQ7XG5cdFx0dmFyIHdhc0JlbG93Vmlld3BvcnQ7XG5cblx0XHR2YXIgbGlzdGVuZXJUb1RyaWdnZXJMaXN0STtcblx0XHR2YXIgbGlzdGVuZXI7XG5cdFx0ZnVuY3Rpb24gdHJpZ2dlckNhbGxiYWNrQXJyYXkoIGxpc3RlbmVycyApIHtcblx0XHRcdGlmIChsaXN0ZW5lcnMubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdGxpc3RlbmVyVG9UcmlnZ2VyTGlzdEkgPSBsaXN0ZW5lcnMubGVuZ3RoO1xuXHRcdFx0d2hpbGUoIGxpc3RlbmVyVG9UcmlnZ2VyTGlzdEktLSApIHtcblx0XHRcdFx0bGlzdGVuZXIgPSBsaXN0ZW5lcnNbbGlzdGVuZXJUb1RyaWdnZXJMaXN0SV07XG5cdFx0XHRcdGxpc3RlbmVyLmNhbGxiYWNrLmNhbGwoIHNlbGYsIGxhdGVzdEV2ZW50ICk7XG5cdFx0XHRcdGlmIChsaXN0ZW5lci5pc09uZSkge1xuXHRcdFx0XHRcdGxpc3RlbmVycy5zcGxpY2UobGlzdGVuZXJUb1RyaWdnZXJMaXN0SSwgMSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdFx0dGhpcy50cmlnZ2VyQ2FsbGJhY2tzID0gZnVuY3Rpb24gdHJpZ2dlckNhbGxiYWNrcygpIHtcblxuXHRcdFx0aWYgKHRoaXMuaXNJblZpZXdwb3J0ICYmICF3YXNJblZpZXdwb3J0KSB7XG5cdFx0XHRcdHRyaWdnZXJDYWxsYmFja0FycmF5KCB0aGlzLmNhbGxiYWNrc1tFTlRFUlZJRVdQT1JUXSApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKHRoaXMuaXNGdWxseUluVmlld3BvcnQgJiYgIXdhc0Z1bGx5SW5WaWV3cG9ydCkge1xuXHRcdFx0XHR0cmlnZ2VyQ2FsbGJhY2tBcnJheSggdGhpcy5jYWxsYmFja3NbRlVMTFlFTlRFUlZJRVdQT1JUXSApO1xuXHRcdFx0fVxuXG5cblx0XHRcdGlmICh0aGlzLmlzQWJvdmVWaWV3cG9ydCAhPT0gd2FzQWJvdmVWaWV3cG9ydCAmJlxuXHRcdFx0XHR0aGlzLmlzQmVsb3dWaWV3cG9ydCAhPT0gd2FzQmVsb3dWaWV3cG9ydCkge1xuXG5cdFx0XHRcdHRyaWdnZXJDYWxsYmFja0FycmF5KCB0aGlzLmNhbGxiYWNrc1tWSVNJQklMSVRZQ0hBTkdFXSApO1xuXG5cdFx0XHRcdC8vIGlmIHlvdSBza2lwIGNvbXBsZXRlbHkgcGFzdCB0aGlzIGVsZW1lbnRcblx0XHRcdFx0aWYgKCF3YXNGdWxseUluVmlld3BvcnQgJiYgIXRoaXMuaXNGdWxseUluVmlld3BvcnQpIHtcblx0XHRcdFx0XHR0cmlnZ2VyQ2FsbGJhY2tBcnJheSggdGhpcy5jYWxsYmFja3NbRlVMTFlFTlRFUlZJRVdQT1JUXSApO1xuXHRcdFx0XHRcdHRyaWdnZXJDYWxsYmFja0FycmF5KCB0aGlzLmNhbGxiYWNrc1tQQVJUSUFMTFlFWElUVklFV1BPUlRdICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCF3YXNJblZpZXdwb3J0ICYmICF0aGlzLmlzSW5WaWV3cG9ydCkge1xuXHRcdFx0XHRcdHRyaWdnZXJDYWxsYmFja0FycmF5KCB0aGlzLmNhbGxiYWNrc1tFTlRFUlZJRVdQT1JUXSApO1xuXHRcdFx0XHRcdHRyaWdnZXJDYWxsYmFja0FycmF5KCB0aGlzLmNhbGxiYWNrc1tFWElUVklFV1BPUlRdICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCF0aGlzLmlzRnVsbHlJblZpZXdwb3J0ICYmIHdhc0Z1bGx5SW5WaWV3cG9ydCkge1xuXHRcdFx0XHR0cmlnZ2VyQ2FsbGJhY2tBcnJheSggdGhpcy5jYWxsYmFja3NbUEFSVElBTExZRVhJVFZJRVdQT1JUXSApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCF0aGlzLmlzSW5WaWV3cG9ydCAmJiB3YXNJblZpZXdwb3J0KSB7XG5cdFx0XHRcdHRyaWdnZXJDYWxsYmFja0FycmF5KCB0aGlzLmNhbGxiYWNrc1tFWElUVklFV1BPUlRdICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAodGhpcy5pc0luVmlld3BvcnQgIT09IHdhc0luVmlld3BvcnQpIHtcblx0XHRcdFx0dHJpZ2dlckNhbGxiYWNrQXJyYXkoIHRoaXMuY2FsbGJhY2tzW1ZJU0lCSUxJVFlDSEFOR0VdICk7XG5cdFx0XHR9XG5cdFx0XHRzd2l0Y2goIHRydWUgKSB7XG5cdFx0XHRcdGNhc2Ugd2FzSW5WaWV3cG9ydCAhPT0gdGhpcy5pc0luVmlld3BvcnQ6XG5cdFx0XHRcdGNhc2Ugd2FzRnVsbHlJblZpZXdwb3J0ICE9PSB0aGlzLmlzRnVsbHlJblZpZXdwb3J0OlxuXHRcdFx0XHRjYXNlIHdhc0Fib3ZlVmlld3BvcnQgIT09IHRoaXMuaXNBYm92ZVZpZXdwb3J0OlxuXHRcdFx0XHRjYXNlIHdhc0JlbG93Vmlld3BvcnQgIT09IHRoaXMuaXNCZWxvd1ZpZXdwb3J0OlxuXHRcdFx0XHRcdHRyaWdnZXJDYWxsYmFja0FycmF5KCB0aGlzLmNhbGxiYWNrc1tTVEFURUNIQU5HRV0gKTtcblx0XHRcdH1cblxuXHRcdFx0d2FzSW5WaWV3cG9ydCA9IHRoaXMuaXNJblZpZXdwb3J0O1xuXHRcdFx0d2FzRnVsbHlJblZpZXdwb3J0ID0gdGhpcy5pc0Z1bGx5SW5WaWV3cG9ydDtcblx0XHRcdHdhc0Fib3ZlVmlld3BvcnQgPSB0aGlzLmlzQWJvdmVWaWV3cG9ydDtcblx0XHRcdHdhc0JlbG93Vmlld3BvcnQgPSB0aGlzLmlzQmVsb3dWaWV3cG9ydDtcblxuXHRcdH07XG5cblx0XHR0aGlzLnJlY2FsY3VsYXRlTG9jYXRpb24gPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmICh0aGlzLmxvY2tlZCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR2YXIgcHJldmlvdXNUb3AgPSB0aGlzLnRvcDtcblx0XHRcdHZhciBwcmV2aW91c0JvdHRvbSA9IHRoaXMuYm90dG9tO1xuXHRcdFx0aWYgKHRoaXMud2F0Y2hJdGVtLm5vZGVOYW1lKSB7IC8vIGEgZG9tIGVsZW1lbnRcblx0XHRcdFx0dmFyIGNhY2hlZERpc3BsYXkgPSB0aGlzLndhdGNoSXRlbS5zdHlsZS5kaXNwbGF5O1xuXHRcdFx0XHRpZiAoY2FjaGVkRGlzcGxheSA9PT0gJ25vbmUnKSB7XG5cdFx0XHRcdFx0dGhpcy53YXRjaEl0ZW0uc3R5bGUuZGlzcGxheSA9ICcnO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIGJvdW5kaW5nUmVjdCA9IHRoaXMud2F0Y2hJdGVtLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXHRcdFx0XHR0aGlzLnRvcCA9IGJvdW5kaW5nUmVjdC50b3AgKyBleHBvcnRzLnZpZXdwb3J0VG9wO1xuXHRcdFx0XHR0aGlzLmJvdHRvbSA9IGJvdW5kaW5nUmVjdC5ib3R0b20gKyBleHBvcnRzLnZpZXdwb3J0VG9wO1xuXG5cdFx0XHRcdGlmIChjYWNoZWREaXNwbGF5ID09PSAnbm9uZScpIHtcblx0XHRcdFx0XHR0aGlzLndhdGNoSXRlbS5zdHlsZS5kaXNwbGF5ID0gY2FjaGVkRGlzcGxheTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9IGVsc2UgaWYgKHRoaXMud2F0Y2hJdGVtID09PSArdGhpcy53YXRjaEl0ZW0pIHsgLy8gbnVtYmVyXG5cdFx0XHRcdGlmICh0aGlzLndhdGNoSXRlbSA+IDApIHtcblx0XHRcdFx0XHR0aGlzLnRvcCA9IHRoaXMuYm90dG9tID0gdGhpcy53YXRjaEl0ZW07XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy50b3AgPSB0aGlzLmJvdHRvbSA9IGV4cG9ydHMuZG9jdW1lbnRIZWlnaHQgLSB0aGlzLndhdGNoSXRlbTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9IGVsc2UgeyAvLyBhbiBvYmplY3Qgd2l0aCBhIHRvcCBhbmQgYm90dG9tIHByb3BlcnR5XG5cdFx0XHRcdHRoaXMudG9wID0gdGhpcy53YXRjaEl0ZW0udG9wO1xuXHRcdFx0XHR0aGlzLmJvdHRvbSA9IHRoaXMud2F0Y2hJdGVtLmJvdHRvbTtcblx0XHRcdH1cblxuXHRcdFx0dGhpcy50b3AgLT0gdGhpcy5vZmZzZXRzLnRvcDtcblx0XHRcdHRoaXMuYm90dG9tICs9IHRoaXMub2Zmc2V0cy5ib3R0b207XG5cdFx0XHR0aGlzLmhlaWdodCA9IHRoaXMuYm90dG9tIC0gdGhpcy50b3A7XG5cblx0XHRcdGlmICggKHByZXZpb3VzVG9wICE9PSB1bmRlZmluZWQgfHwgcHJldmlvdXNCb3R0b20gIT09IHVuZGVmaW5lZCkgJiYgKHRoaXMudG9wICE9PSBwcmV2aW91c1RvcCB8fCB0aGlzLmJvdHRvbSAhPT0gcHJldmlvdXNCb3R0b20pICkge1xuXHRcdFx0XHR0cmlnZ2VyQ2FsbGJhY2tBcnJheSggdGhpcy5jYWxsYmFja3NbTE9DQVRJT05DSEFOR0VdICk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMucmVjYWxjdWxhdGVMb2NhdGlvbigpO1xuXHRcdHRoaXMudXBkYXRlKCk7XG5cblx0XHR3YXNJblZpZXdwb3J0ID0gdGhpcy5pc0luVmlld3BvcnQ7XG5cdFx0d2FzRnVsbHlJblZpZXdwb3J0ID0gdGhpcy5pc0Z1bGx5SW5WaWV3cG9ydDtcblx0XHR3YXNBYm92ZVZpZXdwb3J0ID0gdGhpcy5pc0Fib3ZlVmlld3BvcnQ7XG5cdFx0d2FzQmVsb3dWaWV3cG9ydCA9IHRoaXMuaXNCZWxvd1ZpZXdwb3J0O1xuXHR9XG5cblx0RWxlbWVudFdhdGNoZXIucHJvdG90eXBlID0ge1xuXHRcdG9uOiBmdW5jdGlvbiggZXZlbnQsIGNhbGxiYWNrLCBpc09uZSApIHtcblxuXHRcdFx0Ly8gdHJpZ2dlciB0aGUgZXZlbnQgaWYgaXQgYXBwbGllcyB0byB0aGUgZWxlbWVudCByaWdodCBub3cuXG5cdFx0XHRzd2l0Y2goIHRydWUgKSB7XG5cdFx0XHRcdGNhc2UgZXZlbnQgPT09IFZJU0lCSUxJVFlDSEFOR0UgJiYgIXRoaXMuaXNJblZpZXdwb3J0ICYmIHRoaXMuaXNBYm92ZVZpZXdwb3J0OlxuXHRcdFx0XHRjYXNlIGV2ZW50ID09PSBFTlRFUlZJRVdQT1JUICYmIHRoaXMuaXNJblZpZXdwb3J0OlxuXHRcdFx0XHRjYXNlIGV2ZW50ID09PSBGVUxMWUVOVEVSVklFV1BPUlQgJiYgdGhpcy5pc0Z1bGx5SW5WaWV3cG9ydDpcblx0XHRcdFx0Y2FzZSBldmVudCA9PT0gRVhJVFZJRVdQT1JUICYmIHRoaXMuaXNBYm92ZVZpZXdwb3J0ICYmICF0aGlzLmlzSW5WaWV3cG9ydDpcblx0XHRcdFx0Y2FzZSBldmVudCA9PT0gUEFSVElBTExZRVhJVFZJRVdQT1JUICYmIHRoaXMuaXNBYm92ZVZpZXdwb3J0OlxuXHRcdFx0XHRcdGNhbGxiYWNrLmNhbGwoIHRoaXMsIGxhdGVzdEV2ZW50ICk7XG5cdFx0XHRcdFx0aWYgKGlzT25lKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAodGhpcy5jYWxsYmFja3NbZXZlbnRdKSB7XG5cdFx0XHRcdHRoaXMuY2FsbGJhY2tzW2V2ZW50XS5wdXNoKHtjYWxsYmFjazogY2FsbGJhY2ssIGlzT25lOiBpc09uZXx8ZmFsc2V9KTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignVHJpZWQgdG8gYWRkIGEgc2Nyb2xsIG1vbml0b3IgbGlzdGVuZXIgb2YgdHlwZSAnK2V2ZW50KycuIFlvdXIgb3B0aW9ucyBhcmU6ICcrZXZlbnRUeXBlcy5qb2luKCcsICcpKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdG9mZjogZnVuY3Rpb24oIGV2ZW50LCBjYWxsYmFjayApIHtcblx0XHRcdGlmICh0aGlzLmNhbGxiYWNrc1tldmVudF0pIHtcblx0XHRcdFx0Zm9yICh2YXIgaSA9IDAsIGl0ZW07IGl0ZW0gPSB0aGlzLmNhbGxiYWNrc1tldmVudF1baV07IGkrKykge1xuXHRcdFx0XHRcdGlmIChpdGVtLmNhbGxiYWNrID09PSBjYWxsYmFjaykge1xuXHRcdFx0XHRcdFx0dGhpcy5jYWxsYmFja3NbZXZlbnRdLnNwbGljZShpLCAxKTtcblx0XHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKCdUcmllZCB0byByZW1vdmUgYSBzY3JvbGwgbW9uaXRvciBsaXN0ZW5lciBvZiB0eXBlICcrZXZlbnQrJy4gWW91ciBvcHRpb25zIGFyZTogJytldmVudFR5cGVzLmpvaW4oJywgJykpO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0b25lOiBmdW5jdGlvbiggZXZlbnQsIGNhbGxiYWNrICkge1xuXHRcdFx0dGhpcy5vbiggZXZlbnQsIGNhbGxiYWNrLCB0cnVlKTtcblx0XHR9LFxuXHRcdHJlY2FsY3VsYXRlU2l6ZTogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmhlaWdodCA9IHRoaXMud2F0Y2hJdGVtLm9mZnNldEhlaWdodCArIHRoaXMub2Zmc2V0cy50b3AgKyB0aGlzLm9mZnNldHMuYm90dG9tO1xuXHRcdFx0dGhpcy5ib3R0b20gPSB0aGlzLnRvcCArIHRoaXMuaGVpZ2h0O1xuXHRcdH0sXG5cdFx0dXBkYXRlOiBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMuaXNBYm92ZVZpZXdwb3J0ID0gdGhpcy50b3AgPCBleHBvcnRzLnZpZXdwb3J0VG9wO1xuXHRcdFx0dGhpcy5pc0JlbG93Vmlld3BvcnQgPSB0aGlzLmJvdHRvbSA+IGV4cG9ydHMudmlld3BvcnRCb3R0b207XG5cblx0XHRcdHRoaXMuaXNJblZpZXdwb3J0ID0gKHRoaXMudG9wIDw9IGV4cG9ydHMudmlld3BvcnRCb3R0b20gJiYgdGhpcy5ib3R0b20gPj0gZXhwb3J0cy52aWV3cG9ydFRvcCk7XG5cdFx0XHR0aGlzLmlzRnVsbHlJblZpZXdwb3J0ID0gKHRoaXMudG9wID49IGV4cG9ydHMudmlld3BvcnRUb3AgJiYgdGhpcy5ib3R0b20gPD0gZXhwb3J0cy52aWV3cG9ydEJvdHRvbSkgfHxcblx0XHRcdFx0XHRcdFx0XHQgKHRoaXMuaXNBYm92ZVZpZXdwb3J0ICYmIHRoaXMuaXNCZWxvd1ZpZXdwb3J0KTtcblxuXHRcdH0sXG5cdFx0ZGVzdHJveTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgaW5kZXggPSB3YXRjaGVycy5pbmRleE9mKHRoaXMpLFxuXHRcdFx0XHRzZWxmICA9IHRoaXM7XG5cdFx0XHR3YXRjaGVycy5zcGxpY2UoaW5kZXgsIDEpO1xuXHRcdFx0Zm9yICh2YXIgaSA9IDAsIGogPSBldmVudFR5cGVzLmxlbmd0aDsgaSA8IGo7IGkrKykge1xuXHRcdFx0XHRzZWxmLmNhbGxiYWNrc1tldmVudFR5cGVzW2ldXS5sZW5ndGggPSAwO1xuXHRcdFx0fVxuXHRcdH0sXG5cdFx0Ly8gcHJldmVudCByZWNhbGN1bGF0aW5nIHRoZSBlbGVtZW50IGxvY2F0aW9uXG5cdFx0bG9jazogZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLmxvY2tlZCA9IHRydWU7XG5cdFx0fSxcblx0XHR1bmxvY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5sb2NrZWQgPSBmYWxzZTtcblx0XHR9XG5cdH07XG5cblx0dmFyIGV2ZW50SGFuZGxlckZhY3RvcnkgPSBmdW5jdGlvbiAodHlwZSkge1xuXHRcdHJldHVybiBmdW5jdGlvbiggY2FsbGJhY2ssIGlzT25lICkge1xuXHRcdFx0dGhpcy5vbi5jYWxsKHRoaXMsIHR5cGUsIGNhbGxiYWNrLCBpc09uZSk7XG5cdFx0fTtcblx0fTtcblxuXHRmb3IgKHZhciBpID0gMCwgaiA9IGV2ZW50VHlwZXMubGVuZ3RoOyBpIDwgajsgaSsrKSB7XG5cdFx0dmFyIHR5cGUgPSAgZXZlbnRUeXBlc1tpXTtcblx0XHRFbGVtZW50V2F0Y2hlci5wcm90b3R5cGVbdHlwZV0gPSBldmVudEhhbmRsZXJGYWN0b3J5KHR5cGUpO1xuXHR9XG5cblx0dHJ5IHtcblx0XHRjYWxjdWxhdGVWaWV3cG9ydCgpO1xuXHR9IGNhdGNoIChlKSB7XG5cdFx0dHJ5IHtcblx0XHRcdHdpbmRvdy4kKGNhbGN1bGF0ZVZpZXdwb3J0KTtcblx0XHR9IGNhdGNoIChlKSB7XG5cdFx0XHR0aHJvdyBuZXcgRXJyb3IoJ0lmIHlvdSBtdXN0IHB1dCBzY3JvbGxNb25pdG9yIGluIHRoZSA8aGVhZD4sIHlvdSBtdXN0IHVzZSBqUXVlcnkuJyk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gc2Nyb2xsTW9uaXRvckxpc3RlbmVyKGV2ZW50KSB7XG5cdFx0bGF0ZXN0RXZlbnQgPSBldmVudDtcblx0XHRjYWxjdWxhdGVWaWV3cG9ydCgpO1xuXHRcdHVwZGF0ZUFuZFRyaWdnZXJXYXRjaGVycygpO1xuXHR9XG5cblx0aWYgKHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKSB7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Njcm9sbCcsIHNjcm9sbE1vbml0b3JMaXN0ZW5lcik7XG5cdFx0d2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIGRlYm91bmNlZFJlY2FsY3VhdGVBbmRUcmlnZ2VyKTtcblx0fSBlbHNlIHtcblx0XHQvLyBPbGQgSUUgc3VwcG9ydFxuXHRcdHdpbmRvdy5hdHRhY2hFdmVudCgnb25zY3JvbGwnLCBzY3JvbGxNb25pdG9yTGlzdGVuZXIpO1xuXHRcdHdpbmRvdy5hdHRhY2hFdmVudCgnb25yZXNpemUnLCBkZWJvdW5jZWRSZWNhbGN1YXRlQW5kVHJpZ2dlcik7XG5cdH1cblxuXHRleHBvcnRzLmJlZ2V0ID0gZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbiggZWxlbWVudCwgb2Zmc2V0cyApIHtcblx0XHRpZiAodHlwZW9mIGVsZW1lbnQgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRlbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihlbGVtZW50KTtcblx0XHR9IGVsc2UgaWYgKGVsZW1lbnQgJiYgZWxlbWVudC5sZW5ndGggPiAwKSB7XG5cdFx0XHRlbGVtZW50ID0gZWxlbWVudFswXTtcblx0XHR9XG5cblx0XHR2YXIgd2F0Y2hlciA9IG5ldyBFbGVtZW50V2F0Y2hlciggZWxlbWVudCwgb2Zmc2V0cyApO1xuXHRcdHdhdGNoZXJzLnB1c2god2F0Y2hlcik7XG5cdFx0d2F0Y2hlci51cGRhdGUoKTtcblx0XHRyZXR1cm4gd2F0Y2hlcjtcblx0fTtcblxuXHRleHBvcnRzLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuXHRcdGxhdGVzdEV2ZW50ID0gbnVsbDtcblx0XHRjYWxjdWxhdGVWaWV3cG9ydCgpO1xuXHRcdHVwZGF0ZUFuZFRyaWdnZXJXYXRjaGVycygpO1xuXHR9O1xuXHRleHBvcnRzLnJlY2FsY3VsYXRlTG9jYXRpb25zID0gZnVuY3Rpb24oKSB7XG5cdFx0ZXhwb3J0cy5kb2N1bWVudEhlaWdodCA9IDA7XG5cdFx0ZXhwb3J0cy51cGRhdGUoKTtcblx0fTtcblxuXHRyZXR1cm4gZXhwb3J0cztcbn0pO1xuIiwidmFyIHNjcm9sbE1vbml0b3IgPSByZXF1aXJlKCdzY3JvbGxNb25pdG9yJylcblxuLyoqXG4gKiBJbWFnZSBMb2FkaW5nXG4gKi9cbmZ1bmN0aW9uIGxvYWRJbWFnZXMgKCkge1xuICB2YXIgaW1ncyA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2ltZ1tkYXRhLXNyY10nKVxuICBmb3IgKHZhciBpID0gMDsgaSA8IGltZ3MubGVuZ3RoOyBpKyspIHtcbiAgICB3YXRjaEltYWdlKGltZ3NbaV0pXG4gIH1cbn1cblxuLyoqIFxuICogV2F0Y2ggSW1hZ2VcbiAqL1xuZnVuY3Rpb24gd2F0Y2hJbWFnZSAoaW1nKSB7XG4gIHZhciB3YXRjaGVyID0gc2Nyb2xsTW9uaXRvci5jcmVhdGUoaW1nLCB3aW5kb3cuaW5uZXJIZWlnaHQvMilcblxuICB2YXIgbG9hZEltZyA9IGZ1bmN0aW9uIGxvYWRJbWcgKCkge1xuICAgIGlmIChpbWcuaGFzQXR0cmlidXRlKCdkYXRhLXNyYycpKSB7XG4gICAgICBpbWcuc2V0QXR0cmlidXRlKCdzcmMnLCBpbWcuZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpKVxuICAgICAgaW1nLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1zcmMnKVxuICAgIH1cbiAgfVxuXG4gIHdhdGNoZXIuZW50ZXJWaWV3cG9ydChsb2FkSW1nKVxufVxuXG5sb2FkSW1hZ2VzKCkiXX0=
