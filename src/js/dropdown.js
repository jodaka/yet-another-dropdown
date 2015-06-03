( function ( w, d ) {
    'use strict';

    /**
     * Тестовая реализация дропдауна.
     * Имеет всего два публичных метода для скрытия списка подсказок и для
     * получения id выбранного пользовате[ля/лей]
     */
    var Dropdown = function ( dropdownParentTag ) {

        // настройки по-умолчанию
        var settings = {
            'use_avatars': true,
            'multiselect': true,
            'server': false,
            'typos': false,
            'server_url': location.protocol + '//' + location.hostname + ':8881/search?q='
        };

        // Подразумевается, что у нас есть некий механизм локализации, который нам отдаёт
        // строковые ресурсы. В данным случае, для простоты, это просто хэш.
        var i18n = {
            no_suggestions_found: 'Пользователь не найден',
            enter_name: 'Введите имя друга'
        };

        // данные поискового запроса
        var search = {
            value: null,
            data: null,
            items: [],
            selected: -1
        };

        // здесь бы будем хранить все имена/фамилии
        var preloadedData = null;

        // обёртка для ссылок на DOM дерево элементов дропдауна
        var tags = {
            clickCatcher: null
        };

        /**
         * Создаём DOM дерево для дропдауна
         */
        tags.holder = _.createElement( 'div', 'holder' );
        dropdownParentTag.appendChild( tags.holder );

        tags.bubbleHolder = _.createElement( 'div', 'bubbles-holder' );
        tags.holder.appendChild( tags.bubbleHolder );

        tags.input = _.createElement( 'input', 'input' );
        tags.input.setAttribute( 'type', 'text' );
        tags.input.setAttribute( 'placeholder', i18n.enter_name );

        tags.holder.appendChild( tags.input );

        tags.icon = _.createElement( 'div', 'icon-arrow' );
        tags.holder.appendChild( tags.icon );
        _.addEventListener( tags.icon, 'click', function () {
            if ( tags.clickCatcher === null ) {
                loadSuggestions();
                return;
            }
        } );

        /**
         * Парсинг настроек дропдауна.
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

        /**
         * Показ подсказок при нажатии на клавишу
         */
        var onInputKeyPress = function () {

            setTimeout( function () {
                loadSuggestions( tags.input.value );
            }, 10 );
        };

        /**
         * Обработка управляющих клавиш
         */
        var onInputKeyDown = function ( evt ) {

            evt = evt || w.event; // thanks, IE!
            var keyCode = evt.which || evt.keyCode;

            switch ( keyCode ) {

                case 27: // ESC
                    _.eventPreventDefault( evt );
                    hideSuggestions();
                    return;

                case 13: // Enter
                    _.eventPreventDefault( evt );

                    if ( search.selected !== -1 ) {
                        search.items[ search.selected ].select();
                    }
                    return;

                case 40: // Down arrow
                    _.eventPreventDefault( evt );

                    if ( tags.clickCatcher === null ) {
                        loadSuggestions();
                        return;
                    }

                    kbdSelectSuggestion( 'next' );
                    return;

                case 38: // Up arrow
                    _.eventPreventDefault( evt );
                    kbdSelectSuggestion( 'prev' );
                    return false;

                case 8: // Backspace
                    onInputKeyPress();
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
         * При удалании/добавлении баббла нужно прятать/показывать строку вводу
         * в зависимости от настройки multiselect
         */
        var toggleControls = function ( bubblesLength ) {

            if ( !settings.multiselect ) {

                if ( bubblesLength > 0 ) {
                    _.hide( tags.input );
                } else {
                    _.show( tags.input );
                    tags.input.focus();
                }
            }
        };

        /**
         * Список бабблов с вспомогательными методами для добавления/удаления оных
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

                tags.bubbleHolder.removeChild( element );
                toggleControls( list.length );
            };

            /**
             * Метод, возвращающий все выбранные элементы для дропдауна.
             * В данной реализации вернёт массив id выбранных пользователей.
             */
            var getData = function () {
                var results = [];
                for ( var i = 0; i < list.length; i++ ) {
                    results.push( list[ i ].getData.id );
                }
                return results;
            };

            return {
                'has': has,
                'add': add,
                'remove': remove,
                'getData': getData
            };

        }() );

        /**
         * Баббл.
         * Хранит в себе информацию о выбранном элементе и пару методов для получения информации
         * и удаления баббла.
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

            _.addEventListener( removeBtn, 'click', ( function ( self ) {
                return function () {
                    bubblesList.remove( self.data.id, self.holder );
                };
            }( this ) ) );

            this.holder.appendChild( fullname );
            this.holder.appendChild( removeBtn );

            tags.bubbleHolder.appendChild( this.holder );
        };

        // SuggestionBubble.prototype.remove = function () {
        //     bubblesList.remove( this.data.id, this.holder );
        // };

        SuggestionBubble.prototype.getData = function () {
            return this.data;
        };

        /**
         * Вспомогательный метод, который запускает фильтрацию и отрисовку подсказок
         */
        var proceedWithSuggestions = function ( data, value, domainsList ) {
            filterSuggestions( data, value, domainsList );
            renderSuggestions();
        };

        /**
         * Генерируем русский и английский варианты для имени+фамилии при помощи
         * транслитерации
         */
        var generateTransliterations = function ( data ) {

            for ( var i = 0, len = data.length; i < len; i++ ) {

                data[ i ].full_name = data[ i ].first_name + ' ' + data[ i ].last_name;
                data[ i ].fio_isRus = /[а-я]/i.test( data[ i ].full_name );

                data[ i ].fio_rus = ( data[ i ].fio_isRus ) ? data[ i ].full_name : _.translit( data[ i ].full_name, -5 );

                data[ i ].fio_en = ( data[ i ].fio_isRus ) ? _.translit( data[ i ].full_name, 5 ) : data[ i ].full_name;
            }
        };

        /**
         * Загрузка данных для подсказок.
         *
         * Подразумевается, что в реальной системе данные для нам уже должны быть доступны, но
         * для тестового задания я решил сделать подгрузку стороннего json. Ответ кешируется и
         * после нехитрой обработки сохраняется в переменную preloadedData.
         *
         * Если в настройках включен режим работы с сервером, то мы для каждого запроса будем
         * стучаться к серверу и требовать от него id пользователей, удовлетворяющих условию
         * поиска по домену.
         *
         */
        var loadSuggestions = function ( value ) {

            // preloading
            if ( preloadedData === null ) {

                _.getJSON( '/friends.json' ).then( function ( data ) {
                    if ( typeof data !== 'undefined' ) {
                        preloadedData = data.response.items;
                    } else {
                        preloadedData = [];
                    }

                    generateTransliterations( preloadedData );
                } );

                return;
            }

            // нужен нам поиск по домену?
            if ( settings.server ) {

                // отправляем запрос, только если он не пустой
                // и содержит хоть несколько допустимых символов
                if ( typeof value !== 'undefined' &&
                    value.length > 1 &&
                    /[a-z0-9_]+/i.test( value ) ) {

                    _.getJSON( settings.server_url + value ).then(
                        function ( data ) {
                            proceedWithSuggestions( preloadedData, value, data );
                        },
                        function () {
                            // в случае ошибки поднимаем панику и считаем, что сервер ничего не нашел
                            proceedWithSuggestions( preloadedData, value, [] );
                        } );

                    return;
                }
            }

            proceedWithSuggestions( preloadedData, value, [] );

        };

        /**
         * Фильтрация. Она же поиск.
         *
         * Рассчитана только на RU и EN языки. Пытается учитывать неправильную раскладку для обоих языков.
         *
         * Есть экспериментальный режим поиска с учётом опечаток. Он ограничен длиной символов от 2 до 7 и не
         * учитывает неправильную раскладку. И фамилию не учитывает. Только имя.
         *
         * Варианты с опечатками добавляются после в конце списка подсказок.
         *
         */
        var filterSuggestions = function ( suggestions, value, domainsList ) {

            search.data = [];
            var i, len;

            // ничего не фильтруем, если критерий поиска пуст
            if ( typeof value === 'undefined' || value.length === 0 ) {
                for ( i = 0, len = suggestions.length; i < len; i++ ) {
                    if ( !bubblesList.has( suggestions[ i ].id ) ) {
                        search.data.push( suggestions[ i ] );
                    }
                }
                search.value = '';
                return;
            }

            var matched_typos = [];

            // наивно пытаемся угадать, какой у нас язык, RU или EN в тексте запроса
            var searchTermLooksLikeRussian = /[а-я]/i.test( value );

            var regexp_ru = new RegExp( searchTermLooksLikeRussian ? value : _.translit( value, -5 ), "i" );
            var regexp_en = new RegExp( searchTermLooksLikeRussian ? _.translit( value, 5 ) : value, "i" );
            var regexp_keymap = new RegExp( _.toggleKeymap( value, searchTermLooksLikeRussian ), "i" );

            for ( i = 0, len = suggestions.length; i < len; i++ ) {

                var match_ru = regexp_ru.test( suggestions[ i ].fio_rus );
                var match_en = regexp_en.test( suggestions[ i ].fio_en );

                // console.log( suggestions[ i ].fio_rus, suggestions[ i ].fio_en, match_ru, match_en );

                var match_toggledKeymap = regexp_keymap.test( searchTermLooksLikeRussian ? suggestions[ i ].fio_en : suggestions[ i ].fio_rus );

                // экспериментальный поиск с опечатками
                if ( settings.typos ) {

                    // рассчитывается только если длина запроса от 1 до 7 символов
                    // и разница в длине между именем и запросом не превышает 2х символов
                    if ( value.length > 1 && value.length <= 7 && Math.abs( suggestions[ i ].first_name.length - value.length ) <= 2 ) {

                        var firstName_rus = ( suggestions[ i ].fio_isRus ) ? suggestions[ i ].first_name : _.translit( suggestions[ i ].first_name, -5 );
                        var firstName_en = ( suggestions[ i ].fio_isRus ) ? _.translit( suggestions[ i ].first_name, 5 ) : suggestions[ i ].first_name;
                        var valueLowerCased = value.toLowerCase();

                        if ( _.damerauLevenshteinDistance( firstName_rus.toLowerCase(), valueLowerCased, 5 ) <= 2 ||
                            _.damerauLevenshteinDistance( firstName_en.toLowerCase(), valueLowerCased, 5 ) <= 2 ) {
                            matched_typos.push( suggestions[ i ] );
                        }
                    }
                }

                // фильтрация по домену
                var match_domain = false;

                if ( settings.server && domainsList.length > 0 ) {

                    for ( var d = 0; d < domainsList.length; d++ ) {
                        if ( domainsList[ d ] === suggestions[ i ].id ) {
                            match_domain = true;
                            break;
                        }
                    }
                }

                if ( match_ru || match_en || match_toggledKeymap || match_domain ) {

                    // убираем дубли
                    if ( !bubblesList.has( suggestions[ i ].id ) ) {
                        search.data.push( suggestions[ i ] );
                    }
                }
            }

            // добавляем найденный варианты с опечатками в конец массива
            search.value = value;
            if ( settings.typos ) {
                for ( i = 0; i < matched_typos.length; i++ ) {
                    if ( !bubblesList.has( matched_typos[ i ].id ) ) {
                        search.data.push( matched_typos[ i ] );
                    }
                }
            }
        };

        /**
         * Подсказка.
         * Создаёт нехитрое DOM дерево, обрабатывает события клика и mousemove
         * и предоставляет вспомогательные методы для доступа к данным и подсветки
         * выбранного элемента (последнее нужно для клавиатурной навигации)
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
                this.tags.avatar = _.createElement( 'div', 'avatar' );
                this.tags.avatar.style.backgroundImage = "url('" + this.data.photo_50 + "')";
                this.tags.avatarHolder.appendChild( this.tags.avatar );

                this.tags.wrapper.appendChild( this.tags.avatarHolder );
            }

            var fio = this.data.first_name + ' ' + this.data.last_name;

            // подсвечиваем буковки в строке
            if ( search.value !== 'undefined' && search.value.length > 0 ) {
                var r = new RegExp( search.value, "gi" );
                fio = fio.replace( r, function ( str ) {
                    return '<span class="highlight">' + str + '</span>';
                } );
            }

            this.tags.fioHolder = _.createElement( 'div', 'fio' );
            this.tags.fioHolder.innerHTML = fio;

            this.tags.wrapper.appendChild( this.tags.fioHolder );

            // при движении мыши подсвечиваем элемент под курсором
            this.captureSelection = function () {

                if ( search.selected > -1 ) {
                    search.items[ search.selected ].unfocus();
                }

                search.selected = idx;
                search.items[ search.selected ].focus();
            };

            // подтверждение выбора
            this.select = function () {

                if ( search.selected !== -1 ) {

                    var newItem = search.items[ search.selected ].getData();
                    tags.input.value = '';

                    bubblesList.add( newItem );
                    hideSuggestions();

                    if ( settings.multiselect ) {
                        tags.input.focus();
                    }
                }
            };

            _.addEventListener( this.tags.html, 'mouseenter', this.captureSelection );
            _.addEventListener( this.tags.html, 'click', this.select );

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
                tags.input.focus(); // фокус обратно в инпут
            }
        };

        Suggestion.prototype.unfocus = function () {
            if ( this.isSelected ) {
                _.removeClass( this.tags.html, 'selected' );
                this.isSelected = false;
            }
        };


        /**
         * Прячем весь список подсказок
         */
        var hideSuggestions = function () {

            if ( tags.clickCatcher === null ) {
                return;
            }

            // убираем "паранжу"
            _.removeEventListener( tags.clickCatcher, 'click', hideSuggestions );
            d.body.removeChild( tags.clickCatcher );
            tags.clickCatcher = null;

            _.hide( tags.suggestionHolder );
            tags.suggestionHolder.innerHTML = '';

            // чистим все параметры запроса
            search = {
                data: null,
                value: null,
                selected: -1,
                items: []
            };
        };

        /**
         * Отрисовка списка подсказок
         */
        var renderSuggestions = function () {

            // рисуем "паранжу", которая будет перехватывать клики вне зоны
            // списка подсказок
            if ( tags.clickCatcher === null ) {
                tags.clickCatcher = d.createElement( 'div' );
                tags.clickCatcher.setAttribute( 'id', 'aka-dropdown-click-catcher' );

                _.addEventListener( tags.clickCatcher, 'click', hideSuggestions );

                d.body.appendChild( tags.clickCatcher );
            }

            if ( typeof tags.suggestionHolder === 'undefined' ) {
                tags.suggestionHolder = _.createElement( 'div', 'suggestions-holder' );
                dropdownParentTag.appendChild( tags.suggestionHolder );

            }

            // for IE we take scrollbar width into account
            var width = ( isIE8 ) ? dropdownParentTag.offsetWidth - 9 : dropdownParentTag.offsetWidth;
            width -= 1;
            tags.suggestionHolder.style.width = width + 'px';

            // to compensate for border
            tags.suggestionHolder.style.marginLeft = '-1px';

            _.hide( tags.suggestionHolder );

            tags.suggestionHolder.innerHTML = '';

            if ( search.data.length > 0 ) {
                search.selected = 0;
            }

            search.items = [];

            if ( search.data.length > 0 ) {

                // отрисовываем все найденные результаты
                for ( var i = 0, len = search.data.length; i < len; i++ ) {
                    var item = new Suggestion( search.data[ i ], i );
                    search.items.push( item );
                    tags.suggestionHolder.appendChild( item.getHTML() );
                }

            } else {

                // ничего не нашли
                var noResults = _.createElement( 'div', 'no-results' );
                noResults.appendChild( d.createTextNode( i18n.no_suggestions_found ) );

                tags.suggestionHolder.appendChild( noResults );
            }

            _.show( tags.suggestionHolder );
        };

        _.addEventListener( tags.input, 'keypress', onInputKeyPress );
        _.addEventListener( tags.input, 'keydown', onInputKeyDown );

        // подгружаем данные
        loadSuggestions( '', true );

        // public interface
        this.getData = function () {
            return bubblesList.getData;
        };

        this.hide = function () {
            hideSuggestions();
        };
    };


    // Инициализируем все дропдауны на странице
    var dropdowns = [];
    var dropdownTags = d.querySelectorAll( '.aka-dropdown' );

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

    var isIE8 = /ie8/.test( d.documentElement.className );

    /**
     * IE8 настолько суров, что стреляет событие resize при появлении/скрытии
     * scrollbar. С помощью нехитрого костыля я пытаюсь игнорировать подобные
     * события.
     */
    var initialWidth = d.documentElement.offsetWidth;

    w.onresize = function () {

        // IE8 fires resize when it shows/hides scrollbars
        if ( d.documentElement.offsetWidth !== initialWidth ) {
            hideDropdownSuggestions();
            initialWidth = d.documentElement.offsetWidth;
        }

        if ( typeof onScrollOriginal === 'function' ) {
            onScrollOriginal();
        }
    };

}( window, document ) );