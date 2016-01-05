var program = require('commander')
var EventEmitter = require('events').EventEmitter
var imagesnapjs = require('imagesnapjs')
var harp = require('harp')
var Twitter = require('twitter')
var fs = require('fs-extra')
var s3 = require('s3')
var im = require('imagemagick')

var events = new EventEmitter()
var rn = new Date()

var credentials = require('./credentials.json')
var options = require('./options.json')

var date = [rn.getFullYear(), rn.getMonth() + 1, rn.getDate()].join('-')
var time = [rn.getHours(), rn.getMinutes(), rn.getSeconds()].join(':')
var img = 'img/' + date + '.jpg'
var data = { }

/**
 * Setup
 */

program
  .version('0.0.1')

program
  .command('snap')
  .description('take photo and upload')
  .action(snap)

program
  .command('deploy')
  .description('deploy site to s3')
  .action(deploy)

program
  .command('twitter')
  .description('Update Twitter profile image with most recent snap')
  .action(twitter)
 
program.parse(process.argv)

/**
 * Read the Data
 */
function readData () {
  fs.readJson(__dirname + '/' + options.publicPath + options.data, function (err, data) {
    if (err) throw err;
    events.emit('data:ready', data)
  })
}

/**
 * Write Data
 */
function writeData () {
  data.unshift({
    date: [rn.getMonth() + 1, rn.getDate(), rn.getFullYear()].join('-'),
    image: img,
    time: time
  })

  fs.writeJson(__dirname + '/' + options.publicPath + options.data, data, function (err) {
    if (err) throw err;
    events.emit('data:written')
  })
}

/**
 * Photo Exists
 */
function photoExists(_date) {
  for(var i = 0, len = data.length; i < len; i++) {
    if (data[i].date === _date){
      return true
    }
  }
  return false
}

/**
 * Take Photo
 */
function takePhoto () {
  var imgPath = __dirname + '/public/' + img
  imagesnapjs.capture(imgPath, {cliflags: '-w 1'}, function(err) {
    if (err) throw err;
    events.emit('photo:taken', {imgPath: imgPath})
  })
}

/**
 * Compile Harp
 */
function compileHarp () {
  harp.compile(__dirname + '/' + options.publicPath, '../www', function (err) {
    if (err) throw err;
    events.emit('harp:compiled')
  })
}


/**
 * Process Photo
 */

function processPhoto (_data) {
  _data = _data || { }
  im.resize({
    srcPath: _data.imgPath,
    dstPath: _data.imgPath,
    quality: 1,
    sharpening: 0.2,
    colorspace: 'Gray',
    height: 480,
    width: 848
  }, function(err, stdout, stderr){
    if (err) throw err;
    console.log('Photo processed')
    events.emit('photo:processed', {imgPath: _data.imgPath})
  })
}

/**
 * Deploy
 */
function deploy () {
  var client = s3.createClient({
    s3Options: credentials.aws,
  })

  var params = {
    localDir: __dirname + '/www/',
    deleteRemoved: true,
    s3Params: {
      Bucket: 'photo.jon-kyle.com'
    }
  }

  var uploader = client.uploadDir(params)

  uploader.on('error', function(err) {
    console.error('unable to sync: ', err.stack)
  })

  uploader.on('end', function() {
    console.log('done uploading')
  })
}

/**
 * Update Twitter Profile Image
 */
function updateTwitter (_data) {
  var client = new Twitter(credentials.twitter)
  var image = fs.readFileSync(_data.imgPath)

  client.post('account/update_profile_image', {
    image: new Buffer(image).toString('base64'),
  }, function(err){
    if (err) throw err;
    console.log('done')
  })
}

/**
 * Update
 */
function snap () {
  events
    .on('data:ready', function (_data) {
      data = _data
      if (! photoExists(date) && parseInt(rn.getHours()) > 5) {
        takePhoto()
      } else {
        console.log('Photo was already taken today')
      }
    })
    .on('photo:taken', processPhoto)
    .on('photo:processed', writeData)
    .on('data:written', compileHarp)
    .on('harp:compiled', function () {
      deploy()
      updateTwitter({imgPath: __dirname + '/public/' + data[0].image})
    })

  readData()
}

/**
 * Twitter
 */
function twitter () {
  events
    .on('data:ready', function (_data) {
      data = _data
      updateTwitter({imgPath: __dirname + '/public/' + data[0].image})
    })

  readData()
}