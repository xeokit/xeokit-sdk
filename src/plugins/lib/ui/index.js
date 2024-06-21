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

export class Dot3D extends Marker {
    constructor(scene, markerCfg, parentElement, cfg = {}) {
        super(scene, markerCfg);

        const handler = (cfgEvent, componentEvent) => {
            return event => {
                if (cfgEvent) {
                    cfgEvent(event);
                }
                this.fire(componentEvent, event, true);
            };
        };
        this._dot = new Dot(parentElement, {
            fillColor: cfg.fillColor,
            zIndex: cfg.zIndex,
            onMouseOver:   handler(cfg.onMouseOver,   "mouseover"),
            onMouseLeave:  handler(cfg.onMouseLeave,  "mouseleave"),
            onMouseWheel:  handler(cfg.onMouseWheel,  "wheel"),
            onMouseDown:   handler(cfg.onMouseDown,   "mousedown"),
            onMouseUp:     handler(cfg.onMouseUp,     "mouseup"),
            onMouseMove:   handler(cfg.onMouseMove,   "mousemove"),
            onTouchstart:  handler(cfg.onTouchstart,  "touchstart"),
            onTouchmove:   handler(cfg.onTouchmove,   "touchmove"),
            onTouchend:    handler(cfg.onTouchend,    "touchend"),
            onContextMenu: handler(cfg.onContextMenu, "contextmenu")
        });

        const updateDotPos = () => {
            const pos = this.canvasPos.slice();
            transformToNode(scene.canvas.canvas, parentElement, pos);
            this._dot.setPos(pos[0], pos[1]);
        };

        this.on("worldPos", updateDotPos);

        const onViewMatrix = scene.camera.on("viewMatrix", updateDotPos);
        const onProjMatrix = scene.camera.on("projMatrix", updateDotPos);
        this._cleanup = () => {
            scene.camera.off(onViewMatrix);
            scene.camera.off(onProjMatrix);
            this._dot.destroy();
        };
    }

    setClickable(value) {
        this._dot.setClickable(value);
    }

    setCulled(value) {
        this._dot.setCulled(value);
    }

    setFillColor(value) {
        this._dot.setFillColor(value);
    }

    setHighlighted(value) {
        this._dot.setHighlighted(value);
    }

    setOpacity(value) {
        this._dot.setOpacity(value);
    }

    setVisible(value) {
        this._dot.setVisible(value);
    }

    destroy() {
        this._cleanup();
        super.destroy();
    }

}

export function activateDraggableDot(dot, cfg) {
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
    const ray2WorldPos = extractCFG("ray2WorldPos");
    const handleMouseEvents = extractCFG("handleMouseEvents", false);
    const handleTouchEvents = extractCFG("handleTouchEvents", false);
    const onStart = extractCFG("onStart", nop);
    const onMove  = extractCFG("onMove",  nop);
    const onEnd   = extractCFG("onEnd",   nop);

    const scene = viewer.scene;
    const canvas = scene.canvas.canvas;

    const pickWorldPos = canvasPos => {
        const origin = math.vec3();
        const direction = math.vec3();
        math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, canvasPos, origin, direction);
        return ray2WorldPos(origin, direction, canvasPos);
    };

    const onChange = event => {
        const canvasPos = math.vec2([ event.clientX, event.clientY ]);
        transformToNode(canvas.ownerDocument.body, canvas, canvasPos);
        onMove(canvasPos, pickWorldPos(canvasPos));
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

    const cleanupDotHandlers = [ ];
    const dot_on = function(event, callback) {
        const id = dot.on(event, callback);
        cleanupDotHandlers.push(() => dot.off(id));
    };

    if (handleMouseEvents)
    {
        dot_on("mouseover",  () => (! currentDrag) && dot.setOpacity(1.0));
        dot_on("mouseleave", () => (! currentDrag) && dot.setOpacity(idleOpacity));
        dot_on("mousedown",  event => {
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
        });
    }

    if (handleTouchEvents)
    {
        let touchStartId;
        dot_on("touchstart", event => {
            event.preventDefault();
            if (event.touches.length === 1)
            {
                touchStartId = event.touches[0].identifier;
                startDrag(
                    event => [...event.changedTouches].find(e => e.identifier === touchStartId),
                    () => { touchStartId = null; });
            }
        });
        dot_on("touchmove", event => {
            event.preventDefault();
            onDragMove(event);
        });
        dot_on("touchend",  event => {
            event.preventDefault();
            onDragEnd(event);
        });
    }

    const idleOpacity = 0.8;
    dot.setOpacity(idleOpacity);

    return function() {
        currentDrag && currentDrag.cleanup();
        cleanupDotHandlers.forEach(c => c());
        dot.setOpacity(1.0);
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
    const dots = extractCFG("dots");
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

    const cleanups = dots.map(dot => {
        let initPos;
        return activateDraggableDot(dot, {
            handleMouseEvents: handleMouseEvents,
            handleTouchEvents: handleTouchEvents,
            viewer: viewer,
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
                initPos = dot.worldPos.slice();
                setOtherDotsActive(false, dot);
            },
            onMove: (canvasPos, worldPos) => {
                updatePointerLens(canvasPos);
                dot.worldPos = worldPos;
            },
            onEnd: () => {
                if (! math.compareVec3(initPos, dot.worldPos))
                {
                    onEdit();
                }
                else
                {
                    dot.worldPos = initPos;
                }
                updatePointerLens(null);
                setOtherDotsActive(true, dot);
            }
        });
    });

    const setOtherDotsActive = (active, dot) => dots.forEach(d => (d !== dot) && d.setClickable(active));
    setOtherDotsActive(true);

    return function() {
        cleanups.forEach(c => c());
        updatePointerLens(null);
    };
}
