if (typeof Array.prototype.each === 'undefined') {
    Array.prototype.each = function (func) {
        for (var i = 0; i < this.length; i += 1) {
            func(this[i]);
        }
    };
}

if (typeof console === 'undefined') {
    console = { log: function(msg) { alert(msg); } };
}

if (typeof xhr === 'undefined') {
    xhr = {
        create: function () {
            if (window.XMLHttpRequest && (window.location.protocol !== "file:" || !window.ActiveXObject)) {
                return new window.XMLHttpRequest();
            } else {
                return new window.ActiveXObject("Microsoft.XMLHTTP");
            }
        },
        valid: function (req) {
            return (
                    !req.status &&
                    location.protocol === "file:" ||
                    (
                        req.status >= 200 &&
                        req.status < 300
                    ) ||
                    req.status === 304 ||
                    req.status === 1223 ||
                    req.status === 0
                   );
        }
    }
}

/**
 * Create a new context
 *
 * @param string name Context Name
 * @param object window Window Object to inheret from
 * @param array libs Libraries to load into context
 * @returns object 'window' object for context
 */
var create_context = (function () {

    // Keep track of files loaded
    var ContextCatalog = {};

    return function (name, current_window, libs) {

        // Set default values
        current_window = current_window || window;
        libs = libs || [];
        name = name || 'New Context';

        // Define the new context
        var newContext = {
            window : {
                context_name : name,
                global_window: current_window,
                document : current_window.document,
                alert : function (msg) {
                    current_window.alert(msg);
                },
                console : current_window.console,
                context : {}
            },
            load : function (res) {
                if (typeof ContextCatalog[res] === 'undefined') {
                    var req = xhr.create();
                    req.open('GET', res, false);
                    req.send(null);
                    if (xhr.valid(req)) {
                        ContextCatalog[res] = req.responseText;
                    } else {
                        ContextCatalog[res] = 'throw "' + res + ' could not be loaded!";';
                    }
                }
                return ContextCatalog[res];
            }
        };
        if (libs) {
            libs.each(function (lib) {
                with (newContext) {
                    eval(load(lib));
                }
            });
        }
        return newContext.window;
    }
}());

/**
 * Create a new context or group of context then execute block on load
 *
 * Three was to call:
 *  create_context_onload(contextName, environment, function)
 *      environment looks like:
 *          [contextName, window, libs]
 *  create_context_onload(contextList, function)
 *      contextList looks like:
 *          {
 *              contextOne: [contextName, window, libs],
 *              contextTwo: [contextName, window, libs]
 *          }
 *  create_context_onload(function)
 */
var create_context_onload = (function() {
        return function () {
            var old_load = window.onload;
            if (arguments.length === 3) {
                var contextName = arguments[0];
                var env = arguments[1];
                var func = arguments[2];
            } else if (arguments.length === 2) {
                var contextList = arguments[0];
                var func = arguments[1];
            } else {
                var contextName = 'Anonymous Context';
                var env = [];
                var func = arguments[0];
            }

            // Create the onload
            window.onload = function () {
                if (typeof old_load === 'function') {
                    old_load();
                }
                if (typeof contextList === 'object') {
                    for (context in contextList) {
                        if (contextList.hasOwnProperty(context)) {
                            window[context] = create_context.apply(null, contextList[context]);
                        }
                    }
                } else {
                    window[contextName] = create_context.apply(null, env);
                }
                if (typeof func === 'function') {
                    func();
                }
            };
        };
}());

