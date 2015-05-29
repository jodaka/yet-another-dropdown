var express = require( 'express' );
var app = express();
var handleSearch = require( './serverSearch' );

app.use( function ( req, res, next ) {
    res.header( "Access-Control-Allow-Origin", "http://localhost:3000" );
    res.header( 'Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE' );
    res.header( "Access-Control-Allow-Headers", "X-Requested-With, Content-Type" );
    next();
} );

app.get( '/search', handleSearch );

app.get( '/', function ( req, res ) {
    res.send( 'Here be dragons!' );
} );

var server = app.listen( 8881, function () {

    var host = server.address().address;
    var port = server.address().port;

    console.log( 'Example app listening at http://%s:%s', host, port );

} );