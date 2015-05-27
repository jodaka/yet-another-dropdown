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

    w._ = _;

}( window, document ) );