var gulp = require( 'gulp' );
var concat = require( 'gulp-concat' );
var config = require( '../config' );

gulp.task( 'concat-polyfills', function () {
    return gulp.src( [ config.paths.src + '/js/polyfills/*.js' ] )
        .pipe( concat( 'polyfills.js' ) )
        .pipe( gulp.dest( config.paths.www_site + '/js/' ) );
} );

gulp.task( 'concat-deps', function () {
    return gulp.src( [
            config.paths.src + '/js/helpers.js',
            config.paths.src + '/js/translit.js'
        ] )
        .pipe( concat( 'helpers.js' ) )
        .pipe( gulp.dest( config.paths.www_site + '/js/' ) );
} );

gulp.task( 'concat', [ 'concat-polyfills', 'concat-deps' ] );