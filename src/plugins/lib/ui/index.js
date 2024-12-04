import {Dot} from "../html/Dot.js";
import {Label} from "../html/Label.js";
import {Wire} from "../html/Wire.js";
import {math} from "../../../viewer/scene/math/math.js";
import {Marker} from "../../../viewer/scene/marker/Marker.js";

const tmpVec2a = math.vec2();
const tmpVec2b = math.vec2();
const tmpVec2c = math.vec2();
const tmpVec2d = math.vec2();
const tmpVec3a = math.vec3();
const tmpVec3b = math.vec3();
const tmpVec4a = math.vec4();
const tmpVec4b = math.vec4();
const tmpVec4c = math.vec4();
const tmpVec4d = math.vec4();
const tmpMat4  = math.mat4();

const nop = () => { };

export function transformToNode(from, to, vec) {
    const fromRec = from.getBoundingClientRect();
    const toRec = to.getBoundingClientRect();
    vec[0] += fromRec.left - toRec.left;
    vec[1] += fromRec.top  - toRec.top;
};

const toClipSpace = (camera, worldPos, p) => {
    // The reason the projMatrix is explicitely fetched as below is a complex callback chain
    // leading from a boundary update to a viewMatrix and projMatrix updates, which change their values
    // in the mid of the toClipSpace, leading to incorrect values.
    // The fetch ensures that matrix values are stabilized before used to transform worldPos to p.
    // Better solution would be to ensure that no mutually-triggered callbacks
    // (like boundary => view/projMatrix in this situation) ever happen, so user code can rely
    // on a callback running in a stable context.
    tmpMat4.set(camera.viewMatrix);
    tmpMat4.set(camera.projMatrix);
    // to homogeneous coords
    p.set(worldPos);
    p[3] = 1;

    // to clip space
    math.mulMat4v4(camera.viewMatrix, p, p);
    math.mulMat4v4(camera.projMatrix, p, p);
};

const toCanvasSpace = (canvas, parentElement, ndc, p) => {
    p[0] = (1 + ndc[0]) * 0.5 * canvas.offsetWidth;
    p[1] = (1 - ndc[1]) * 0.5 * canvas.offsetHeight;
    transformToNode(canvas, parentElement, p);
};

