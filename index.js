#!/usr/bin/env node
var program = require('commander')
var EventEmitter = require('events').EventEmitter
var imagesnapjs = require('imagesnapjs')
var harp = require('harp')
var fs = require('fs-extra')
var s3 = require('s3')

var events = new EventEmitter()
var rn = new Date()

var awscredentials = require('./aws-credentials.json')
var options = require('./options.json')

var date = [rn.getMonth() + 1, rn.getDate(), rn.getFullYear()].join('-')
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
  .action(readData)

program
  .command('deploy')
  .description('deploy site to s3')
  .action(deploy)
 
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
function writeData (data) {
  data[date] = {
    image: img,
    time: time
  }

  fs.writeJson(__dirname + '/' + options.publicPath + options.data, data, function (err) {
    if (err) throw err;
    events.emit('data:written')
  })
}

/**
 * Take Photo
 */
function takePhoto () {
  imagesnapjs.capture(__dirname + '/' + options.publicPath + img, { cliflags: '-w 1'}, function(err) {
    if (err) throw err;
    events.emit('photo:taken', img)
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
 * Deploy
 */
function deploy () {
  var client = s3.createClient({
    s3Options: awscredentials,
  })

  var params = {
    localDir: __dirname + '/www/',
    deleteRemoved: true,
    s3Params: {
      Bucket: 'photo.jon-kyle.com'
    },
  };

  var uploader = client.uploadDir(params);

  uploader.on('error', function(err) {
    console.error("unable to sync:", err.stack);
  });

  uploader.on('progress', function() {
    console.log("progress", uploader.progressAmount, uploader.progressTotal);
  });

  uploader.on('end', function() {
    console.log("done uploading");
  });
}

/**
 * Data ready
 */
events.on('data:ready', function (_data) {
  data = _data
  if (! data[date]) {
    takePhoto()
  } else {
    console.log('Photo was already taken today')
  }
})

/**
 * Photo Taken
 */
events.on('photo:taken', function (img) {
  writeData(data)
})

/**
 * Data Written
 */
events.on('data:written', function () {
  compileHarp()
})

/**
 * Harp compiled
 */
events.on('harp:compiled', function () {
  deploy()
})