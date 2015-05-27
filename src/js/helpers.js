( function ( w, d ) {

    'use strict';

    var _ = {};
    var cache = {};

    /**
     * A simple AJAX GET request wrapped into promise
     *
     * @param  {String} url
     * @return {Promise}
     */
    _.get = function ( url ) {

        var request = new XMLHttpRequest();

        return new Promise( function ( resolve, reject ) {

            if ( typeof cache[ url ] !== 'undefined' ) {
                resolve( cache[ url ] );
                return;
            }

            request.open( 'GET', url, true );
            request.onreadystatechange = function () {

                if ( this.readyState === 4 ) {

                    if ( this.status >= 200 && this.status < 400 ) {

                        cache[ url ] = this.responseText;
                        resolve( this.responseText );

                    } else {
                        reject( this );
                    }
                }
            };

            request.send();
            request = null;

        } );
    };

    _.getJSON = function ( url ) {
        return _.get( url ).then( JSON.parse );
    };

    _.hide = function ( el ) {
        el.style.display = 'none';
    };

    _.show = function ( el ) {
        el.style.display = '';
    };

    _.addClass = function ( el, className ) {
        if ( el.classList ) {
            el.classList.add( className );
        } else {
            el.className += ' ' + className;
        }
    };

    _.removeClass = function ( el, className ) {
        if ( el.classList ) {
            el.classList.remove( className );
        } else {
            var classes = el.className.split( ' ' );
            classes.splice( classes.indexOf( className ), 1 );
            this.className = classes.join( ' ' );
        }
    };

    _.addEventListener = function ( el, evt, handler ) {
        if ( el.addEventListener ) {
            el.addEventListener( evt, handler );
        } else {
            el.attachEvent( 'on' + evt, function () {
                handler.call( el );
            } );
        }
    };

    _.removeEventListener = function ( el, evt, handler ) {
        if ( el.removeEventListener )
            el.removeEventListener( evt, handler );
        else
            el.detachEvent( 'on' + evt, handler );
    };

    /**
     * Run fn only once during duration of the threshold
     *
     * @param  {Fn} fn
     * @param  {Number}
     * @return {Fn}
     */
    _.debounce = function ( fn, threshold ) {

        var timeout = null;

        return function () {

            var self = this;
            var args = arguments;

            var delayed = function () {
                fn.apply( self, args );
                timeout = null;
            };

            if ( timeout ) {
                clearTimeout( timeout );
            }

            timeout = setTimeout( delayed, threshold );
        };
    };

    _.createElement = function ( element, className ) {
        var el = d.createElement( element );
        el.setAttribute( 'class', className );
        return el;
    };

    var matrix = [];
    for ( var i = 0; i < 64; i++ ) {
        matrix[ i ] = [ i ];
        matrix[ i ].length = 64;
    }
    for ( i = 0; i < 64; i++ ) {
        matrix[ 0 ][ i ] = i;
    }

    _.damerauLevenshteinDistance = function ( __this, that, limit ) {
        var thisLength = __this.length,
            thatLength = that.length;

        if ( Math.abs( thisLength - thatLength ) > ( limit || 32 ) ) return limit || 32;
        if ( thisLength === 0 ) return thatLength;
        if ( thatLength === 0 ) return thisLength;

        // Calculate matrix.
        var this_i, that_j, cost, min, t;
        for ( var i = 1; i <= thisLength; ++i ) {
            this_i = __this[ i - 1 ];

            // Step 4
            for (var j = 1; j <= thatLength; ++j ) {
                // Check the jagged ld total so far
                if ( i === j && matrix[ i ][ j ] > 4 ) return thisLength;

                that_j = that[ j - 1 ];
                cost = ( this_i === that_j ) ? 0 : 1; // Step 5
                // Calculate the minimum (much faster than Math.min(...)).
                min = matrix[ i - 1 ][ j ] + 1; // Deletion.
                if ( ( t = matrix[ i ][ j - 1 ] + 1 ) < min ) min = t; // Insertion.
                if ( ( t = matrix[ i - 1 ][ j - 1 ] + cost ) < min ) min = t; // Substitution.


                // Update matrix.
                matrix[ i ][ j ] = ( i > 1 && j > 1 && this_i === that[ j - 2 ] && __this[ i - 2 ] === that_j && ( t = matrix[ i - 2 ][ j - 2 ] + cost ) < min ) ? t : min; // Transposition.
            }
        }

        return matrix[ thisLength ][ thatLength ];
    };

    w._ = _;

}( window, document ) );