import {Dot} from "../html/Dot.js";
import {math} from "../../../viewer/scene/math/math.js";
import {Marker} from "../../../viewer/scene/marker/Marker.js";

const nop = () => { };

export function transformToNode(from, to, vec) {
    const fromRec = from.getBoundingClientRect();
    const toRec = to.getBoundingClientRect();
    vec[0] += fromRec.left - toRec.left;
    vec[1] += fromRec.top  - toRec.top;
};

export function createDraggableDot3D(cfg) {
    const extractCFG = function(propName, defaultValue) {
        if (propName in cfg) {
            return cfg[propName];
        } else if (defaultValue !== undefined) {
            return defaultValue;
        } else {
            throw "config missing: " + propName;
        }
    };

    const viewer = extractCFG("viewer");
    const worldPos = extractCFG("worldPos");
    const color = extractCFG("color");
    const ray2WorldPos = extractCFG("ray2WorldPos");
    const handleMouseEvents = extractCFG("handleMouseEvents", false);
    const handleTouchEvents = extractCFG("handleTouchEvents", false);
    const onStart = extractCFG("onStart", nop);
    const onMove  = extractCFG("onMove",  nop);
    const onEnd   = extractCFG("onEnd",   nop);

    const scene = viewer.scene;
    const canvas = scene.canvas.canvas;

    const marker = new Marker(scene, {});

    const pickWorldPos = canvasPos => {
        const origin = math.vec3();
        const direction = math.vec3();
        math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, canvasPos, origin, direction);
        return ray2WorldPos(origin, direction, canvasPos);
    };

    const onChange = event => {
        const canvasPos = math.vec2([ event.clientX, event.clientY ]);
        transformToNode(canvas.ownerDocument.body, canvas, canvasPos);

        const worldPos = pickWorldPos(canvasPos);
        marker.worldPos = worldPos;
        updateDotPos();
        onMove(canvasPos, worldPos);
    };

    let currentDrag = null;

    const onDragMove = function(event) {
        const e = currentDrag.matchesEvent(event);
        if (e)
        {
            onChange(e);
        }
    };

    const onDragEnd = function(event) {
        const e = currentDrag.matchesEvent(event);
        if (e)
        {
            dot.setOpacity(idleOpacity);
            currentDrag.cleanup();
            onChange(e);
            onEnd();
        }
    };

    const startDrag = function(matchesEvent, cleanupHandlers) {
        if (currentDrag) {
            currentDrag.cleanup();
        }

        dot.setOpacity(1.0);
        dot.setClickable(false);
        viewer.cameraControl.active = false;

        currentDrag = {
            matchesEvent: matchesEvent,
            cleanup: function() {
                currentDrag = null;
                dot.setClickable(true);
                viewer.cameraControl.active = true;
                cleanupHandlers();
            }
        };

        onStart();
    };

    const dotCfg = { fillColor: color };

    if (handleMouseEvents)
    {
        dotCfg.onMouseOver  = () => (! currentDrag) && dot.setOpacity(1.0);
        dotCfg.onMouseLeave = () => (! currentDrag) && dot.setOpacity(idleOpacity);
        dotCfg.onMouseDown  = event => {
            if (event.which === 1)
            {
                canvas.addEventListener("mousemove", onDragMove);
                canvas.addEventListener("mouseup",   onDragEnd);
                startDrag(
                    event => (event.which === 1) && event,
                    () => {
                        canvas.removeEventListener("mousemove", onDragMove);
                        canvas.removeEventListener("mouseup",   onDragEnd);
                    });
            }
        };
    }

    if (handleTouchEvents)
    {
        let touchStartId;
        dotCfg.onTouchstart  = event => {
            event.preventDefault();
            if (event.touches.length === 1)
            {
                touchStartId = event.touches[0].identifier;
                startDrag(
                    event => [...event.changedTouches].find(e => e.identifier === touchStartId),
                    () => { touchStartId = null; });
            }
        };
        dotCfg.onTouchmove = event => {
            event.preventDefault();
            onDragMove(event);
        };
        dotCfg.onTouchend  = event => {
            event.preventDefault();
            onDragEnd(event);
        };
    }

    const dotParent = canvas.ownerDocument.body;
    const dot = new Dot(dotParent, dotCfg);

    const idleOpacity = 0.5;
    dot.setOpacity(idleOpacity);

    const updateDotPos = function() {
        const pos = marker.canvasPos.slice();
        transformToNode(canvas, dotParent, pos);
        dot.setPos(pos[0], pos[1]);
    };

    marker.worldPos = worldPos;
    updateDotPos();

    const onViewMatrix = scene.camera.on("viewMatrix", updateDotPos);
    const onProjMatrix = scene.camera.on("projMatrix", updateDotPos);

    return {
        setActive: value => dot.setClickable(value),
        setWorldPos: pos => { marker.worldPos = pos; updateDotPos(); },
        destroy: function() {
            currentDrag && currentDrag.cleanup();
            scene.camera.off(onViewMatrix);
            scene.camera.off(onProjMatrix);
            marker.destroy();
            dot.destroy();
        }
    };
};

