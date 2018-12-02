import {EventHandler} from "./EventHandler.js";
import {Request} from "./request.js";
import {utils} from "./utils.js";

/**
 * @private
 */
function StaticTreeRenderer(args) {

    var self = this;
    EventHandler.call(this);

    var TOGGLE = self.TOGGLE = 0;
    var SELECT = self.SELECT = 1;
    var SELECT_EXCLUSIVE = self.SELECT_EXCLUSIVE = 2;
    var DESELECT = self.DESELECT = 3;

    var fromXml = false;

    var domNodes = {};
    var selectionState = {};

    this.getOffset = function (elem) {
        var reference = document.getElementById(args['domNode']);
        var y = 0;
        while (true) {
            y += elem.offsetTop;
            if (elem == reference) {
                break;
            }
            elem = elem.offsetParent;
        }
        return y;
    };

    this.setSelected = function (ids, mode) {
        if (mode == SELECT_EXCLUSIVE) {
            self.setSelected(self.getSelected(true), DESELECT);
        }

        ids.forEach(function (id) {
            var s = null;
            if (mode == TOGGLE) {
                s = selectionState[id] = !selectionState[id];
            } else if (mode == SELECT || mode == SELECT_EXCLUSIVE) {
                s = selectionState[id] = true;
            } else if (mode == DESELECT) {
                s = selectionState[id] = false;
            }

            domNodes[id].className = s ? "label selected" : "label";
        });

        var desiredViewRange = self.getSelected().map(function (id) {
            return self.getOffset(domNodes[id]);
        });

        if (desiredViewRange.length) {
            desiredViewRange.sort()
            desiredViewRange = [desiredViewRange[0], desiredViewRange[desiredViewRange.length - 1]];

            var domNode = document.getElementById(args['domNode']);
            var currentViewRange = [domNode.scrollTop, domNode.scrollTop + domNode.offsetHeight];

            if (!(desiredViewRange[0] >= currentViewRange[0] && desiredViewRange[1] <= currentViewRange[1])) {
                if ((desiredViewRange[1] - desiredViewRange[0]) > (currentViewRange[1] - currentViewRange[0])) {
                    domNode.scrollTop = desiredViewRange[0];
                } else {
                    var l = parseInt((desiredViewRange[1] + desiredViewRange[0]) / 2. - (currentViewRange[1] - currentViewRange[0]) / 2., 10);
                    l = Math.max(l, 0);
                    l = Math.min(l, domNode.scrollHeight - domNode.offsetHeight);
                    domNode.scrollTop = l;
                }
            }
        }

        this.fire("selection-changed", [self.getSelected(true)])
    };

    this.getSelected = function (b) {
        b = typeof(b) === 'undefined' ? true : !!b;
        var l = [];
        Object.keys(selectionState).forEach(function (k) {
            if (!!selectionState[k] === b) {
                l.push(k);
            }
        });
        return l;
    };

    var models = [];

    this.addModel = function (args) {
        models.push(args);
        if (args.src) {
            fromXml = true;
        }
    };

    this.qualifyInstance = function (modelId, id) {
        if (fromXml) {
            return id;
        } else {
            return modelId + ":" + id;
        }
    };

    this.build = function () {
        var build = function (modelId, d, n) {
            var qid = self.qualifyInstance(modelId, fromXml ? n.guid : n.id);
            var label = document.createElement("div");
            var children = document.createElement("div");

            label.className = "label";
            label.appendChild(document.createTextNode(n.name || n.guid));
            d.appendChild(label);
            children.className = "children";
            d.appendChild(children);
            domNodes[qid] = label;

            label.onclick = function (evt) {
                evt.stopPropagation();
                evt.preventDefault();
                self.setSelected([qid], evt.shiftKey ? TOGGLE : SELECT_EXCLUSIVE);
                self.fire("click", [qid, self.getSelected(true)]);
                return false;
            };

            for (var i = 0; i < (n.children || []).length; ++i) {
                var child = n.children[i];
                if (fromXml) {
                    if (child["xlink:href"]) continue;
                    if (child.type === "IfcOpeningElement") continue;
                }
                var d2 = document.createElement("div");
                d2.className = "item";
                children.appendChild(d2);
                build(modelId, d2, child);
            }
        }
        models.forEach(function (m) {
            var d = document.createElement("div");
            d.className = "item";
            if (m.tree) {
                build(m.id, d, m.tree);
            } else if (m.src) {
                Request.Make({url: m.src}).then(function (xml) {
                    var json = utils.XmlToJson(xml, {'Name': 'name', 'id': 'guid'});
                    var project = utils.FindNodeOfType(json.children[0], "decomposition")[0].children[0];
                    build(m.id || i, d, project);
                });
            }
            document.getElementById(args['domNode']).appendChild(d);
        });
    }

}

StaticTreeRenderer.prototype = Object.create(EventHandler.prototype);

export {StaticTreeRenderer};
