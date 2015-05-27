/**
 * Build
 **/

var gulp = require('gulp');
var runSequence = require('run-sequence');

// build for the dev environment
gulp.task('build', function (callback) {
  runSequence(
    'copy',
    callback
  );
});