export function activateDraggableDots(cfg) {
    const extractCFG = function(propName, defaultValue) {
        if (propName in cfg) {
            return cfg[propName];
        } else if (defaultValue !== undefined) {
            return defaultValue;
        } else {
            throw "config missing: " + propName;
        }
    };

    const viewer = extractCFG("viewer");
    const handleMouseEvents = extractCFG("handleMouseEvents", false);
    const handleTouchEvents = extractCFG("handleTouchEvents", false);
    const snapping = extractCFG("snapping");
    const pointerLens = extractCFG("pointerLens", null);
    const color = extractCFG("color");
    const markers = extractCFG("markers");
    const onEdit = extractCFG("onEdit", nop);

    const updatePointerLens = (pointerLens
                               ? function(canvasPos) {
                                   pointerLens.visible = !! canvasPos;
                                   if (canvasPos)
                                   {
                                       pointerLens.canvasPos = canvasPos;
                                   }
                               }
                               : () => { });

    const dots = markers.map(marker => {
        let initPos;
        const setCoord = coord => marker.worldPos = coord;

        const dot = createDraggableDot3D({
            handleMouseEvents: handleMouseEvents,
            handleTouchEvents: handleTouchEvents,
            viewer: viewer,
            worldPos: marker.worldPos,
            color: color,
            ray2WorldPos: (orig, dir, canvasPos) => {
                const tryPickWorldPos = snap => {
                    const pickResult = viewer.scene.pick({
                        canvasPos: canvasPos,
                        snapToEdge: snap,
                        snapToVertex: snap,
                        pickSurface: true  // <<------ This causes picking to find the intersection point on the entity
                    });

                    // If - when snapping - no pick found, then try w/o snapping
                    return (pickResult && pickResult.worldPos) ? pickResult.worldPos : (snap && tryPickWorldPos(false));
                };

                return tryPickWorldPos(!!snapping) || initPos;
            },
            onStart: () => {
                initPos = marker.worldPos.slice();
                setOtherDotsActive(false, dot);
            },
            onMove: (canvasPos, worldPos) => {
                updatePointerLens(canvasPos);
                setCoord(worldPos);
            },
            onEnd: () => {
                if (! math.compareVec3(initPos, marker.worldPos))
                {
                    onEdit();
                }
                else
                {
                    dot.setWorldPos(initPos);
                    setCoord(initPos);
                }
                updatePointerLens(null);
                setOtherDotsActive(true, dot);
            }
        });
        return dot;
    });

    const setOtherDotsActive = (active, dot) => dots.forEach(d => (d !== dot) && d.setActive(active));
    setOtherDotsActive(true);

    return function() {
        dots.forEach(m => m.destroy());
        updatePointerLens(null);
    };
}
