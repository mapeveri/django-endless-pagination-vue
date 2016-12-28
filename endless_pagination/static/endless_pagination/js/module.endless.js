/**
* @directive: endlessPagination
* @description: Javascript for endless-pagination
*/
Vue.directive('endlessPagination', {
    bind: function (el, binding, arg) {
        // Vanilla Ajax
        function getAjax(url, params, callback) {
            var request = new XMLHttpRequest();
            if(url.split("?").length > 1) {
                for ( property in params ) {
                    url += "&" + property + "=" + params[property]
                }
            }else {
                p = Object.keys(params);
                url += "?" + p[0] + "=" + params[p[0]]
            }

            request.open('GET', url, true);
            request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            request.onload = function() {
                if (request.status >= 200 && request.status < 400) {
                    // Success!
                    var resp = request.responseText;
                    callback(resp);
                } else {
                    // We reached our target server, but it returned an error
                    console.log("Error HTTP Get.");
                }
            };

            request.onerror = function() {
                // There was a connection error of some sort
                console.log("Error HTTP Get.");
            };

            request.send();
        }


        // Closest
        (function (el) {
            el.matches = el.matches || el.mozMatchesSelector || el.msMatchesSelector || el.oMatchesSelector || el.webkitMatchesSelector;
            el.closest = el.closest || function closest(selector) {
                var element = this;
                while (element) {
                    if (element.matches(selector)) {
                        break;
                    }
                    element = element.parentElement;
                }
                return element;
            };
        }(Element.prototype));

        // Polyfill for Element.prototype.matches 
        if ( !Element.prototype.matches ) {
            Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector;
            if ( !Element.prototype.matches ) {
                Element.prototype.matches = function matches( selector ) {
                    var element = this;
                    var matches = ( element.document || element.ownerDocument ).querySelectorAll( selector );
                    var i = 0;
                    while ( matches[i] && matches[i] !== element ) {
                        i++;
                    }
                    return matches[i] ? true : false;
                }
            }
        }

        // Extend function
        function extend() {
            var extended = {};
            var deep = false;
            var i = 0;
            var length = arguments.length;

            // Check if a deep merge
            if ( Object.prototype.toString.call( arguments[0] ) === '[object Boolean]' ) {
                deep = arguments[0];
                i++;
            }

            // Merge the object into the extended object
            var merge = function (obj) {
                for ( var prop in obj ) {
                    if ( Object.prototype.hasOwnProperty.call( obj, prop ) ) {
                        // If deep merge and property is an object, merge properties
                        if ( deep && Object.prototype.toString.call(obj[prop]) === '[object Object]' ) {
                            extended[prop] = extend( true, extended[prop], obj[prop] );
                        } else {
                            extended[prop] = obj[prop];
                        }
                    }
                }
            };

            // Loop through each object and conduct a merge
            for ( ; i < length; i++ ) {
                var obj = arguments[i];
                merge(obj);
            }

            return extended;
        };

        //Defailt settings
        var defaults = {
            // Twitter-style pagination container selector.
            containerSelector: '.endless_container',
            // Twitter-style pagination loading selector.
            loadingSelector: '.endless_loading',
            // Twitter-style pagination link selector.
            moreSelector: 'a.endless_more',
            // Digg-style pagination page template selector.
            pageSelector: '.endless_page_template',
            // Digg-style pagination link selector.
            pagesSelector: 'a.endless_page_link',
            // Callback called when the user clicks to get another page.
            onClick: function() {},
            // Callback called when the new page is correctly displayed.
            onCompleted: function() {},
            // Set this to true to use the paginate-on-scroll feature.
            paginateOnScroll: false,
            // If paginate-on-scroll is on, this margin will be used.
            paginateOnScrollMargin : 1,
            // If paginate-on-scroll is on, it is possible to define chunks.
            paginateOnScrollChunkSize: 0
        };
        
        //Extend settings
        var settings = extend(defaults, (binding.expression ? eval('(' + binding.expression + ')') : ""));

        //Content pagination
        var getContext = function(link) {
            return {
                key: link.getAttribute('rel').split(' ')[0],
                url: link.getAttribute('href')
            };
        };

        // Twitter-style pagination.
        var loadedPages = 1;
        el.addEventListener('click', function (ev) {
            if(ev.target.matches(settings.moreSelector)) {
		        ev.preventDefault();
                var link = ev.target;
                var container = link.closest(settings.containerSelector);
                var loading = document.querySelector(settings.loadingSelector);
                // Avoid multiple Ajax calls.
                if (loading.offsetWidth > 0 && loading.offsetHeight > 0) {
                    ev.preventDefault();
                }
                link.style.display="none";
                loading.style.display="block";
                var context = getContext(link);
                //For get function onClick
                if (typeof(settings.onClick) === "string") {
                    var onClick = eval(arg.context.$options.methods[settings.onClick]);
                }else {
                    var onClick = settings.onClick;
                }

                //For get function onComplete
                if (typeof(settings.onCompleted) === "string") {
                    var onCompleted = eval(arg.context.$options.methods[settings.onCompleted]);
                }else {
                    var onCompleted = settings.onCompleted;
                }

                // Fire onClick callback.
                if (onClick.apply(link, [context]) !== false) {
                    // Send the Ajax request.
                    getAjax(context.url, {querystring_key: context.key}, function(fragment) {
                        var e = document.createElement('div');
                        e.innerHTML = fragment;
                        if (container.parentElement != null ){
                            container.parentElement.appendChild(e);
                            container.remove();
                            // Increase the number of loaded pages.
                            loadedPages += 1;
                            // Fire onCompleted callback.
                            onCompleted.apply(link, [context, fragment.trim()]);
                        }
                    });
                }
            }
        });

        // On scroll pagination.
        if (settings.paginateOnScroll) {
            window.addEventListener("scroll", function() {
                if (document.body.offsetHeight - window.innerHeight -
                    window.pageYOffset <= settings.paginateOnScrollMargin) {
                    // Do not paginate on scroll if chunks are used and
                    // the current chunk is complete.
                    var chunckSize = settings.paginateOnScrollChunkSize;
                    if (!chunckSize || loadedPages % chunckSize) {
                        if(document.querySelector(settings.moreSelector) != null){
                            document.querySelector(settings.moreSelector).click();
                        }
                    }
                }
            });
        }

        // Digg-style pagination.
        el.addEventListener('click', function (ev) {
            if(ev.target.matches(settings.pagesSelector)) {
		        ev.preventDefault();
                var link = ev.target;
                var context = getContext(link);
                //For get function onClick
                if (typeof(settings.onClick) === "string") {
                    var onClick = eval(arg.context.$options.methods[settings.onClick]);
                }else {
                    var onClick = settings.onClick;
                }

                //For get function onComplete
                if (typeof(settings.onCompleted) === "string") {
                    var onCompleted = eval(arg.context.$options.methods[settings.onCompleted]);
                }else {
                    var onCompleted = settings.onCompleted;
                }

                // Fire onClick callback.
                if (onClick.apply(link, [context]) !== false) {
                    var page_template = link.closest(settings.pageSelector);
                    //var data = '&querystring_key=' + context.key;
                    // Send the Ajax request.
                    getAjax(context.url, {querystring_key: context.key}, function(fragment) {
                        page_template.innerHTML = fragment;
                        onCompleted.apply(link, [context, fragment.trim()]);
                    });
                }
            }
        });
    }
});
