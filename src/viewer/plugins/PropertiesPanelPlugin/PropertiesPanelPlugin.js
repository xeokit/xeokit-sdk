import {Plugin} from "./../../Plugin.js";

class Section {

    constructor(domNode) {

        this._div = document.createElement("div");
        this._nameh = document.createElement("h3");
        this._table = document.createElement("table");
        const tr = document.createElement("tr");
        this._table.appendChild(tr);

        const nameth = document.createElement("th");
        const valueth = document.createElement("th");

        nameth.appendChild(document.createTextNode("Name"));
        valueth.appendChild(document.createTextNode("Value"));
        tr.appendChild(nameth);
        tr.appendChild(valueth);

        this._div.appendChild(this._nameh);
        this._div.appendChild(this._table);

        domNode.appendChild(this._div);
    }

    setName(name) {
        this._nameh.appendChild(document.createTextNode(name));
    };

    addRow() {
        const tr = document.createElement("tr");
        this._table.appendChild(tr);
        const nametd = document.createElement("td");
        const valuetd = document.createElement("td");
        tr.appendChild(nametd);
        tr.appendChild(valuetd);
        return new Row(nametd, valuetd);
    }
}

class Row {

    constructor(nametd, valuetd) {
        this._nameElem = nametd;
        this._valuetd = valuetd;
        this._num_names = 0;
        this._num_values = 0;
    }

    setName(name) {
        if (this._num_names++ > 0) {
            this._nameElem.appendChild(document.createTextNode(" "));
        }
        this._nameElem.appendChild(document.createTextNode(name));
    }

    setValue(value) {
        if (this._num_values++ > 0) {
            this._valuetd.appendChild(document.createTextNode(", "));
        }
        this._valuetd.appendChild(document.createTextNode(value));
    };
}

/**
 * A {@link Viewer} plugin that renders an HTML panel showing the values of {@link ObjectMetadata#properties} of
 * an {@link ObjectMetadata} within {@link Viewer#metadata}.
 *
 * @example
 *
 * @class PropertiesPanelPlugin
 */
class PropertiesPanelPlugin extends Plugin {

    /**
     * @constructor
     * @param {Viewer} viewer The Viewer.
     * @param {Object} cfg  Plugin configuration.
     * @param {String} [cfg.id="PropertiesPanel"] Optional ID for this plugin, so that we can find it within {@link Viewer#plugins}.
     * @param {String} cfg.domElementId ID of HTML DOM element within which to build the tree.
     */
    constructor(viewer, cfg) {

        super("PropertiesPanel", viewer);

        this._models = {};

        if (!cfg.domElementId) {
            throw "Config expected: domElementId";
        }
        this.domElement = document.getElementById(cfg.domElementId);

        if (!this.domElement) {
            throw "Document element not found: '" + cfg.domElementId + "'";
        }
    }

    addModel(id, model) {
        this._models[id] = model;
    }

    _renderAttributes(elem) {

        var section = new Section(this.domElement);

        section.setName(elem.type || elem.getType());

        ["GlobalId", "Name", "OverallWidth", "OverallHeight", "Tag"].forEach(function (name) {

            var value = elem[name];

            if (typeof(value) === "undefined") {
                var fn = elem["get" + name];
                if (fn) {
                    value = fn.apply(elem);
                }
            }

            if (typeof(value) !== "undefined") {
                const row = section.addRow();
                row.setName(name);
                row.setValue(value);
            }
        });

        return section;
    };

    setSelected(oid) {

        var self = this;

        if (oid.length !== 1) {
            this.domElement.innerHTML = "&nbsp;<br>Select a single element in order to see object properties.";
            return;
        }

        this.domElement.innerHTML = "";

        oid = oid[0];

        if (oid.indexOf(':') !== -1) {
            oid = oid.split(':');
            var o = this._models[oid[0]].model.objects[oid[1]];

            this._renderAttributes(o);

            o.getIsDefinedBy(function (isDefinedBy) {
                if (isDefinedBy.getType() == "IfcRelDefinesByProperties") {
                    isDefinedBy.getRelatingPropertyDefinition(function (pset) {
                        if (pset.getType() == "IfcPropertySet") {
                            self.renderPSet(pset);
                        }
                    });
                }
            });

        } else {

            var o = this._models["1"].model.objects[oid];
            this._renderAttributes(o);
            o.properties.forEach(function (propertySet) {
                self._renderPropertySet(propertySet);
            });
        }
    }

    _renderPropertySet(propertySet) {

        var section = new Section(this.domElement);

        if (propertySet.name && propertySet.children) {

            section.setName(propertySet.name);

            propertySet.children.forEach(function (v) {
                var r = section.addRow();
                r.setName(v.name);
                r.setValue(v.NominalValue);
            });

        } else {

            propertySet.getName(function (name) {
                section.setName(name);
            });

            var render = function (prop, index, row) {
                var r = row || section.addRow();
                prop.getName(function (name) {
                    r.setName(name);
                });
                if (prop.getNominalValue) {
                    prop.getNominalValue(function (value) {
                        r.setValue(value._v);
                    });
                }
                if (prop.getHasProperties) {
                    prop.getHasProperties(function (prop, index) {
                        render(prop, index, r);
                    });
                }
            };

            propertySet.getHasProperties(render);
        }

        return section;
    }
}

export {PropertiesPanelPlugin}
