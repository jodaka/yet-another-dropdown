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
            var res = '';
            for (var i = 0; i < classes.length; i++) {
                if ( classes[i] !== className ) {
                    res += ' ' + classes[i];
                }
            }
            el.className = res;
        }
    };

    _.eventPreventDefault = function( evt ) {
        if (typeof evt.preventDefault === 'function') {
            evt.preventDefault();
        } else {
            evt.returnValue = false;
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
        if ( el.removeEventListener ) {
            el.removeEventListener( evt, handler );
        } else {
            el.detachEvent( 'on' + evt, handler );
        }
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

    // wrapper to create element and set classname
    _.createElement = function ( element, className ) {
        var el = d.createElement( element );
        el.setAttribute( 'class', className );
        return el;
    };

    /**
     * Damerau-Levenshtein distance calc function.
     * grabbed from http://jsperf.com/damerau-levenshtein-distance
     *
     * @param  {String} source first strin
     * @param  {String} target second string
     * @param  {Number} limit  limit of
     * @return {Number}        distance
     */
    _.damerauLevenshteinDistance = function ( source, target, limit ) {

        var matrix = [];
        for ( var i = 0; i < 64; i++ ) {
            matrix[ i ] = [ i ];
            matrix[ i ].length = 64;
        }

        for ( i = 0; i < 64; i++ ) {
            matrix[ 0 ][ i ] = i;
        }

        var thisLength = source.length,
            thatLength = target.length;

        if ( Math.abs( thisLength - thatLength ) > ( limit || 32 ) ) {
            return limit || 32;
        }

        if ( thisLength === 0 ) return thatLength;
        if ( thatLength === 0 ) return thisLength;

        // Calculate matrix.
        var this_i, that_j, cost, min, t;
        for ( i = 1; i <= thisLength; ++i ) {
            this_i = source[ i - 1 ];

            // Step 4
            for ( var j = 1; j <= thatLength; ++j ) {
                // Check the jagged ld total so far
                if ( i === j && matrix[ i ][ j ] > 4 ) return thisLength;

                that_j = target[ j - 1 ];
                cost = ( this_i === that_j ) ? 0 : 1; // Step 5

                // Calculate the minimum (much faster than Math.min(...)).
                min = matrix[ i - 1 ][ j ] + 1; // Deletion.
                if ( ( t = matrix[ i ][ j - 1 ] + 1 ) < min ) min = t; // Insertion.
                if ( ( t = matrix[ i - 1 ][ j - 1 ] + cost ) < min ) min = t; // Substitution.


                // Update matrix.
                matrix[ i ][ j ] = ( i > 1 && j > 1 && this_i === target[ j - 2 ] && source[ i - 2 ] === that_j && ( t = matrix[ i - 2 ][ j - 2 ] + cost ) < min ) ? t : min; // Transposition.
            }
        }

        return matrix[ thisLength ][ thatLength ];
    };


    /**
     * A basic keymaps convertor EN <--> RU
     * will convert 'fynjy' into 'anton' or 'фтещт' into 'anton'
     *
     * @param  {String}  str   original string to convert
     * @param  {Boolean} isRus if true, will convert RU->EN, otherwise EN->RU
     * @return {String}
     */
    _.toggleKeymap = ( function () {

        // building hashmap to speedup lookups
        var buildKeymap = function () {

            var i, len, keymaps = {};

            var keymappings = {
                'ru': "абвгдеёжзийклмнопрстуфхцчшщъьыэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЬЫЭЮЯ",
                'en': "f,dult`;pbqrkvyjghcnea[wxio]ms'.zF<DULT~:PBQRKVYJGHCNEA{WXIO}MS'>Z"
            };

            // building ru
            keymaps.ru = {};
            for ( i = 0, len = keymappings.ru.length; i < len; i++ ) {
                keymaps.ru[ keymappings.ru[ i ] ] = keymappings.en[ i ];
            }

            // building en
            keymaps.en = {};
            for ( i = 0, len = keymappings.en.length; i < len; i++ ) {
                keymaps.en[ keymappings.en[ i ] ] = keymappings.ru[ i ];
            }

            return keymaps;
        };

        var keymaps = buildKeymap();

        return function ( str, isRus ) {

            var orig = ( isRus ) ? 'ru' : 'en';
            var result = '';

            for ( var i = 0, len = str.length; i < len; i++ ) {

                var letter = keymaps[ orig ][ str[ i ] ];
                result += ( typeof letter !== 'undefined' ) ? letter : str[ i ];
            }

            return result;
        };

    }() );

    // function timedChunk( items, process, context, callback ) {
    //     var todo = items.concat(); //create a clone of the original

    //     setTimeout( function () {

    //         var start = +new Date();

    //         do {
    //             process.call( context, todo.shift() );
    //         } while ( todo.length > 0 && ( +new Date() - start < 50 ) );

    //         if ( todo.length > 0 ) {
    //             setTimeout( arguments.callee, 25 );
    //         } else {
    //             callback( items );
    //         }
    //     }, 25 );
    // }

    // everybody loves globals
    w._ = _;

}( window, document ) );