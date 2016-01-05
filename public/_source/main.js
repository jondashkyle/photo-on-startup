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