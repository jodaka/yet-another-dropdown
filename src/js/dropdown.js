( function ( w, d ) {
    'use strict';

    var Dropdown = function ( dropdownParentTag ) {

        // default settings
        var settings = {
            'use_avatars': true,
            'multiselect': true,
            'server': false,
            'typos': false,
            'server_url': location.protocol + '//' + location.hostname + ':8881/search?q='
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

        var preloadedData = null;

        var tags = {
            clickCatcher: null
        };

        var buildDropdownHTML = function () {
            tags.holder = _.createElement( 'div', 'holder' );
            dropdownParentTag.appendChild( tags.holder );

            tags.input = _.createElement( 'input', 'input' );
            tags.input.setAttribute( 'type', 'text' );
            tags.input.setAttribute( 'placeholder', i18n.enter_name );

            tags.holder.appendChild( tags.input );

            tags.icon = _.createElement( 'div', 'icon-arrow' );
            tags.holder.appendChild( tags.icon );
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
                    if ( typeof conf.server !== 'undefined' ) {
                        settings.server = conf.server;
                    }
                } catch ( e ) {
                    console.warn( "Couldn't parse dropdown settings ", e );
                }
            }

        };

        parseSettings( dropdownParentTag.getAttribute( 'data-settings' ) );

        // var onInputFocus = function ( evt ) {
        //     hasFocus = true;
        // };

        // var onInputBlur = function ( evt ) {
        //     hasFocus = false;
        // };

        var onInputKeyPress = function ( evt ) {
            loadSuggestions( tags.input.value );
        };

        var onInputKeyDown = function ( evt ) {

            switch ( evt.keyCode ) {

                case 27: // ESC
                    evt.preventDefault();
                    hideSuggestions();
                    return;

                case 13: // Enter
                    evt.preventDefault();
                    suggestionList.select();
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
                search.items[ search.selected ].unfocus();
                search.selected += add;
                search.items[ search.selected ].focus();
                tags.input.focus();
            }
        };

        /**
         * Whenever we add/remove bubble we need to show/hide inpu
         * for non-multiselect dropdowns
         *
         */
        var toggleControls = function ( bubblesLength ) {

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
        var bubblesList = ( function () {
            var list = [];
            var ids = {}; // hash to speedup lookups

            var has = function ( id ) {
                return ( typeof ids[ id ] !== 'undefined' );
            };

            var add = function ( data ) {
                var bubble = new SuggestionBubble( data );
                list.push( bubble );
                ids[ data.id ] = true;

                toggleControls( list.length );
            };

            var remove = function ( id, element ) {

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

            var getData = function () {
                return list;
            };

            return {
                'has': has,
                'add': add,
                'remove': remove,
                'getData': getData
            };

        }() );

        /**
         * Suggestion bubble.
         *
         * @param {[type]} suggestionData [description]
         */
        var SuggestionBubble = function ( suggestionData ) {

            this.fio = suggestionData.first_name + ' ' + suggestionData.last_name;
            this.data = suggestionData;

            // building html
            this.holder = _.createElement( 'div', 'bubble-holder' );
            var fullname = _.createElement( 'div', 'bubble-fio' );
            var removeBtn = _.createElement( 'div', 'bubble-action' );

            fullname.appendChild( d.createTextNode( this.fio ) );
            removeBtn.appendChild( _.createElement( 'div', 'icon-delete' ) );

            // refactor bind(this)
            _.addEventListener( removeBtn, 'click', this.remove.bind( this ) );

            this.holder.appendChild( fullname );
            this.holder.appendChild( removeBtn );

            tags.holder.insertBefore( this.holder, tags.input );

        };

        SuggestionBubble.prototype.remove = function () {
            bubblesList.remove( this.data.id, this.holder );
        };

        SuggestionBubble.prototype.getData = function () {
            return this.data;
        };

        /**
         * Shortcut method
         * @param  {Array} domainsList list of users filtered by domain
         */
        var proceedWithSuggestions = function ( data, value, domainsList ) {
            filterSuggestions( data, value, domainsList );
            renderSuggestions();
        };

        /**
         * TODO
         * Loading suggestions from server.
         *
         * @param  {String} value           filtering value
         * @param  {Boolean} skipRender     if true, then it will just cache data
         * @return {Array}                  suggestions
         */
        var loadSuggestions = function ( value ) {

            // preloading
            if ( preloadedData === null ) {

                _.getJSON( '/friends.json' ).then( function ( data ) {
                    if ( typeof data !== 'undefined' ) {
                        preloadedData = data.response.items;
                        // console.log( 'suggestions loaded' );
                    } else {
                        console.log( 'load suggestions error' );
                        preloadedData = [];
                    }
                } );

                return;
            }

            // do we need domains?
            if ( settings.server ) {

                // gonna filter only if value > 1 symbol and matches our regexp
                if ( typeof value !== 'undefined' &&
                    value.length > 1 &&
                    /[a-z0-9_]+/i.test( value ) ) {

                    _.getJSON( settings.server_url + value ).then(
                        function ( data ) {
                            proceedWithSuggestions( preloadedData, value, data );
                        },
                        function ( err ) {
                            proceedWithSuggestions( preloadedData, value, [] );
                        } );

                    return;
                }
            }

            proceedWithSuggestions( preloadedData, value, [] );

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
         * @param  {Array} domainsList  list of users id filtered by domain
         * @return {Array}
         */
        var filterSuggestions = function ( suggestions, value, domainsList ) {

            // console.log( 'filterStarted' );
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

                // Filtering by domain
                var match_domain = false;

                if ( settings.server && domainsList.length > 0 ) {

                    for ( var d = 0; d < domainsList.length; d++ ) {
                        if ( domainsList[ d ] === suggestions[ i ].id ) {
                            match_domain = true;
                            break;
                        }
                    }
                }

                if ( match_ru || match_en || match_toggledKeymap || match_typo || match_domain ) {

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
         * @param  {[type]} argument [description]
         * @return {[type]}          [description]
         */
        var suggestionList = ( function () {

            /**
             * [select description]
             * @param  {[type]} argument [description]
             * @return {[type]}          [description]
             */
            var select = function ( argument ) {

                if ( search.selected !== -1 ) {

                    var newItem = search.items[ search.selected ].getData();
                    tags.input.value = '';

                    bubblesList.add( newItem );

                    hideSuggestions();
                }

            };

            return {
                'select': select
            };
        }() );


        /**
         * TODO
         * @param  {[type]} data       [description]
         * @return {[type]}            [description]
         */
        var Suggestion = function ( elementData, idx ) {

            this.isSelected = false;
            this.data = elementData;
            this.index = idx;
            this.tags = {};

            this.tags.html = _.createElement( 'div', 'suggestion' );
            this.tags.html.setAttribute( 'tabindex', '-1' );

            this.tags.wrapper = _.createElement( 'div', 'suggestion-wrapper' );
            this.tags.html.appendChild( this.tags.wrapper );

            if ( settings.use_avatars ) {

                this.tags.avatarHolder = _.createElement( 'div', 'avatar-holder' );
                this.tags.avatar = _.createElement( 'img', 'avatar' );
                this.tags.avatar.style.backgroundImage = "url('" + this.data.photo_50 + "')";
                this.tags.avatarHolder.appendChild( this.tags.avatar );

                this.tags.wrapper.appendChild( this.tags.avatarHolder );
            }

            var fio = this.data.first_name + ' ' + this.data.last_name;

            // highlighting text
            if ( search.value !== 'undefined' && search.value.length > 0 ) {
                var r = new RegExp( search.value, "gi" );
                fio = fio.replace( r, function ( str ) {
                    return '<span class="highlight">' + str + '</span>';
                } );
            }

            this.tags.fioHolder = _.createElement( 'div', 'fio' );
            this.tags.fioHolder.innerHTML = fio;

            this.tags.wrapper.appendChild( this.tags.fioHolder );

            /**
             * click on the element
             */
            this.captureSelection = function () {

                if ( search.selected > -1 ) {
                    search.items[ search.selected ].unfocus();
                }

                search.selected = idx;
                search.items[ search.selected ].focus();
            };

            _.addEventListener( this.tags.html, 'mouseenter', this.captureSelection );
            _.addEventListener( this.tags.html, 'click', suggestionList.select );

            if ( idx === search.selected ) {
                this.focus();
            }
        };

        Suggestion.prototype.getHTML = function () {
            return this.tags.html;
        };

        Suggestion.prototype.getData = function () {
            return this.data;
        };

        Suggestion.prototype.focus = function () {
            if ( !this.isSelected ) {
                _.addClass( this.tags.html, 'selected' );
                this.isSelected = true;
                this.tags.html.focus();
            }
        };

        Suggestion.prototype.unfocus = function () {
            if ( this.isSelected ) {
                _.removeClass( this.tags.html, 'selected' );
                this.isSelected = false;
            }
        };



        /**
         * [hideSuggestions description]
         * @return {[type]} [description]
         */
        var hideSuggestions = function () {

            if ( tags.clickCatcher === null ) {
                return;
            }

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

            // console.warn( 'render suggestions', search.value );

            if ( tags.clickCatcher === null ) {
                tags.clickCatcher = d.createElement( 'div' );
                tags.clickCatcher.setAttribute( 'id', 'aka-dropdown-click-catcher' );

                _.addEventListener( tags.clickCatcher, 'click', hideSuggestions );

                d.body.appendChild( tags.clickCatcher );
            }

            if ( typeof tags.suggestionHolder === 'undefined' ) {
                tags.suggestionHolder = _.createElement( 'div', 'suggestions-holder' );
                dropdownParentTag.appendChild( tags.suggestionHolder );

                tags.suggestionHolder.style.width = dropdownParentTag.clientWidth + 2 + 'px';
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
                    var item = new Suggestion( search.data[ i ], i );
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

        // _.addEventListener( this.input, 'focus', onInputFocus );
        // _.addEventListener( this.input, 'blur', onInputBlur );
        _.addEventListener( tags.input, 'keypress', _.debounce( onInputKeyPress, 50 ) );
        _.addEventListener( tags.input, 'keydown', onInputKeyDown );

        // preload suggestions
        loadSuggestions( '', true );

        // public interface
        this.getData = function ( argument ) {
            return bubblesList.getData;
        };

        this.hide = function () {
            hideSuggestions();
        };

        return this;

    };


    // Инициализируем все дропдауны на странице
    var dropdowns = [];
    var dropdownTags = Array.prototype.slice.call( d.querySelectorAll( '.aka-dropdown' ) );
    for ( var i = 0; i < dropdownTags.length; i++ ) {
        dropdowns.push( new Dropdown( dropdownTags[ i ] ) );
    }

    /**
     * При событии ресайза страницы будем прятать саджест
     *
     * сохраним оригинальный обработчик ресайза и добавим к нему наш собственный,
     * который будет троттлить событие resize с задержкой (т.к. оно стреляет
     * слишком часто)
     *
     */
    var onScrollOriginal = w.onresize;

    var hideDropdownSuggestions =
        _.debounce( function () {
            for ( var i = 0; i < dropdowns.length; i++ ) {
                dropdowns[ i ].hide();
            }
        }, 50 );

    w.onresize = function () {

        hideDropdownSuggestions();

        if ( typeof onScrollOriginal === 'function' ) {
            onScrollOriginal.call();
        }
    };

}( window, document ) );