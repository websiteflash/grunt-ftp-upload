/*
 * grunt-ftp-upload
 * https://github.com/websiteflash/grunt-ftp-upload
 *
 * Dependencies: jsftp
 * Thanks for grunt-ftp-deploy.
 *
 * Copyright (c) 2013 jesse
 * Licensed under the MIT license.
 */
module.exports = function(grunt) {

  'use strict';

  grunt.util = grunt.util || grunt.utils;

  var async = grunt.util.async;
  var log = grunt.log;
  var _ = grunt.util._;
  var file = grunt.file;
  var fs = require('fs');
  var path = require('path');
  var Ftp = require('jsftp');
  var prompt = require('prompt');

  var toTransfer;
  var ftp;
  var localRoot;
  var remoteRoot;
  var currPath;
  var authVals;
  var exclusions;

  // A method for parsing the source location and storing the information into a suitably formated object

  function dirParseSync(startDir, result) {
    var files;
    var i;
    var tmpPath;
    var currFile;

    // initialize the `result` object if it is the first iteration
    if (result === undefined) {
      result = {};
      result[path.sep] = [];
    }

    // check if `startDir` is a valid location
    if (!fs.existsSync(startDir)) {
      grunt.warn(startDir + ' is not an existing location');
    }

    // iterate throught the contents of the `startDir` location of the current iteration
    files = fs.readdirSync(startDir);
    for (i = 0; i < files.length; i++) {
      currFile = startDir + path.sep + files[i];
      if (!file.isMatch({
        matchBase: true
      }, exclusions, currFile)) {
        if (file.isDir(currFile)) {
          tmpPath = path.relative(localRoot, startDir + path.sep + files[i]);
          if (!_.has(result, tmpPath)) {
            result[tmpPath] = [];
          }
          dirParseSync(startDir + path.sep + files[i], result);
        } else {
          tmpPath = path.relative(localRoot, startDir);
          if (!tmpPath.length) {
            tmpPath = path.sep;
          }
          result[tmpPath].push(files[i]);
        }
      }
    }

    return result;
  }

  // 解析上传文件数组

  function fileParseSync(files) {
    var result = {};
    result[path.sep] = [];
    files.forEach(function(f) {
      var output = f.src.filter(function(filepath) {
        // 过滤排除的文件
        if (file.isMatch({
          matchBase: true
        }, exclusions, filepath)) {
          return false;
        }

        if (!grunt.file.exists(filepath)) {
          grunt.log.warn('Source file "' + filepath + '" not found.');
          return false;
        } else {
          return true;
        }
      }).map(function(filepath) {
        result[path.sep].push(filepath);
      });
    });

    return result;
  }

  // A method for changing the remote working directory and creating one if it doesn't already exist

  function ftpCwd(inPath, cb) {
    ftp.raw.cwd(inPath, function(err) {
      if (err) {
        ftp.raw.mkd(inPath, function(err) {
          if (err) {
            log.error('Error creating new remote folder ' + inPath + ' --> ' + err);
            cb(err);
          } else {
            log.ok('New remote folder created ' + inPath.yellow);
            ftpCwd(inPath, cb);
          }
        });
      } else {
        cb(null);
      }
    });
  }

  // A method for uploading a single file

  function ftpPut(inFilename, cb) {
    var fileUrl = '';
    if (/\//.test(inFilename)) {
      fileUrl = inFilename;
      inFilename = inFilename.split('/').slice(-1)[0];
    } else {
      fileUrl = localRoot + path.sep + currPath + path.sep + inFilename;
    }
    var fileData = fs.readFileSync(fileUrl);
    ftp.put(inFilename, fileData, function(err) {
      if (err) {
        log.error('Cannot upload file: ' + inFilename + ' --> ' + err);
        cb(err);
      } else {
        log.ok('Uploaded file: ' + inFilename.green + ' to: ' + ('/' + remoteRoot + '/' + currPath).yellow);
        cb(null);
      }
    });
  }

  // A method that processes a location - changes to a folder and uploads all respective files

  function ftpProcessLocation(inPath, cb) {
    if (!toTransfer[inPath]) {
      cb(new Error('Data for ' + inPath + ' not found'));
    }
    ftpCwd('/' + remoteRoot + '/' + inPath.replace(/\\/gi, '/'), function(err) {
      var files;

      if (err) {
        grunt.warn('Could not switch to remote folder!');
      }

      currPath = inPath;
      files = toTransfer[inPath];
      async.forEach(files, ftpPut, function(err) {
        if (err) {
          grunt.warn('Failed uploading files!');
        }
        cb(null);
      });
    });
  }

  function getAuthByKey(inKey) {
    var tmpStr;
    var retVal = {};

    if (fs.existsSync('.ftppass')) {
      tmpStr = grunt.file.read('.ftppass');
      if (inKey != null && tmpStr.length) retVal = JSON.parse(tmpStr)[inKey];
    }
    return retVal;
  }

  // The main grunt task
  grunt.registerMultiTask('ftp_upload', '一个grunt-ftp-deploy的修改插件，支持按文件上传', function() {
    var done = this.async();

    // Init
    ftp = new Ftp({
      host: this.data.auth.host,
      port: this.data.auth.port
    });

    localRoot = Array.isArray(this.data.src) ? this.data.src[0] : this.data.src;
    remoteRoot = Array.isArray(this.data.dest) ? this.data.dest[0] : this.data.dest;
    authVals = this.data.auth.authKey ? getAuthByKey(this.data.auth.authKey) : getAuthByKey(this.data.auth.host);
    exclusions = this.data.exclusions || [];
    ftp.useList = true;

    // 如果localRoot是路径的话，按原来的逻辑执行，否则当作按文件上传
    if (grunt.file.isDir(localRoot)) {
      toTransfer = dirParseSync(localRoot);
    } else {
      localRoot = '';
      toTransfer = fileParseSync(this.files);
    }

    // Getting all the necessary credentials before we proceed
    var needed = {
      properties: {}
    };
    if (!authVals.username) needed.properties.username = {};
    if (!authVals.password) needed.properties.password = {
      hidden: true
    };
    prompt.get(needed, function(err, result) {
      if (err) {
        grunt.warn('Authentication ' + err);
      }
      if (result.username) authVals.username = result.username;
      if (result.password) authVals.password = result.password;

      // Authentication and main processing of files
      ftp.auth(authVals.username, authVals.password, function(err) {
        var locations = _.keys(toTransfer);
        if (err) {
          grunt.warn('Authentication ' + err);
        }

        // Iterating through all location from the `localRoot` in parallel
        async.forEachSeries(locations, ftpProcessLocation, function() {
          ftp.raw.quit(function(err) {
            if (err) {
              log.error(err);
            } else {
              log.ok('FTP upload done!');
            }
            done();
          });
        });
      });

      if (grunt.errors) {
        return false;
      }
    });
  });
};