import {
    addMousePressListener,
    addTouchPressListener,
    AnnotationsPlugin,
    Label3D,
    marker3D,
    math,
    Mesh,
    PhongMaterial,
    PointerCircle,
    PointerLens,
    ReadableGeometry,
    startPolygonCreate,
    Viewer,
    wire3D,
    XKTLoaderPlugin
} from "../../dist/xeokit-sdk.min.es.js";

const tmpVec3 = math.vec3();
const tmpVec4 = math.vec4();

const viewer = new Viewer({
    canvasId: "myCanvas",
    readableGeometryEnabled: true
});

viewer.camera.eye = [-3.93, 2.85, 27.01];
viewer.camera.look = [4.40, 3.72, 8.89];
viewer.camera.up = [-0.01, 0.99, 0.039];
viewer.cameraControl.followPointer = true;

const sceneModel = new XKTLoaderPlugin(viewer).load({
    id: "myModel",
    src: "../../assets/models/xkt/v10/glTF-Embedded/Duplex_A_20110505.glTFEmbedded.xkt",
    edges: true
});

sceneModel.on("loaded", () => {
    viewer.cameraFlight.jumpTo(sceneModel);

    const canvas = window.document.getElementById("myCanvas");
    const scene = viewer.scene;

    const useTouch = ('ontouchstart' in window);

    const useLabel = true;      // whether to use Label3D or Annotation to show area
    const useEdges = true;      // whether to render edges of a completed polygon's Mesh
    const keepMarkers = false;  // whether to keep markers and wires after polygon completed
    const normalOffset = 0.001; // how much to offset the polygon's Mesh along its normal (to avoid Z-fighting)
    const pointerLens = useTouch && new PointerLens(viewer);

    const setupPick = (useTouch
                       ? (onChange => addTouchPressListener(canvas, viewer.cameraControl, new PointerCircle(viewer), onChange))
                       : (onChange => addMousePressListener(canvas, onChange)));

    const createLabel = (useLabel
                         ? function() {
                             let label = null;
                             return {
                                 destroy: () => label && label.destroy(),
                                 setVisible: s => label && label.setVisible(s),
                                 setPosText: (pos, txt) => {
                                     if (! label) {
                                         label = new Label3D(scene, window.document.body, { fillColor: "green" });
                                         label.setClickable(false);
                                     }
                                     label.setPos(pos);
                                     label.setText(txt);
                                 }
                             };
                         }
                         : (function() {
                             const annotations = new AnnotationsPlugin(viewer, {
                                 markerHTML: "<div class='annotation-marker' style='background-color: #008000;'>{{marker}}</div>",
                                 surfaceOffset: 0.1
                             });
                             return function() {
                                 let annotation = null;
                                 return {
                                     destroy: () => annotation && annotation.destroy(),
                                     setVisible: s => annotation && annotation.setMarkerShown(s),
                                     setPosText: (pos, txt) => {
                                         if (! annotation) {
                                             annotation = annotations.createAnnotation({ labelShown: false });
                                         }
                                         annotation.worldPos = pos;
                                         annotation.setField("marker", txt);
                                     }
                                 };
                             };
                         })());

    const pickRayResult = (ray) => {
        const pickResult = viewer.scene.pick({ origin: ray.origin, direction: ray.direction, snapToVertex: true, snapToEdge: true });
        return pickResult && pickResult.entity && pickResult;
    };

    const createPolygon = (onCreate) => {
        let mesh = null;
        const label = createLabel();

        const markers = [ ];
        const wires = [ ];

        const onChange = function(outline, outlineIsClosed, isValid, geometry) {
            markers.forEach(m => m.update(null, null));
            wires.forEach(w => w.update(null, null));

            while (markers.length < outline.length) {
                // append new marker if not enough
                markers.push(marker3D(scene));
            }
            while (wires.length < outline.length - (outlineIsClosed ? 0 : 1)) {
                // append new wire if not enough
                wires.push(wire3D(scene));
            }

            const outlineColor = isValid ? "#008000" : "#d00000";
            outline.forEach((v, i) => {
                const marker = markers[i];
                marker.update(v);
                marker.setFillColor(outlineColor);

                if ((i < outline.length - 1) || outlineIsClosed) {
                    const wire = wires[i];
                    wire.update(v, outline[(i + 1) % outline.length]);
                    wire.setColor(outlineColor);
                }
            });

            if (mesh)
            {
                mesh.destroy();
                mesh = null;
            }

            if (geometry) {
                const indices = [ ].concat(...geometry.faces);

                const verts = geometry.vertices;
                const positions = [ ].concat(...geometry.vertices.map(v => [...v])); // To convert to a flat Array
                mesh = new Mesh(scene, {
                    pickable: false, // otherwise there's a WebGL error inside PickMeshRenderer.prototype.drawMesh
                    geometry: new ReadableGeometry(
                        scene,
                        {
                            indices:   indices,
                            positions: positions,
                            normals:   math.buildNormals(positions, indices)
                        }),
                    material: new PhongMaterial(scene, {
                        alpha: .5,
                        backfaces: true,
                        diffuse: [0, 128, 0]
                    })
                });

                // Translate the mesh by normalOff along its normal towards the camera
                const u      = math.normalizeVec3(math.subVec3(verts[1], verts[0], tmpVec3));
                const v20    = math.normalizeVec3(math.subVec3(verts[2], verts[0], tmpVec4));
                const normal = math.normalizeVec3(math.cross3Vec3(u, v20, tmpVec4));
                normal[3] = 0;
                math.mulMat4v4(scene.camera.viewMatrix, normal, tmpVec4); // plane normal in view space
                mesh.position = math.mulVec3Scalar(normal, Math.sign(tmpVec4[2]) * normalOffset, tmpVec3);

                label.setPosText(mesh.geometry.centroid, mesh.geometry.surfaceArea.toFixed(2) + "u²");
            }

            label.setVisible(!!mesh);
        };

        const onConclude = function() {
            if (! keepMarkers) {
                markers.forEach(m => m.destroy());
                wires.forEach(w => w.destroy());
            }
            mesh.edges = useEdges;
            window.document.removeEventListener("keydown", keydownListener);
            onCreate();
        };

        const interaction = startPolygonCreate(scene, pointerLens, setupPick, pickRayResult, onChange, onConclude);

        const keydownListener = event => {
            switch (event.key) {
            case "Backspace":
                // Remove latest vertex, and update polygon's visuals to the previous state
                if (interaction.popVertex()) {
                    interaction.updateOnChange();
                }
                break;
            case " ":
                // Place a vertex using current pointer's position
                interaction.placeVertex();
                break;
            case "Tab":
                // Close the polygon from the latest placed vertex
                interaction.closePolygon();
            case "Enter":
                // Place a new vertex and close the polygon from there if possible
                if (interaction.placeVertex() && (! interaction.closePolygon())) {
                    interaction.popVertex();
                }
                break;
            case "Escape":
                interaction.cancel();

                label.destroy();
                markers.forEach(m => m.destroy());
                wires.forEach(w => w.destroy());
                mesh && mesh.destroy();
                window.document.removeEventListener("keydown", keydownListener);
                break;
            }
        };
        window.document.addEventListener("keydown", keydownListener);
    };

    createPolygon(() => console.log("Polygon created"));
});