const clipSegment = (scene, parentElement, start, end, canvasStart, canvasEnd) => {
    const camera = scene.camera;
    const canvas = scene.canvas.canvas;

    if (math.distVec3(start, end) < 0.001) {
        return false;
    }

    const delta = math.subVec3(end, start, tmpVec3a);
    let s_min = 0.0;
    let s_max = 1.0;

    for (let plane of scene._sectionPlanesState.sectionPlanes) {
        const endDot   = math.dotVec3(plane.dir, math.subVec3(plane.pos, end,   tmpVec3b));
        const startDot = math.dotVec3(plane.dir, math.subVec3(plane.pos, start, tmpVec3b));

        if ((startDot > 0) && (endDot > 0)) {
            return false;
        } else if ((startDot > 0) || (endDot > 0)) {
            const denom = math.dotVec3(plane.dir, delta);
            if (Math.abs(denom) >= 1e-6) {
                const ratio = math.dotVec3(plane.dir, tmpVec3b) / denom;
                if (startDot > 0) {
                    s_min = Math.max(s_min, ratio);
                } else {
                    s_max = Math.min(s_max, ratio);
                }
            }
        }
    }

    const p0 = tmpVec4a;
    const p1 = tmpVec4b;
    toClipSpace(camera, (s_min > 0) ? math.addVec3(start, math.mulVec3Scalar(delta, s_min, tmpVec3b), tmpVec3b) : start, p0);
    toClipSpace(camera, (s_max < 1) ? math.addVec3(start, math.mulVec3Scalar(delta, s_max, tmpVec3b), tmpVec3b) : end,   p1);

    const p0Behind = ((p0[2] / p0[3]) < -1) || (p0[3] < 0);
    const p1Behind = ((p1[2] / p1[3]) < -1) || (p1[3] < 0);
    if (p0Behind && p1Behind) {
        return false;
    }

    const t = (p0[3] + p0[2]) / ((p0[3] + p0[2]) - (p1[3] + p1[2]));

    if ((t > 0) && (t < 1)) { //p0Behind || p1Behind) {
        // Find the intersection of a segment with the near plane in clip space, if it exists."""
        // Calculate the interpolation factor t where the line segment crosses the near plane
        const delta = math.subVec4(p1, p0, tmpVec4c);
        math.mulVec4Scalar(delta, t, delta);
        math.addVec4(p0, delta, p0Behind ? p0 : p1);
    }

    // normalize clip space coords
    math.mulVec4Scalar(p0, 1.0 / p0[3]);
    math.mulVec4Scalar(p1, 1.0 / p1[3]);

    let t_min = 0.0;
    let t_max = 1.0;

    // If either point is outside the view frustum, clip the line segment

    for (let i = 0; i < 2; ++i) {
        const denom = p1[i] - p0[i];

        const l = (-p0[3] - p0[i]) / denom;
        const r = ( p0[3] - p0[i]) / denom;

        if (denom > 0) {
            t_min = Math.max(t_min, l);
            t_max = Math.min(t_max, r);
        } else {
            t_min = Math.max(t_min, r);
            t_max = Math.min(t_max, l);
        }
    }

    if (t_min >= t_max) {
        return false;
    }

    // Calculate the clipped start and end points
    const ndcDelta = math.subVec4(p1, p0, tmpVec4c);
    math.addVec4(p0, math.mulVec4Scalar(ndcDelta, t_max, tmpVec4d), p1);
    math.addVec4(p0, math.mulVec4Scalar(ndcDelta, t_min, tmpVec4d), p0);

    math.mulVec4Scalar(p0, 1 / p0[3]);
    math.mulVec4Scalar(p1, 1 / p1[3]);

    toCanvasSpace(canvas, parentElement, p0, canvasStart);
    toCanvasSpace(canvas, parentElement, p1, canvasEnd);

    return true;
};

