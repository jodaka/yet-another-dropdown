var search = ( function () {

    'use strict';

    var fs = require( 'fs' );

    // preload data upon start
    var friends = fs.readFileSync( './src/data/friends.json' );
    var data = ( JSON.parse( friends ) ).response.items;

    /**
     * filtering by domain partial match
     */
    var filterByDomain = function ( el ) {

        var r = new RegExp( this, "i" );
        if ( r.test( el.domain ) ) {
            return true;
        }

        return false;
    };

    /**
     * Handling incoming search requests
     */
    return function ( req, res ) {

        var query = req.query.q;

        if ( typeof query !== 'undefined' ) {

            var result = data.filter( filterByDomain, query );
            var ids = [];
            for ( var i = 0; i < result.length; i++ ) {
                ids.push( result[ i ].id );
            }

            res.end( JSON.stringify( ids ) );
        }

        res.end( "[]" );
    };

}() );


module.exports = search;