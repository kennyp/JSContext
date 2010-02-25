/**
 * JSContext
 * Copyright (C) 2010 Kenny Parnell <kparnell@redventures.com>
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published 
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
if (typeof Array.prototype.each === 'undefined') {
    Array.prototype.each = function (func) {
        for (var i = 0; i < this.length; i += 1) {
            func(this[i]);
        }
    };
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

var JSContext = {
    alrt : function (msg) {
        var myDiv = document.createElement('div');
        myDiv.innerHTML = msg.replace('\n','<br/>').replace(/\n/,'<br/>') + '<br/>';
        with (myDiv.style) {
            backgroundColor = 'silver';
            textAlign = 'center';
            border = '1px solid black';
            left = '50%';
            top = '180px';

            var userAgent = navigator.userAgent.toLowerCase();
            if (/msie/.test(userAgent) && !/opera/.test(userAgent)) {
                position = 'relative';
            } else {
                position = 'absolute';
            }
        }
        var myButton = document.createElement('button');
        myButton.innerHTML = 'OK';
        myButton.onclick = function () {
            document.getElementsByTagName('body')[0].removeChild(myDiv);
        };
        myDiv.appendChild(myButton);
        document.getElementsByTagName('body')[0].appendChild(myDiv);
    },
    log : function (msg) {
        console.log(msg);
    },
    dir : function (obj) {
        console.dir(obj);
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
            window : (function () {
                function F() {}
                F.prototype = current_window;
                var f = new F();
                f.context_name = name;
                f.global_window = current_window;
                f.document = current_window.document;
                f.context = {
                    alrt : JSContext.alrt,
                    dir : JSContext.dir,
                    log : JSContext.log
                };
                return f;
            }()),
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