export class Dot3D extends Marker {
    constructor(scene, markerCfg, parentElement, cfg = {}) {
        const camera = scene.camera;

        super(scene, markerCfg);

        this.__visible = true;  // "__" to not interfere with Marker::_visible

        const handler = (cfgEvent, componentEvent) => {
            return event => {
                if (cfgEvent) {
                    cfgEvent(event);
                }
                this.fire(componentEvent, event, true);
            };
        };
        this._dot = new Dot(parentElement, {
            borderColor: cfg.borderColor,
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

        const toClipSpace = (worldPos, p) => {
            // to homogeneous coords
            p.set(worldPos);
            p[3] = 1;

            // to clip space
            math.mulMat4v4(camera.viewMatrix, p, p);
            math.mulMat4v4(camera.projMatrix, p, p);
        };

        const toCanvasSpace = ndc => {
            const canvas = scene.canvas.canvas;
            ndc[0] = (1 + ndc[0]) * 0.5 * canvas.offsetWidth;
            ndc[1] = (1 - ndc[1]) * 0.5 * canvas.offsetHeight;
            transformToNode(canvas, parentElement, ndc);
        };

        const updateDotPos = () => {
            if (! this.__visible) {
                return;
            }
            const p0 = tmpVec4c;
            toClipSpace(this.worldPos, p0);
            math.mulVec3Scalar(p0, 1.0 / p0[3]);

            const outsideFrustum = ((p0[3] < 0)
                                    ||
                                    (p0[0] < -1) || (p0[0] > 1)
                                    ||
                                    (p0[1] < -1) || (p0[1] > 1)
                                    ||
                                    (p0[2] < -1) || (p0[2] > 1));
            const culled = outsideFrustum || scene._sectionPlanesState.sectionPlanes.some(
                plane => (math.dotVec3(plane.dir, math.subVec3(plane.pos, this.worldPos, tmpVec3a)) > 0));

            this._dot.setCulled(culled);
            if (!culled) {
                toCanvasSpace(p0);
                this._dot.setPos(p0[0], p0[1]);
            }
        };

        this.on("worldPos", updateDotPos);

        const onViewMatrix = camera.on("viewMatrix", updateDotPos);
        const onProjMatrix = camera.on("projMatrix", updateDotPos);
        const onCanvasBnd  = scene.canvas.on("boundary", updateDotPos);
        const planesUpdate = scene.on("sectionPlaneUpdated", updateDotPos);

        this._updatePosition = updateDotPos;

        this._cleanup = () => {
            camera.off(onViewMatrix);
            camera.off(onProjMatrix);
            scene.canvas.off(onCanvasBnd);
            scene.off(planesUpdate);
            this._dot.destroy();
        };
    }

    setClickable(value) {
        this._dot.setClickable(value);
    }

    setFillColor(value) {
        this._dot.setFillColor(value);
    }

    setBorderColor(value) {
        this._dot.setBorderColor(value);
    }

    setHighlighted(value) {
        this._dot.setHighlighted(value);
    }

    setOpacity(value) {
        this._dot.setOpacity(value);
    }

    setVisible(value) {
        if (this.__visible != value) {
            this.__visible = value;
            this._updatePosition();
            this._dot.setVisible(value);
        }
    }

    destroy() {
        this._cleanup();
        super.destroy();
    }

}

export class Label3D {
    constructor(scene, parentElement, cfg) {
        const camera = scene.camera;

        this._label = new Label(parentElement, cfg);
        this._start = math.vec3();
        this._mid   = math.vec3();
        this._end   = math.vec3();
        this._yOff  = 0;
        this._betweenWires = false;
        this.__visible = true;

        const setPosOnWire = (p0, p1, yOff) => {
            p0[0] += p1[0];
            p0[1] += p1[1];
            math.mulVec2Scalar(p0, .5);
            this._label.setPos(p0[0], p0[1] + yOff);
        };

        this._updatePositions = () => {
            if (! this.__visible) {
                return;
            }
            if (this._betweenWires) {
                const visibleA = clipSegment(scene, parentElement, this._start, this._mid, tmpVec2a, tmpVec2b);
                const visibleB = clipSegment(scene, parentElement, this._end,   this._mid, tmpVec2c, tmpVec2d);
                this._label.setCulled(! (visibleA || visibleB));
                if (visibleA && visibleB) {
                    tmpVec2b[0] += tmpVec2d[0];
                    tmpVec2b[1] += tmpVec2d[1];
                    math.mulVec2Scalar(tmpVec2b, .5);

                    tmpVec2b[0] += tmpVec2a[0] + tmpVec2c[0];
                    tmpVec2b[1] += tmpVec2a[1] + tmpVec2c[1];
                    math.mulVec2Scalar(tmpVec2b, 1/3);
                    this._label.setPos(tmpVec2b[0], tmpVec2b[1]);
                } else if (visibleA) {
                    setPosOnWire(tmpVec2a, tmpVec2b, 0);
                } else if (visibleB) {
                    setPosOnWire(tmpVec2c, tmpVec2d, 0);
                }
            } else {
                const visible = (clipSegment(scene, parentElement, this._start, this._end, tmpVec2a, tmpVec2b)
                                 &&
                                 (math.distVec2(tmpVec2a, tmpVec2b) >= this._labelMinAxisLength));
                this._label.setCulled(!visible);
                if (visible) {
                    setPosOnWire(tmpVec2a, tmpVec2b, this._yOff);
                }
            }
        };

        const onViewMatrix = camera.on("viewMatrix", this._updatePositions);
        const onProjMatrix = camera.on("projMatrix", this._updatePositions);
        const onCanvasBnd  = scene.canvas.on("boundary", this._updatePositions);
        const planesUpdate = scene.on("sectionPlaneUpdated", this._updatePositions);

        this._cleanup = () => {
            camera.off(onViewMatrix);
            camera.off(onProjMatrix);
            scene.canvas.off(onCanvasBnd);
            scene.off(planesUpdate);
            this._label.destroy();
        };
    }

    setPosOnWire(p0, p1, yOff, labelMinAxisLength) {
        this._start.set(p0);
        this._end.set(p1);
        this._yOff = yOff;
        this._labelMinAxisLength = labelMinAxisLength;
        this._betweenWires = false;
        this._updatePositions();
    }

    setPosBetween(p0, p1, p2) {
        this._start.set(p0);
        this._mid.set(p1);
        this._end.set(p2);
        this._betweenWires = true;
        this._updatePositions();
    }

    setFillColor(value) {
        this._label.setFillColor(value);
    }

    setHighlighted(value) {
        this._label.setHighlighted(value);
    }

    setText(value) {
        this._label.setText(value);
    }

    setClickable(value) {
        this._label.setClickable(value);
    }

    setVisible(value) {
        if (this.__visible != value) {
            this.__visible = value;
            this._updatePositions();
            this._label.setVisible(value);
        }
    }

    destroy() {
        this._cleanup();
    }

}

export class Wire3D {
    constructor(scene, parentElement, cfg) {
        const camera = scene.camera;

        this._wire  = new Wire(parentElement, cfg);
        this._start = math.vec3();
        this._end   = math.vec3();
        this.__visible = true;

        this._updatePositions = () => {
            if (! this.__visible) {
                return;
            }
            const visible = clipSegment(scene, parentElement, this._start, this._end, tmpVec2a, tmpVec2b);
            this._wire.setCulled(! visible);
            if (visible) {
                this._wire.setStartAndEnd(tmpVec2a[0], tmpVec2a[1], tmpVec2b[0], tmpVec2b[1]);
            }
        };

        const onViewMatrix = camera.on("viewMatrix", this._updatePositions);
        const onProjMatrix = camera.on("projMatrix", this._updatePositions);
        const onCanvasBnd  = scene.canvas.on("boundary", this._updatePositions);
        const planesUpdate = scene.on("sectionPlaneUpdated", this._updatePositions);

        this._cleanup = () => {
            camera.off(onViewMatrix);
            camera.off(onProjMatrix);
            scene.canvas.off(onCanvasBnd);
            scene.off(planesUpdate);
            this._wire.destroy();
        };
    }

    setEnds(start, end) {
        this._start.set(start);
        this._end.set(end);
        this._updatePositions();
    }

    setClickable(value) {
        this._wire.setClickable(value);
    }

    setColor(value) {
        this._wire.setColor(value);
    }

    setHighlighted(value) {
        this._wire.setHighlighted(value);
    }

    setOpacity(value) {
        this._wire.setOpacity(value);
    }

    setVisible(value) {
        if (this.__visible != value) {
            this.__visible = value;
            this._updatePositions();
            this._wire.setVisible(value);
        }
    }

    destroy() {
        this._cleanup();
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
        math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, scene.camera.projection, canvasPos, origin, direction);
        return ray2WorldPos(origin, direction, canvasPos);
    };

    const onChange = event => {
        const canvasPos = math.vec2([ event.clientX, event.clientY ]);
        transformToNode(canvas.ownerDocument.documentElement, canvas, canvasPos);
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
    const pointerLens = extractCFG("pointerLens", null);
    const dots = extractCFG("dots");
    const ray2WorldPos = extractCFG("ray2WorldPos");
    const onEnd = extractCFG("onEnd", nop);

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
            ray2WorldPos: (orig, dir, canvasPos) => (ray2WorldPos(orig, dir, canvasPos) || initPos),
            onStart: () => {
                initPos = dot.worldPos.slice();
                setOtherDotsActive(false, dot);
            },
            onMove: (canvasPos, worldPos) => {
                updatePointerLens(canvasPos);
                dot.worldPos = worldPos;
            },
            onEnd: () => {
                if (! onEnd(initPos, dot)) {
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

export const touchPointSelector = function(viewer, pointerCircle, ray2WorldPos) {
    return function(onCancel, onChange, onCommit) {
        const scene = viewer.scene;
        const canvas = scene.canvas.canvas;
        const longTouchTimeoutMs = 300;
        const moveTolerance = 20;

        const copyCanvasPos = (event, vec2) => {
            vec2[0] = event.clientX;
            vec2[1] = event.clientY;
            transformToNode(canvas.ownerDocument.documentElement, canvas, vec2);
            return vec2;
        };

        const pickWorldPos = canvasPos => {
            const origin = math.vec3();
            const direction = math.vec3();
            math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, scene.camera.projection, canvasPos, origin, direction);
            return ray2WorldPos(origin, direction);
        };

        let longTouchTimeout = null;
        const nop = () => { };
        let onSingleTouchMove = nop;
        let startTouchIdentifier;

        const resetAction = function() {
            pointerCircle.stop();
            clearTimeout(longTouchTimeout);
            viewer.cameraControl.active = true;
            onSingleTouchMove = nop;
            startTouchIdentifier = null;
        };

        const cleanup = function() {
            resetAction();
            canvas.removeEventListener("touchstart", onCanvasTouchStart);
            canvas.removeEventListener("touchmove",  onCanvasTouchMove);
            canvas.removeEventListener("touchend",   onCanvasTouchEnd);
        };

        const onCanvasTouchStart = function(event) {
            const touches = event.touches;

            if (touches.length !== 1)
            {
                resetAction();
                onCancel();
            }
            else
            {
                const startTouch = touches[0];
                const startCanvasPos = copyCanvasPos(startTouch, math.vec2());

                const startWorldPos = pickWorldPos(startCanvasPos);
                if (startWorldPos)
                {
                    startTouchIdentifier = startTouch.identifier;

                    onSingleTouchMove = canvasPos => {
                        if (math.distVec2(startCanvasPos, canvasPos) > moveTolerance)
                        {
                            resetAction();
                        }
                    };

                    longTouchTimeout = setTimeout(
                        function() {
                            pointerCircle.start(startCanvasPos);

                            longTouchTimeout = setTimeout(
                                function() {
                                    pointerCircle.stop();

                                    viewer.cameraControl.active = false;

                                    onSingleTouchMove = canvasPos => {
                                        onChange(canvasPos, pickWorldPos(canvasPos));
                                    };

                                    onSingleTouchMove(startCanvasPos);
                                },
                                longTouchTimeoutMs);
                        },
                        250);
                }
            }
        };
        canvas.addEventListener("touchstart", onCanvasTouchStart, {passive: true});

        // canvas.addEventListener("touchcancel", e => console.log("touchcancel", e), {passive: true});

        const onCanvasTouchMove = function(event) {
            const touch = [...event.changedTouches].find(e => e.identifier === startTouchIdentifier);
            if (touch)
            {
                onSingleTouchMove(copyCanvasPos(touch, math.vec2()));
            }
        };
        canvas.addEventListener("touchmove", onCanvasTouchMove, {passive: true});

        const onCanvasTouchEnd = function(event) {
            const touch = [...event.changedTouches].find(e => e.identifier === startTouchIdentifier);
            if (touch)
            {
                cleanup();
                const canvasPos = copyCanvasPos(touch, math.vec2());
                onCommit(canvasPos, pickWorldPos(canvasPos));
            }
        };
        canvas.addEventListener("touchend", onCanvasTouchEnd, {passive: true});

        return cleanup;
    };
};
