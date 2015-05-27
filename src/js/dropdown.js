( function ( w, d ) {
    'use strict';

    var dropdown = function ( el ) {

        var self = el;

        var settings = {
            'use_avatars': true,
            'multiselect': false
        };

        var search = {
            value: null,
            data: null,
            items: [],
            selected: -1
        };

        var hasFocus = false;
        self.clickCatcher = null;

        self.holder = d.createElement( 'div' );
        _.addClass( self.holder, 'holder' );
        self.appendChild( self.holder );

        self.input = d.createElement( 'input' );
        self.input.setAttribute( 'type', 'text' );
        self.input.setAttribute( 'class', 'input' );
        self.input.setAttribute( 'placeholder', 'Введите имя друга' );

        var onInputFocus = function ( evt ) {
            hasFocus = true;
        };

        var onInputBlur = function ( evt ) {
            hasFocus = false;
        };

        var onInputKeyPress = function ( evt ) {
            console.log( 'input key', evt );

            loadSuggestions( self.input.value );
        };

        var onInputKeyDown = function ( evt ) {
            console.log( 'input keydown', evt );

            // 40 DOWN
            //
            // 38 UP
            //
            // 13 Enter
            //
            // 27 ESC
            //
            switch ( evt.keyCode ) {

                case 27:
                    hideSuggestions();
                    break;

                case 13:
                    confirmSuggestion();
                    break;

                case 40:
                    selectNextSuggestion();
                    break;

                case 38:
                    selectPrevSuggestion();
                    break;
            }
        };

        var selectPrevSuggestion = function (argument) {
            // body...
        };

        var selectNextSuggestion = function (argument) {
            if (search.selected !== -1 && search.selected < search.items.length ) {
                search.items[ search.selected ].unselect();
                search.items[ ++search.selected ].select();
            }
        };

        /**
         * TODO
         * @param  {[type]} argument [description]
         * @return {[type]}          [description]
         */
        var confirmSuggestion = function (argument) {

            // confirmation of suggestion
        };

        /**
         * [loadSuggestions description]
         * @param  {[type]} value [description]
         * @return {[type]}       [description]
         */
        var loadSuggestions = function ( value, skipRender ) {

            _.getJSON( '/friends.json' ).then( function ( data ) {
                if ( typeof data !== 'undefined' ) {
                    console.log( 'suggestions loaded' );
                    if ( !skipRender ) {
                        filterSuggestions( data.response.items, value );
                        renderSuggestions();
                    }
                }
            } );

        };

        var filterSuggestions = function ( suggestions, value ) {

            search.data = [];

            var searchTermLooksLikeRussian = /[а-я]/i.test(value);
            var regexp_ru = new RegExp( searchTermLooksLikeRussian ? value : _.translit( value, -5), "i" );
            var regexp_en = new RegExp( searchTermLooksLikeRussian ? _.translit( value, 5) : value, "i" );

            for (var i = 0, len = suggestions.length; i < len; i++) {

                var fio_original = suggestions[i].first_name + ' ' + suggestions[i].last_name;
                var fioLooksLikeRussian = /[а-я]/i.test(fio_original);

                var fio_rus = (fioLooksLikeRussian) ? fio_original : _.translit( fio_original, -5);
                var fio_en  = (fioLooksLikeRussian) ? _.translit( fio_original, 5) : fio_original;

                if (regexp_ru.test( fio_original ) || regexp_en.test( fio_en ) ) {
                    search.data.push( suggestions[i] );
                }
            }

            search.value = value;
        };

        var suggestionElement = function ( data, selectedEl ) {

            var isSelected = false;
            var tags = {};
            var fio = data.first_name + ' ' + data.last_name;

            var r = new RegExp ( search.value, "gi" );
            fio = fio.replace(r, function(str) {
                return '<span class="highlight">' + str + '</span>';
            });

            var select = function () {
                if ( !isSelected ) {
                    _.addClass( tags.html, 'selected' );
                    isSelected = true;
                }
            };

            var unselect = function () {
                if ( isSelected ) {
                    _.removeClass( tags.html, 'selected' );
                    isSelected = false;
                }
            };

            var buildHTML = function () {

                tags.html = _.createElement( 'div', 'suggestion' );

                tags.wrapper = _.createElement( 'div', 'suggestion-wrapper' );
                tags.html.appendChild( tags.wrapper );

                if ( settings.use_avatars ) {

                    tags.avatarHolder = _.createElement( 'div', 'avatar-holder' );
                    tags.avatar = _.createElement( 'img', 'avatar' );
                    tags.avatar.src = data.photo_50;
                    tags.avatarHolder.appendChild( tags.avatar );

                    tags.wrapper.appendChild( tags.avatarHolder );
                }

                tags.fioHolder = _.createElement( 'div', 'fio' );
                tags.fioHolder.innerHTML = fio;

                tags.wrapper.appendChild( tags.fioHolder );
            };

            buildHTML();

            if ( selectedEl ) {
                select();
            }

            return {
                'getHTML': function getHTML() {
                    return tags.html;
                },
                'select': select,
                'unselect': unselect
            };
        };

        /**
         * [hideSuggestions description]
         * @return {[type]} [description]
         */
        var hideSuggestions = function () {

            // removing clicks catcher
            _.removeEventListener( self.clickCatcher, 'click', hideSuggestions );
            d.body.removeChild( self.clickCatcher );
            self.clickCatcher = null;

            // cleaning suggestions
            _.hide( self.suggestionHolder );
            self.suggestionHolder.innerHTML = '';

            // reset
            search = {
                data: null,
                value: null,
                selected: -1,
                items: []
            };
        };

        /**
         * [renderSuggestions description]
         * @param  {[type]} data  [description]
         * @param  {[type]} value [description]
         * @return {[type]}       [description]
         */
        var renderSuggestions = function ( ) {

            if ( self.clickCatcher === null ) {
                self.clickCatcher = d.createElement( 'div' );
                self.clickCatcher.setAttribute( 'id', 'aka-dropdown-click-catcher' );

                _.addEventListener( self.clickCatcher, 'click', hideSuggestions );

                d.body.appendChild( self.clickCatcher );
            }

            if ( typeof self.suggestionHolder === 'undefined' ) {
                self.suggestionHolder = _.createElement( 'div', 'suggestions-holder' );
                self.appendChild( self.suggestionHolder );

                self.suggestionHolder.style.width = self.clientWidth + 2 + 'px';
                // to compensate for border
                self.suggestionHolder.style.marginLeft = '-1px';
            }

            _.hide( self.suggestionHolder );

            self.suggestionHolder.innerHTML = '';

            if (search.data.length > 0) {
                search.selected = 0;
            }

            search.items = [];

            for ( var i = 0, len = search.data.length; i < len; i++ ) {
                var item = suggestionElement( search.data[ i ], i === search.selected );
                search.items.push( item );
                self.suggestionHolder.appendChild( item.getHTML() );
            }

            _.show( self.suggestionHolder );
        };

        _.addEventListener( self.input, 'focus', onInputFocus );
        _.addEventListener( self.input, 'blur', onInputBlur );
        _.addEventListener( self.input, 'keypress', _.debounce( onInputKeyPress, 50 ) );
        _.addEventListener( self.input, 'keydown', onInputKeyDown );

        self.holder.appendChild( self.input );


        // preload suggestions
        loadSuggestions( '', true );

        // some interface
        return {};
    };


    var dropdowns = d.querySelectorAll( '.aka-dropdown' );
    for ( var i = 0; i < dropdowns.length; i++ ) {
        dropdown( dropdowns[ i ] );
    }


}( window, document ) );