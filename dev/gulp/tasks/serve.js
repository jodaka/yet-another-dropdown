/**
 * Serve the site with live reload
 **/

var gulp = require('gulp');
var browserSync = require('browser-sync');
var config = require('../config');

gulp.task('serve', ['copy'], function () {
  browserSync({
    proxy: {
      target: config.local_url
    }
  });

  gulp.watch(config.paths.src + '/css/*.css', ['copy']);
  gulp.watch(config.paths.src + '/js/*.js', ['copy']);
  gulp.watch(config.paths.src + '/html/*.html', ['copy']);
});
