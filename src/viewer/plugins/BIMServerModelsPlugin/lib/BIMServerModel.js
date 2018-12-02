/**
 * @private
 */
class BIMServerModel {

    constructor(bimServerAPI, apiModel) {
        this.bimServerAPI = bimServerAPI;
        this.apiModel = apiModel;
        this.tree = null;
        this.treePromise = null;
    }

    getTree(args) {

        /*
         // TODO: This is rather tricky. Never know when the list of Projects is exhausted.
         // Luckily a valid IFC contains one and only one. Let's assume there is just one.
         var projectEncountered = false;

         this.model.getAllOfType("IfcProject", false, function(project) {
         if (projectEncountered) {
         throw new Error("More than a single project encountered, bleh!");
         }
         console.log('project', project);
         });
         */

        var self = this;

        return self.treePromise || (self.treePromise = new Promise(function (resolve, reject) {

            if (self.tree) {
                resolve(self.tree);
            }

            var query =
                {
                    defines: {
                        Representation: {
                            type: "IfcProduct",
                            field: "Representation"
                        },
                        ContainsElementsDefine: {
                            type: "IfcSpatialStructureElement",
                            field: "ContainsElements",
                            include: {
                                type: "IfcRelContainedInSpatialStructure",
                                field: "RelatedElements",
                                includes: [
                                    "IsDecomposedByDefine",
                                    "ContainsElementsDefine",
                                    "Representation"
                                ]
                            }
                        },
                        IsDecomposedByDefine: {
                            type: "IfcObjectDefinition",
                            field: "IsDecomposedBy",
                            include: {
                                type: "IfcRelDecomposes",
                                field: "RelatedObjects",
                                includes: [
                                    "IsDecomposedByDefine",
                                    "ContainsElementsDefine",
                                    "Representation"
                                ]
                            }
                        },
                    },
                    queries: [{
                        type: "IfcProject",
                        includes: [
                            "IsDecomposedByDefine",
                            "ContainsElementsDefine"
                        ]
                    }, {
                        type: "IfcRepresentation",
                        includeAllSubtypes: true
                    }, {
                        type: "IfcProductRepresentation"
                    }, {
                        type: "IfcPresentationLayerWithStyle"
                    }, {
                        type: "IfcProduct",
                        includeAllSubtypes: true
                    }, {
                        type: "IfcProductDefinitionShape"
                    }, {
                        type: "IfcPresentationLayerAssignment"
                    }, {
                        type: "IfcRelAssociatesClassification",
                        includes: [{
                            type: "IfcRelAssociatesClassification",
                            field: "RelatedObjects"
                        }, {
                            type: "IfcRelAssociatesClassification",
                            field: "RelatingClassification"
                        }]
                    }, {
                        type: "IfcSIUnit"
                    }, {
                        type: "IfcPresentationLayerAssignment"
                    }]
                };

            // Perform the download
            self.apiModel.query(query, function (o) {
            }).done(function () {

                // A list of entities that define parent-child relationships
                var entities = {
                    'IfcRelDecomposes': 1,
                    'IfcRelAggregates': 1,
                    'IfcRelContainedInSpatialStructure': 1,
                    'IfcRelFillsElement': 1,
                    'IfcRelVoidsElement': 1
                };

                // Create a mapping from id->instance
                var instance_by_id = {};
                var objects = [];

                for (var e in self.apiModel.objects) {
                    // The root node in a dojo store should have its parent
                    // set to null, not just something that evaluates to false
                    var o = self.apiModel.objects[e].object;
                    o.parent = null;
                    instance_by_id[o._i] = o;
                    objects.push(o);
                }

                // Filter all instances based on relationship entities
                var relationships = objects.filter(function (o) {
                    return entities[o._t];
                });

                // Construct a tuple of {parent, child} ids
                var parents = relationships.map(function (o) {
                    var ks = Object.keys(o);
                    var related = ks.filter(function (k) {
                        return k.indexOf('Related') !== -1;
                    });
                    var relating = ks.filter(function (k) {
                        return k.indexOf('Relating') !== -1;
                    });
                    return [o[relating[0]], o[related[0]]];
                });

                var is_array = function (o) {
                    return Object.prototype.toString.call(o) === '[object Array]';
                };

                var data = [];
                var visited = {};
                parents.forEach(function (a) {
                    // Relationships in IFC can be one to one/many
                    var ps = is_array(a[0]) ? a[0] : [a[0]];
                    var cs = is_array(a[1]) ? a[1] : [a[1]];
                    for (var i = 0; i < ps.length; ++i) {
                        for (var j = 0; j < cs.length; ++j) {
                            // Lookup the instance ids in the mapping
                            var p = instance_by_id[ps[i]._i];
                            var c = instance_by_id[cs[j]._i];

                            // parent, id, hasChildren are significant attributes in a dojo store
                            c.parent = p.id = p._i;
                            c.id = c._i;
                            p.hasChildren = true;

                            // Make sure to only add instances once
                            if (!visited[c.id]) {
                                data.push(c);
                            }
                            if (!visited[p.id]) {
                                data.push(p);
                            }
                            visited[p.id] = visited[c.id] = true;
                        }
                    }
                });

                var make_element = function (o) {
                    return {
                        name: o.Name,
                        id: o.id,
                        guid: o.GlobalId,
                        parent: o.parent,
                        gid: (o._rgeometry == null ? null : o._rgeometry._i)
                    };
                };

                var fold = (function () {
                    var root = null;
                    return function (li) {
                        var by_oid = {};
                        li.forEach(function (elem) {
                            by_oid[elem.id] = elem;
                        });
                        li.forEach(function (elem) {
                            if (elem.parent === null) {
                                root = elem;
                            } else {
                                var p = by_oid[elem.parent];
                                (p.children || (p.children = [])).push(elem);
                            }
                        });
                        return root;
                    }
                })();

                resolve(self.tree = fold(data.map(make_element)));
            });
        }));
    };

}

export {BIMServerModel}