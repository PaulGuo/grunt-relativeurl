/*
 * 
 *
 * Copyright (c) 2013 流火
 * Licensed under the MIT license.
 */

var util = require('util');
var fs = require('fs');
var http = require('http');
var ssi = require('./ssi').ssi,
	ssiChunk = require('./ssi').ssiChunk,
	events = require('events'),
	url  = require('url'),
	path = require('path');

var isUtf8 = require('./is-utf8');
var iconv = require('iconv-lite');
var tidy = require('./tidy');
var extract = require('./extract');
var concat = require('./concat').concat;

module.exports = function(grunt) {

	// Please see the Grunt documentation for more information regarding task
	// creation: http://gruntjs.com/creating-tasks

	grunt.registerMultiTask('relativeurl', 'relativeurl.', function() {
		// Merge task-specific and/or target-specific options with these defaults.
		var options = this.options();

		var that = this;
		var pwd = process.cwd();
		this.files.forEach(function(v,k){
			console.log(v.dest);
			var p = v.src[0];
			var bf = read(p);
			var dirname = path.dirname(v.dest);
			var filep = path.join(dirname,path.basename(v.dest,path.extname(v.dest)));

			// 一定是utf8格式的
			var chunk = ssiChunk(p,bf.toString('utf8'));

            //JS、CSS环境自动切换
            //var relative = '';
            //var base ='http://g.tbcdn.cn';

            //if(options.env === 'daily') base = 'http://g.assets.daily.taobao.net';
            //relative = [base, options.group, options.name, options.version + '/'].join('/');

            var relative = options.relative;

            if(options.combo !== true) {
                chunk = chunk.replace(/(\b(src|href|action))="([^"#:]+)"/gi, '$1="' + relative + '$3"');
                // fix replaced links in the form of "relative/../"
                chunk = chunk.replace(/(\b(src|href|action))="(.+\/)?[^\/]+\/\.\.\//gi, '$1="$3');
            } else {
                var scripts = [];
                var styles = [];

                // fix `../file.ext` to `file.ext`
                // chunk = chunk.replace(/\.\.\//igm, '');

                //chunk = chunk.replace(/<script[\s\S]+?src="([^"]+)"><\/script>/igm, function($, $1) {
                chunk = chunk.replace(/<script[^>]+?src="([^"]+)"><\/script>/igm, function($, $1) {
                    if($.match(/http:\/\//igm)) {
                        return $;
                    }

                    scripts.push($1.replace(/(.+\/)?[^\/]+\/\.\.\//igm, '$1'));

                    if(scripts.length === 1) {
                        return '<%%%SCRIPT_HOLDER%%%>';
                    }

                    return '';
                });

                //chunk = chunk.replace(/<link[\s\S]+?href="([^"]+?)"\s*\/>/igm, function($, $1) {
                chunk = chunk.replace(/<link[^>]+?href="([^"]+?)"[^>]*\/>/igm, function($, $1) {
                    if($.match(/http:\/\//igm)) {
                        return $;
                    }

                    styles.push($1.replace(/(.+\/)?[^\/]+\/\.\.\//igm, '$1'));

                    if(styles.length === 1) {
                        return '<%%%STYLES_HOLDER%%%>';
                    }

                    return '';
                });

                //console.log(scripts);
                //console.log(styles);

                var combo_script = relative + '??' + scripts.join(',');
                var combo_styles = relative + '??' + styles.join(',');

                chunk = chunk.replace('<%%%SCRIPT_HOLDER%%%>', '<script type="text/javascript" src="' + combo_script + '"></script>');
                chunk = chunk.replace('<%%%STYLES_HOLDER%%%>', '<link rel="stylesheet" href="' + combo_styles + '"/>');
            }

			//Loading "tidy.js" tasks...ERROR
			//>> TypeError: Object #<Object> has no ethod 'charAt'
			//chunk = tidy(chunk);

			if(!(chunk instanceof Buffer)){
				chunk = new Buffer(chunk);
			}
			if(options.encoding == 'gbk'){
				chunk = iconv.encode(iconv.decode(chunk, 'utf8'),'gbk');
			}

			fs.writeFileSync(v.dest,chunk);
			
		});
		return;
	});

};


function consoleColor(str,num){
	if (!num) {
		num = '32';
	}
	return "\033[" + num +"m" + str + "\033[0m";
}

function green(str){
	return consoleColor(str,32);
}

function yellow(str){
	return consoleColor(str,33);
}

function red(str){
	return consoleColor(str,31);
}

function blue(str){
	return consoleColor(str,34);
}

function log(statCode, url, err) {
  var logStr = blue(statCode) + ' - ' + url ;
  if (err)
    logStr += ' - ' + red(err);
  console.log(logStr);
}

function getDirFiles(dir){
	var files = fs.readdirSync(dir);
	var res_f = []; 
	var res_d = [];
	var r = '';
	files.forEach(function(file){
		var stat = fs.lstatSync(path.resolve(dir,file));

		if (!stat.isDirectory()){
			res_f.push(file);
		} else {
			res_d.push(file);
		}   
	});

	
	r += '<p><img src="http://img02.taobaocdn.com/tps/i2/T1WNlnFadjXXaSQP_X-16-16.png" /> <a href="../">parent dir</a></p><hr size=1 />';

	res_d.forEach(function(file){
		r += '<p><img src="http://img03.taobaocdn.com/tps/i3/T1nHRTFmNXXXaSQP_X-16-16.png" /> <a href="'+file+'/">'+file+'</a></p>';
	});

	res_f.forEach(function(file){
		r += '<p><img src="http://img02.taobaocdn.com/tps/i2/T1Y7tPFg8eXXaSQP_X-16-16.png" /> <a href="'+file+'">'+file+'</a></p>';
	});

	return r;
}

function isDir(dir){
	if(fs.existsSync(dir)){
		var stat = fs.lstatSync(dir);
		return stat.isDirectory();
	} else {
		return false;
	}
}

function isFile(dir){
	if(fs.existsSync(dir)){
		var stat = fs.lstatSync(dir);
		return stat.isFile();
	} else {
		return false;
	}
}

// 得到的一定是utf8编码的buffer
function read(file){
	var fd = fs.readFileSync(file);

	if(isUtf8(fd)){
		var bf = fs.readFileSync(file);
	} else {
		var bf = iconv.encode(iconv.decode(fd, 'gbk'),'utf8');
	}
	return bf;
}

function die(){
	console.log.apply(this,arguments)
	process.exit();
}
