/**
 * @private
 */
function xmlToJson(node, attributeRenamer) {
    if (node.nodeType === node.TEXT_NODE) {
        var v = node.nodeValue;
        if (v.match(/^\s+$/) === null) {
            return v;
        }
    } else if (node.nodeType === node.ELEMENT_NODE ||
        node.nodeType === node.DOCUMENT_NODE) {
        var json = {type: node.nodeName, children: []};

        if (node.nodeType === node.ELEMENT_NODE) {
            for (var j = 0; j < node.attributes.length; j++) {
                var attribute = node.attributes[j];
                var nm = attributeRenamer[attribute.nodeName] || attribute.nodeName;
                json[nm] = attribute.nodeValue;
            }
        }

        for (var i = 0; i < node.childNodes.length; i++) {
            var item = node.childNodes[i];
            var j = xmlToJson(item, attributeRenamer);
            if (j) json.children.push(j);
        }

        return json;
    }
}

/**
 * @private
 */
function clone(ob) {
    return JSON.parse(JSON.stringify(ob));
}

/**
 * @private
 */
var guidChars = [["0", 10], ["A", 26], ["a", 26], ["_", 1], ["$", 1]].map(function (a) {
    var li = [];
    var st = a[0].charCodeAt(0);
    var en = st + a[1];
    for (var i = st; i < en; ++i) {
        li.push(i);
    }
    return String.fromCharCode.apply(null, li);
}).join("");

/**
 * @private
 */
function b64(v, len) {
    var r = (!len || len === 4) ? [0, 6, 12, 18] : [0, 6];
    return r.map(function (i) {
        return guidChars.substr(parseInt(v / (1 << i)) % 64, 1)
    }).reverse().join("");
}

/**
 * @private
 */
function compressGuid(g) {
    var bs = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30].map(function (i) {
        return parseInt(g.substr(i, 2), 16);
    });
    return b64(bs[0], 2) + [1, 4, 7, 10, 13].map(function (i) {
        return b64((bs[i] << 16) + (bs[i + 1] << 8) + bs[i + 2]);
    }).join("");
}

/**
 * @private
 */
function findNodeOfType(m, t) {
    var li = [];
    var _ = function (n) {
        if (n.type === t) li.push(n);
        (n.children || []).forEach(function (c) {
            _(c);
        });
    };
    _(m);
    return li;
}

/**
 * @private
 */
function timeout(dt) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, dt);
    });
}

/**
 * @private
 */
function httpRequest(args) {
    return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open(args.method || "GET", args.url, true);
        xhr.onload = function (e) {
            console.log(args.url, xhr.readyState, xhr.status)
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    resolve(xhr.responseXML);
                } else {
                    reject(xhr.statusText);
                }
            }
        };
        xhr.send(null);
    });
}

/**
 * @private
 */
var queryString = function () {
    // This function is anonymous, is executed immediately and
    // the return value is assigned to QueryString!
    var query_string = {};
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        // If first entry with this name
        if (typeof query_string[pair[0]] === "undefined") {
            query_string[pair[0]] = decodeURIComponent(pair[1]);
            // If second entry with this name
        } else if (typeof query_string[pair[0]] === "string") {
            var arr = [query_string[pair[0]], decodeURIComponent(pair[1])];
            query_string[pair[0]] = arr;
            // If third or later entry with this name
        } else {
            query_string[pair[0]].push(decodeURIComponent(pair[1]));
        }
    }
    return query_string;
}();


/**
 * @private
 */
var delay = function (dt) {
    return new Promise(function (resolve, reject) {
        setTimeout(resolve, dt);
    });
};

/**
 * @private
 */
function loadJSON(url, ok, err) {
    // Avoid checking ok and err on each use.
    var defaultCallback = (_value) => undefined;
    ok = ok || defaultCallback;
    err = err || defaultCallback;

    var request = new XMLHttpRequest();
    request.overrideMimeType("application/json");
    request.open('GET', url, true);
    request.addEventListener('load', function (event) {
        var response = event.target.response;
        if (this.status === 200) {
            try {
                ok(JSON.parse(response));
            } catch(e) {
                err(`loadJSON(): Failed to parse JSON response - ${e}`);
            }
        } else if (this.status === 0) {
            // Some browsers return HTTP Status 0 when using non-http protocol
            // e.g. 'file://' or 'data://'. Handle as success.
            console.warn('loadFile: HTTP Status 0 received.');
            ok(response);
        } else {
            err(event);
        }
    }, false);

    request.addEventListener('error', function (event) {
        err(event);
    }, false);
    request.send(null);
}

export {xmlToJson, clone, compressGuid, findNodeOfType, timeout, httpRequest, loadJSON, queryString};
    
