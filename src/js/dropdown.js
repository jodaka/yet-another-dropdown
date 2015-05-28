( function ( w, d ) {
    'use strict';

    var dropdown = function ( el ) {

        var self = el;

        // default settings
        var settings = {
            'use_avatars': true,
            'multiselect': true,
            'server': false,
            'typos': false
        };

        // let's imagine we've included localized resources here
        var i18n = {
            no_suggestions_found: 'Пользователь не найден',
            enter_name: 'Введите имя друга'
        };

        var search = {
            value: null,
            data: null,
            items: [],
            selected: -1
        };

        var tags = {
            clickCatcher: null
        };

        var buildDropdownHTML = function () {
            tags.holder = d.createElement( 'div' );
            _.addClass( tags.holder, 'holder' );
            self.appendChild( tags.holder );

            tags.input = d.createElement( 'input' );
            tags.input.setAttribute( 'type', 'text' );
            tags.input.setAttribute( 'class', 'input' );
            tags.input.setAttribute( 'placeholder', i18n.enter_name );

            tags.holder.appendChild( tags.input );
        };

        buildDropdownHTML();


        /**
         * Poor mans settings parser.
         * @param  {[type]} conf [description]
         * @return {[type]}      [description]
         */
        var parseSettings = function ( conf ) {

            if ( conf !== null ) {
                try {
                    conf = JSON.parse( conf );
                    if ( typeof conf.use_avatars !== 'undefined' ) {
                        settings.use_avatars = conf.use_avatars;
                    }
                    if ( typeof conf.multiselect !== 'undefined' ) {
                        settings.multiselect = conf.multiselect;
                    }
                    if ( typeof conf.typos !== 'undefined' ) {
                        settings.typos = conf.typos;
                    }
                } catch ( e ) {
                    console.warn( "Couldn't parse dropdown settings ", e );
                }
            }

        };

        parseSettings( self.getAttribute( 'data-settings' ) );

        // var onInputFocus = function ( evt ) {
        //     hasFocus = true;
        // };

        // var onInputBlur = function ( evt ) {
        //     hasFocus = false;
        // };

        var onInputKeyPress = function ( evt ) {
            // console.log( 'input key', evt );
            loadSuggestions( tags.input.value );
        };

        var onInputKeyDown = function ( evt ) {
            // console.log( 'input keydown', evt );

            switch ( evt.keyCode ) {

                case 27: // ESC
                    evt.preventDefault();
                    hideSuggestions();
                    return;

                case 13: // Enter
                    evt.preventDefault();
                    confirmSuggestion();
                    return;

                case 40: // Down arrow
                    evt.preventDefault();

                    // if suggest isn't visible, let's open it
                    if ( tags.clickCatcher === null ) {
                        loadSuggestions();
                        return;
                    }

                    kbdSelectSuggestion( 'next' );
                    return;

                case 38: // Up arrow
                    evt.preventDefault();
                    kbdSelectSuggestion( 'prev' );
                    return false;

                case 8: // Backspace
                    console.log( 'Backspace' );
                    setTimeout( onInputKeyPress, 0 );
            }

            return true;
        };

        /**
         * Keyboard navigation for previous suggestion
         */
        var kbdSelectSuggestion = function ( direction ) {

            var add, borderCondition;

            if ( direction === 'next' ) {
                add = 1;
                borderCondition = search.selected < search.items.length;
            } else {
                add = -1;
                borderCondition = search.selected > 0;
            }

            if ( search.selected !== -1 && borderCondition ) {
                search.items[ search.selected ].unselect();
                search.selected += add;
                search.items[ search.selected ].select();
                search.items[ search.selected ].getHTML().focus();
                tags.input.focus();
            }
        };

        /**
         * Whenever we add/remove bubble we need to show/hide inpu
         * for non-multiselect dropdowns
         *
         */
        var toggleControls = function ( bubblesLength ) {

            console.log( 'settings', settings );

            if ( !settings.multiselect ) {

                if ( bubblesLength > 0 ) {
                    _.hide( tags.input );
                } else {
                    _.show( tags.input );
                }
            }
        };

        /**
         * TODO
         */
        var BubbleList = function () {

            var list = [];
            var ids = {}; // hash to speedup lookups

            this.has = function ( id ) {
                return ( typeof ids[ id ] !== 'undefined' );
            };

            this.add = function ( data ) {
                var bubble = new SuggestionBubble( data );
                list.push( bubble );
                ids[ data.id ] = true;

                toggleControls( list.length );
            };

            this.remove = function ( id, element ) {

                for ( var i = 0; i < list.length; i++ ) {
                    if ( list[ i ].getData().id === id ) {
                        delete ids[ id ];
                        list.splice( i, 1 );
                        break;
                    }
                }

                tags.holder.removeChild( element );
                toggleControls( list.length );
            };

            this.getData = function () {
                return list;
            };

            return this;
        };

        /**
         * Suggestion bubble.
         *
         * @param {[type]} suggestionData [description]
         */
        var SuggestionBubble = function ( suggestionData ) {

            var fio = suggestionData.first_name + ' ' + suggestionData.last_name;
            var data = suggestionData;

            this.remove = function () {
                bubblesList.remove( data.id, holder );
            };

            this.getData = function () {
                return data;
            };

            // building html
            var holder = _.createElement( 'div', 'bubble-holder' );
            var fullname = _.createElement( 'div', 'bubble-fio' );
            var removeBtn = _.createElement( 'div', 'bubble-action' );

            fullname.appendChild( d.createTextNode( fio ) );
            removeBtn.appendChild( _.createElement( 'div', 'icon-remove' ) );

            _.addEventListener( removeBtn, 'click', this.remove );

            holder.appendChild( fullname );
            holder.appendChild( removeBtn );

            tags.holder.insertBefore( holder, tags.input );

            return this;
        };

        /**
         * Renders selected suggestion
         * TODO
         *
         * @param  {[type]} data [description]
         * @return {[type]}      [description]
         */
        var addSuggestionBubble = function ( data, index ) {


        };

        /**
         * TODO
         * @param  {[type]} argument [description]
         * @return {[type]}          [description]
         */
        var confirmSuggestion = function () {

            if ( search.selected !== -1 ) {

                var newItem = search.items[ search.selected ].getData();
                tags.input.value = '';

                bubblesList.add( newItem );


                // renderConfirmedSuggestion( newItem, selectedSuggestions.length - 1 );

                hideSuggestions();
            }
        };

        /**
         * TODO
         * Loading suggestions from server.
         *
         * @param  {String} value           filtering value
         * @param  {Boolean} skipRender     if true, then it will just cache data
         * @return {Array}                  suggestions
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

        var filterAlreadyUsedSuggestions = function ( data ) {
            return !bubblesList.has( data.id );
        };

        /**
         * Main filtering function
         *
         * it would try to match strings in EN/RU, then it will try translit versions
         * and toggled keymap
         *
         * @param  {Array} suggestions  list of all suggestions
         * @param  {String} value       filtering string
         * @return {Array}
         */
        var filterSuggestions = function ( suggestions, value ) {

            // no filtering is necessary for empty value
            if ( typeof value === 'undefined' || value.length === 0 ) {
                search.data = suggestions.filter( filterAlreadyUsedSuggestions );
                search.value = '';
                return;
            }

            search.data = [];

            var searchTermLooksLikeRussian = /[а-я]/i.test( value );
            var regexp_ru = new RegExp( searchTermLooksLikeRussian ? value : _.translit( value, -5 ), "i" );
            var regexp_en = new RegExp( searchTermLooksLikeRussian ? _.translit( value, 5 ) : value, "i" );

            var toggleKeymapValue = _.toggleKeymap( value, searchTermLooksLikeRussian );

            var regexp_keymap = new RegExp( toggleKeymapValue, "i" );

            for ( var i = 0, len = suggestions.length; i < len; i++ ) {

                var fullName = suggestions[ i ].first_name + ' ' + suggestions[ i ].last_name;
                var fioLooksLikeRussian = /[а-я]/i.test( fullName );

                var fio_rus = ( fioLooksLikeRussian ) ? fullName : _.translit( fullName, -5 );
                var fio_en = ( fioLooksLikeRussian ) ? _.translit( fullName, 5 ) : fullName;

                var match_ru = regexp_ru.test( fullName );
                var match_en = regexp_en.test( fio_en );

                var match_toggledKeymap = ( new RegExp( _.toggleKeymap( value, searchTermLooksLikeRussian ), "i" ) ).test( searchTermLooksLikeRussian ? fio_en : fio_rus );

                // Experimental typo fixing in names
                var match_typo = false;
                if ( settings.typos ) {

                    // we gonna test only names in the range  1 < length <= 7
                    // name and filtering value must have similar length
                    if ( value.length > 1 && value.length <= 7 && Math.abs( suggestions[ i ].first_name.length - value.length ) <= 2 ) {

                        var firstName_rus = ( fioLooksLikeRussian ) ? suggestions[ i ].first_name : _.translit( suggestions[ i ].first_name, -5 );
                        var firstName_en = ( fioLooksLikeRussian ) ? _.translit( suggestions[ i ].first_name, 5 ) : suggestions[ i ].first_name;
                        var valueLowerCased = value.toLowerCase();

                        if ( _.damerauLevenshteinDistance( firstName_rus.toLowerCase(), valueLowerCased, 5 ) <= 2 ||
                            _.damerauLevenshteinDistance( firstName_en.toLowerCase(), valueLowerCased, 5 ) <= 2 ) {
                            match_typo = true;
                        }
                    }
                }

                if ( match_ru || match_en || match_toggledKeymap || match_typo ) {

                    // filtering out already added suggestions
                    if ( !bubblesList.has( suggestions[ i ].id ) ) {
                        search.data.push( suggestions[ i ] );
                    }
                }
            }

            search.value = value;
        };

        /**
         * TODO
         * @param  {[type]} data       [description]
         * @return {[type]}            [description]
         */
        var suggestionElement = function ( elementData, idx ) {

            var isSelected = false;
            var data = elementData;
            var index = idx;
            var tags = {};

            var getData = function () {
                return data;
            };

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

            var captureSelection = function () {

                if ( search.selected > -1 ) {
                    search.items[ search.selected ].unselect();
                }

                search.selected = index;
                search.items[ search.selected ].select();
            };

            var buildHTML = function () {


                tags.html = _.createElement( 'div', 'suggestion' );
                tags.html.setAttribute( 'tabindex', '-1' );

                tags.wrapper = _.createElement( 'div', 'suggestion-wrapper' );
                tags.html.appendChild( tags.wrapper );

                if ( settings.use_avatars ) {

                    tags.avatarHolder = _.createElement( 'div', 'avatar-holder' );
                    tags.avatar = _.createElement( 'img', 'avatar' );
                    tags.avatar.style.backgroundImage = "url('" + data.photo_50 + "')";
                    tags.avatarHolder.appendChild( tags.avatar );

                    tags.wrapper.appendChild( tags.avatarHolder );
                }

                var fio = data.first_name + ' ' + data.last_name;

                // highlighting text
                if ( search.value !== 'undefined' && search.value.length > 0 ) {
                    var r = new RegExp( search.value, "gi" );
                    fio = fio.replace( r, function ( str ) {
                        return '<span class="highlight">' + str + '</span>';
                    } );
                }

                tags.fioHolder = _.createElement( 'div', 'fio' );
                tags.fioHolder.innerHTML = fio;

                tags.wrapper.appendChild( tags.fioHolder );
            };

            buildHTML();

            _.addEventListener( tags.html, 'mouseenter', captureSelection );
            _.addEventListener( tags.html, 'click', confirmSuggestion );

            if ( idx === search.selected ) {
                select();
            }

            return {
                'getData': getData,
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
            _.removeEventListener( tags.clickCatcher, 'click', hideSuggestions );
            d.body.removeChild( tags.clickCatcher );
            tags.clickCatcher = null;

            // cleaning suggestions
            _.hide( tags.suggestionHolder );
            tags.suggestionHolder.innerHTML = '';

            // reset
            search = {
                data: null,
                value: null,
                selected: -1,
                items: []
            };
        };

        /**
         * TODO
         * @param  {[type]} data  [description]
         * @param  {[type]} value [description]
         * @return {[type]}       [description]
         */
        var renderSuggestions = function () {

            console.warn( 'render suggestions', search.value );

            if ( tags.clickCatcher === null ) {
                tags.clickCatcher = d.createElement( 'div' );
                tags.clickCatcher.setAttribute( 'id', 'aka-dropdown-click-catcher' );

                _.addEventListener( tags.clickCatcher, 'click', hideSuggestions );

                d.body.appendChild( tags.clickCatcher );
            }

            if ( typeof tags.suggestionHolder === 'undefined' ) {
                tags.suggestionHolder = _.createElement( 'div', 'suggestions-holder' );
                self.appendChild( tags.suggestionHolder );

                tags.suggestionHolder.style.width = self.clientWidth + 2 + 'px';
                // to compensate for border
                tags.suggestionHolder.style.marginLeft = '-1px';
            }

            _.hide( tags.suggestionHolder );

            tags.suggestionHolder.innerHTML = '';

            if ( search.data.length > 0 ) {
                search.selected = 0;
            }

            search.items = [];

            if ( search.data.length > 0 ) {

                for ( var i = 0, len = search.data.length; i < len; i++ ) {
                    var item = suggestionElement( search.data[ i ], i );
                    search.items.push( item );
                    tags.suggestionHolder.appendChild( item.getHTML() );
                }

            } else {

                var noResults = _.createElement( 'div', 'no-results' );
                noResults.appendChild( d.createTextNode( i18n.no_suggestions_found ) );

                tags.suggestionHolder.appendChild( noResults );
            }

            _.show( tags.suggestionHolder );
        };

        // _.addEventListener( self.input, 'focus', onInputFocus );
        // _.addEventListener( self.input, 'blur', onInputBlur );
        _.addEventListener( tags.input, 'keypress', _.debounce( onInputKeyPress, 50 ) );
        _.addEventListener( tags.input, 'keydown', onInputKeyDown );


        // preload suggestions
        loadSuggestions( '', true );

        var bubblesList = new BubbleList();

        // some interface here
        // to get selected suggestion possibly
        return {
            'getSelected': function () {
                return bubblesList.getData();
            }
        };
    };


    // init all dropdown on the page
    var dropdowns = d.querySelectorAll( '.aka-dropdown' );
    for ( var i = 0; i < dropdowns.length; i++ ) {
        dropdown( dropdowns[ i ] );
    }


}( window, document ) );