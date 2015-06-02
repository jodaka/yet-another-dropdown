
var gulp    = require('gulp');
var config  = require('../config');
var browserSync = require('browser-sync');

gulp.task('copy-js', function() {
    gulp.src(config.paths.src + '/js/dropdown.js')
      .pipe(gulp.dest(config.paths.www_site + '/js/'))
      .pipe(browserSync.reload({stream: true}));
});

gulp.task('copy-styles', function() {
    gulp.src(config.paths.build + '/*.css')
          .pipe(gulp.dest(config.paths.www_site + '/css/'))
          .pipe(browserSync.reload({stream: true}));
});

gulp.task('copy-fonts', function() {
    gulp.src(config.paths.build + '/assets/fonts/*')
          .pipe(gulp.dest(config.paths.www_site + '/fonts/'));
});

gulp.task('copy-html', function() {
    gulp.src(config.paths.src + '/html/*.html')
        .pipe(gulp.dest(config.paths.www_site + '/'))
        .pipe(browserSync.reload({stream: true}));
});


gulp.task('copy',  ['copy-js', 'copy-html', 'copy-styles', 'copy-fonts']);

