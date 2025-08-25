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
const tmpRay = {
    origin:    math.vec3(),
    direction: math.vec3()
};

const nop = () => { };

const planeIntersect = function(p0, n, origin, direction) {
    const t = (p0 - math.dotVec3(origin, n)) / math.dotVec3(direction, n);
    if (t < 0)
    {
        return null;
    }
    else
    {
        const worldPos = math.vec3();
        math.mulVec3Scalar(direction, t, worldPos);
        math.addVec3(origin, worldPos, worldPos);
        return worldPos;
    }
};

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

        const l = (-1 - p0[i]) / denom;
        const r = ( 1 - p0[i]) / denom;

        if (denom > 0) {
            t_min = Math.max(t_min, l);
            t_max = Math.min(t_max, r);
        } else if (denom < 0) {
            t_min = Math.max(t_min, r);
            t_max = Math.min(t_max, l);
        } else {
            if (p0[0] < -1) {
                t_min = -window.Infinity;
            } else if (p0[0] > 1) {
                t_max = window.Infinity;
            }
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
        const planeCreated = scene.on("sectionPlaneCreated", updateDotPos);
        const planeDestroyed = scene.on("sectionPlaneDestroyed", updateDotPos);

        this._updatePosition = updateDotPos;

        this._cleanup = () => {
            camera.off(onViewMatrix);
            camera.off(onProjMatrix);
            scene.canvas.off(onCanvasBnd);
            scene.off(planesUpdate);
            scene.off(planeCreated);
            scene.off(planeDestroyed);
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
        this.__visible = true;

        this._updatePos = () => {
            toClipSpace(camera, this._start, tmpVec4a);
            math.mulVec4Scalar(tmpVec4a, 1.0 / tmpVec4a[3]);
            toCanvasSpace(scene.canvas.canvas, parentElement, tmpVec4a, tmpVec2a);
            this._label.setPos(tmpVec2a[0], tmpVec2a[1]);
        };

        const setPosOnWire = (p0, p1, yOff) => {
            p0[0] += p1[0];
            p0[1] += p1[1];
            math.mulVec2Scalar(p0, .5);
            this._label.setPos(p0[0], p0[1] + yOff);
        };

        this._updatePosBetween = () => {
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
        };

        this._updatePosOnWire = () => {
            const visible = (clipSegment(scene, parentElement, this._start, this._end, tmpVec2a, tmpVec2b)
                             &&
                             (math.distVec2(tmpVec2a, tmpVec2b) >= this._labelMinAxisLength));
            this._label.setCulled(!visible);
            if (visible) {
                setPosOnWire(tmpVec2a, tmpVec2b, this._yOff);
            }
        };

        let posUpdate = () => { };
        this._setUpdatePositions = (_posUpdate) => {
            posUpdate = _posUpdate;
            this._updatePositions();
        };
        this._updatePositions = () => {
            if (this.__visible) {
                posUpdate();
            }
        };

        const onViewMatrix = camera.on("viewMatrix", this._updatePositions);
        const onProjMatrix = camera.on("projMatrix", this._updatePositions);
        const onCanvasBnd  = scene.canvas.on("boundary", this._updatePositions);
        const planesUpdate = scene.on("sectionPlaneUpdated", this._updatePositions);
        const planeCreated = scene.on("sectionPlaneCreated", this._updatePositions);
        const planeDestroyed = scene.on("sectionPlaneDestroyed", this._updatePositions);

        this._cleanup = () => {
            camera.off(onViewMatrix);
            camera.off(onProjMatrix);
            scene.canvas.off(onCanvasBnd);
            scene.off(planesUpdate);
            scene.off(planeCreated);
            scene.off(planeDestroyed);
            this._label.destroy();
        };
    }

    setPos(p0) {
        this._start.set(p0);
        this._setUpdatePositions(this._updatePos);
    }

    setPosOnWire(p0, p1, yOff, labelMinAxisLength) {
        this._start.set(p0);
        this._end.set(p1);
        this._yOff = yOff;
        this._labelMinAxisLength = labelMinAxisLength;
        this._setUpdatePositions(this._updatePosOnWire);
    }

    setPosBetween(p0, p1, p2) {
        this._start.set(p0);
        this._mid.set(p1);
        this._end.set(p2);
        this._setUpdatePositions(this._updatePosBetween);
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
        const planeCreated = scene.on("sectionPlaneCreated", this._updatePositions);
        const planeDestroyed = scene.on("sectionPlaneDestroyed", this._updatePositions);

        this._cleanup = () => {
            camera.off(onViewMatrix);
            camera.off(onProjMatrix);
            scene.canvas.off(onCanvasBnd);
            scene.off(planesUpdate);
            scene.off(planeCreated);
            scene.off(planeDestroyed);
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

export const marker3D = function(scene, color) {
    const marker = new Dot3D(scene, {}, scene.canvas.canvas.parentNode, {
        borderColor: "white",
        fillColor: color,
        zIndex: 100
    });

    return {
        update: function(worldPos) {
            if (worldPos)
            {
                marker.worldPos = worldPos;
            }
            marker.setVisible(!!worldPos);
        },

        setFillColor:  c => marker.setFillColor(c),
        setHighlighted: h => marker.setHighlighted(h),
        getCanvasPos:  () => marker.canvasPos,
        getWorldPos:   () => marker.worldPos,
        destroy:       () => marker.destroy()
    };
};

export const wire3D = function(scene, color) {
    const wire = new Wire3D(scene, scene.canvas.canvas.ownerDocument.body, {
        color: color,
        thickness: 1,
        thicknessClickable: 6   // TODO: Remove to make not clickable?
    });
    wire.setVisible(false);
    return {
        update: (startWorldPos, endWorldPos) => {
            if (endWorldPos)
            {
                wire.setEnds(startWorldPos, endWorldPos);
            }
            wire.setVisible(!!endWorldPos);
        },

        setColor: c => wire.setColor(c),
        destroy: () => wire.destroy()
    };
};

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

export const triangulateEarClipping = function(planeCoords) {
    const polygonVertices = [ ];
    for (let i = 0; i < planeCoords.length; ++i)
        polygonVertices.push(i);

    const isCCW = (function() {
        const ba = math.vec2();
        const bc = math.vec2();

        let anglesSum = 0;
        const angles = [ ];

        for (let i = 0; i < polygonVertices.length; ++i)
        {
            const a = planeCoords[polygonVertices[i]];
            const b = planeCoords[polygonVertices[(i + 1) % polygonVertices.length]];
            const c = planeCoords[polygonVertices[(i + 2) % polygonVertices.length]];

            math.subVec2(a, b, ba);
            math.subVec2(c, b, bc);

            const theta = math.dotVec2(ba, bc) / Math.sqrt(math.sqLenVec2(ba) * math.sqLenVec2(bc));
            const angle = Math.acos(Math.max(-1, Math.min(theta, 1)));
            const convex = (ba[0] * bc[1] - ba[1] * bc[0]) >= 0;
            anglesSum += convex ? angle : (2 * Math.PI - angle);
        }

        return anglesSum < (polygonVertices.length * Math.PI);
    })();

    const pointInTriangle = (function() {
        const sign = (p1, p2, p3) => {
            return (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
        };

        return (pt, v1, v2, v3) => {
            const d1 = sign(pt, v1, v2);
            const d2 = sign(pt, v2, v3);
            const d3 = sign(pt, v3, v1);

            const has_neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
            const has_pos = (d1 > 0) || (d2 > 0) || (d3 > 0);

            return !(has_neg && has_pos);
        };
    })();

    const baseTriangles = [ ];

    const vertices = (isCCW ? polygonVertices : polygonVertices.slice(0).reverse()).map(i => ({ idx: i }));
    vertices.forEach((v, i) => {
        v.prev = vertices[(i - 1 + vertices.length) % vertices.length];
        v.next = vertices[(i + 1)                   % vertices.length];
    });

    const ba = math.vec2();
    const bc = math.vec2();

    while (vertices.length > 2) {
        let earIdx = 0;
        while (true) {
            if (earIdx >= vertices.length)
            {
                throw `isCCW = ${isCCW}; earIdx = ${earIdx}; len = ${vertices.length}`;
            }
            const v = vertices[earIdx];

            const a = planeCoords[v.prev.idx];
            const b = planeCoords[v.idx];
            const c = planeCoords[v.next.idx];

            math.subVec2(a, b, ba);
            math.subVec2(c, b, bc);

            if (((ba[0] * bc[1] - ba[1] * bc[0]) >= 0) // a convex vertex
                &&
                vertices.every( // no other vertices inside
                    vv => ((vv === v)
                           ||
                           (vv === v.prev)
                           ||
                           (vv === v.next)
                           ||
                           !pointInTriangle(planeCoords[vv.idx], a, b, c))))
                break;
            ++earIdx;
        }

        const ear = vertices[earIdx];
        vertices.splice(earIdx, 1);

        baseTriangles.push([ ear.idx, ear.next.idx, ear.prev.idx ]);

        const prev = ear.prev;
        prev.next = ear.next;
        const next = ear.next;
        next.prev = ear.prev;
    }

    return [ planeCoords, baseTriangles, isCCW ];
};

export const addMousePressListener = function(element, onChange) {
    const moveTolerance = 4;

    const copyElementPos = (event, out) => {
        out[0] = event.clientX;
        out[1] = event.clientY;
        transformToNode(element.ownerDocument.documentElement, element, out);
        return out;
    };

    let buttonDown = false;

    const cleanups = [ ];
    const cleanup = () => cleanups.forEach(c => c());

    const addElementEventListener = (type, listener) => {
        element.addEventListener(type, listener);
        cleanups.push(() => element.removeEventListener(type, listener));
    };

    const downPos = math.vec2();
    addElementEventListener("mousedown", function(event) {
        if (event.which === 1) {
            buttonDown = true;
            onChange(copyElementPos(event, downPos));
        }
    });

    addElementEventListener("mousemove", function(event) {
        copyElementPos(event, tmpVec2a);
        if (buttonDown && (math.distVec2(downPos, tmpVec2a) > moveTolerance)) {
            buttonDown = false;
        }
        if (buttonDown || (! event.buttons & 1)) {
            onChange(tmpVec2a);
        }
    });

    addElementEventListener("mouseup", function(event) {
        if ((event.which === 1) && buttonDown) {
            const commit = onChange(copyElementPos(event, tmpVec2a));
            if (commit) {
                cleanup();
                commit();
            }
        }
    });

    return cleanup;
};

export const addTouchPressListener = function(element, cameraControl, pointerCircle, onChange) {
    const longTouchTimeoutMs = 300;
    const moveTolerance = 20;
    const startPos = math.vec2();

    const copyElementPos = (event, out) => {
        out[0] = event.clientX;
        out[1] = event.clientY;
        transformToNode(element.ownerDocument.documentElement, element, out);
        return out;
    };

    let longTouchTimeout = null;
    let onSingleTouchMove = nop;
    let startTouchIdentifier;

    const resetAction = function() {
        clearTimeout(longTouchTimeout);
        pointerCircle.stop();
        cameraControl.active = true;
        onSingleTouchMove = nop;
        startTouchIdentifier = null;
    };

    const cleanups = [ ];
    const cleanup = () => cleanups.forEach(c => c());

    const addElementEventListener = (type, listener) => {
        element.addEventListener(type, listener, {passive: true});
        cleanups.push(() => element.removeEventListener(type, listener));
    };

    addElementEventListener("touchstart", function(event) {
        const touches = event.touches;

        if (touches.length !== 1)
        {
            resetAction();
            onChange(null);
        }
        else
        {
            const touch = touches[0];
            copyElementPos(touch, startPos);

            startTouchIdentifier = touch.identifier;

            onSingleTouchMove = elementPos => {
                if (math.distVec2(startPos, elementPos) > moveTolerance)
                {
                    resetAction();
                }
            };

            longTouchTimeout = setTimeout(
                function() {
                    pointerCircle.start(startPos);

                    longTouchTimeout = setTimeout(
                        function() {
                            pointerCircle.stop();
                            cameraControl.active = false;
                            onSingleTouchMove = onChange;
                            onSingleTouchMove(startPos);
                        },
                        longTouchTimeoutMs);
                },
                250);
        }
    });

    // element.addEventListener("touchcancel", e => console.log("touchcancel", e), {passive: true});

    addElementEventListener("touchmove", function(event) {
        const touch = [...event.changedTouches].find(e => e.identifier === startTouchIdentifier);
        if (touch)
        {
            onSingleTouchMove(copyElementPos(touch, tmpVec2a));
        }
    });

    addElementEventListener("touchend", function(event) {
        const touch = [...event.changedTouches].find(e => e.identifier === startTouchIdentifier);
        if (touch)
        {
            const commit = onChange(copyElementPos(touch, tmpVec2a));
            resetAction();
	    if (commit) {
	        cleanup();
		commit();
	    } else {
                onChange(null);
            }
        }
    });

    return () => {
        resetAction();
        cleanup();
    };
};

export const startPolygonCreate = function(scene, pointerLens, addPressListener, pickRayResult, onChange, onConclude) {
    const canvas = scene.canvas.canvas;

    const updatePointerLens = (pointerLens
                               ? function(canvasPos, isSnapped) {
                                   pointerLens.visible = !! canvasPos;
                                   if (canvasPos)
                                   {
                                       pointerLens.canvasPos = canvasPos;
                                       pointerLens.snapped = !! isSnapped;
                                   }
                               }
                               : () => { });

    const testLastSegmentIntersects = (function() {
        const onSegment = (p, q, r) => ((q[0] <= Math.max(p[0], r[0])) &&
                                        (q[0] >= Math.min(p[0], r[0])) &&
                                        (q[1] <= Math.max(p[1], r[1])) &&
                                        (q[1] >= Math.min(p[1], r[1])));

        const orient = (p, q, r) => {
            const val = (q[1] - p[1]) * (r[0] - q[0]) - (q[0] - p[0]) * (r[1] - q[1]);
            // collinear
            // clockwise
            // counterclockwise
            return ((val === 0) ? 0 : ((val > 0) ? 1 : 2));
        };

        return function(pos2D, lastSegmentClosesLoop) {
            const s = lastSegmentClosesLoop ? 1 : 0;
            const a = pos2D[(pos2D.length - 2 + s) % pos2D.length];
            const b = pos2D[(pos2D.length - 1 + s) % pos2D.length];

            for (let i = s; i < pos2D.length - 2 - 1 + s; ++i) {
                const c = pos2D[i];
                const d = pos2D[i + 1];

                const o1 = orient(a, b, c);
                const o2 = orient(a, b, d);
                const o3 = orient(c, d, a);
                const o4 = orient(c, d, b);

                if (((o1 !== o2) && (o3 !== o4))       || // General case
                    ((o1 === 0) && onSegment(a, c, b)) || // a, b and c are collinear and c lies on segment ab
                    ((o2 === 0) && onSegment(a, d, b)) || // a, b and d are collinear and d lies on segment ab
                    ((o3 === 0) && onSegment(c, a, d)) || // c, d and a are collinear and a lies on segment cd
                    ((o4 === 0) && onSegment(c, b, d)))   // c, d and b are collinear and b lies on segment cd
                {
                    return true;
                }
            }

            return false;
        };
    })();

    const getPlane = (points) => (points.length >= 3) && (function() {
        const u      = math.normalizeVec3(math.subVec3(points[1], points[0], math.vec3()));
        const v20    = math.normalizeVec3(math.subVec3(points[2], points[0], tmpVec3a));
        const normal = math.normalizeVec3(math.cross3Vec3(u, v20, math.vec3()));
        const v      = math.normalizeVec3(math.cross3Vec3(normal, u, math.vec3()));
        return {
            normal: normal,
            origin: math.vec3(points[0]),
            u:      u,
            v:      v
        };
    })();

    const vertices = [ ];
    let currentInteraction;

    (function selectNextPoint() {
        const plane = getPlane(vertices);

        const canvasPos2Ray = (canvasPos, dst) => (math.canvasPosToWorldRay(canvas, scene.camera.viewMatrix, scene.camera.projMatrix, scene.camera.projection, canvasPos, dst.origin, dst.direction), dst);

        const pickRay = (ray) => {
            const pickResult = pickRayResult(ray);
            const snapWorldPos = pickResult && pickResult.entity && ((! plane) || pickResult.snapped) && pickResult.worldPos;
            if (plane) {
                const originDistance = math.dotVec3(plane.normal, plane.origin);
                const snapPlaneDist = (snapWorldPos
                                       ? ((originDistance - math.dotVec3(snapWorldPos, plane.normal)))
                                       : window.Infinity);
                if (Math.abs(snapPlaneDist) < 0.0001) {
                    const ret = math.vec3();
                    return {
                        worldPos: math.addVec3(snapWorldPos, math.mulVec3Scalar(plane.normal, snapPlaneDist, ret), ret),
                        snapped:  true
                    };
                } else {
                    return {
                        worldPos: planeIntersect(originDistance, plane.normal, ray.origin, ray.direction),
                        snapped:  false
                    };
                }
            } else {
                return {
                    worldPos: snapWorldPos,
                    snapped:  pickResult && pickResult.snapped
                };
            }
        };

        let placeVertex = false;
        const removePressListener = addPressListener(
            (inputCanvasPos) => {
                const rayPick = inputCanvasPos && pickRay(canvasPos2Ray(inputCanvasPos, tmpRay));
                const worldPos = rayPick && rayPick.worldPos;
                return onWorldPos(worldPos, inputCanvasPos, rayPick && rayPick.snapped);
            });

        const onWorldPos = (worldPos, inputCanvasPos, rayPickSnapped) => {
                const canvasPos = worldPos ? scene.camera.projectWorldPos(worldPos) : inputCanvasPos;
                const firstMarker = (vertices.length > 0) && (function() {
                    const v = vertices[0];
                    return {
                        canvasPos: scene.camera.projectWorldPos(v),
                        worldPos: v
                    };
                })();
                const snapToFirst = (vertices.length >= 3) && ((canvasPos && (math.distVec2(canvasPos, firstMarker.canvasPos) < 10))
                                                               ||
                                                               (worldPos && math.compareVec3(worldPos, firstMarker.worldPos)));

                updatePointerLens(snapToFirst ? firstMarker.canvasPos : canvasPos, snapToFirst || rayPickSnapped);

                const lastPointOverlaps = (inputCanvasPos
                                           &&
                                           ((! worldPos)
                                            ||
                                            ((vertices.length < 3)
                                             ? vertices.some(v => math.compareVec3(v, worldPos))
                                             : math.compareVec3(vertices[vertices.length - 1], worldPos))));

                const points = vertices.concat(((! snapToFirst) && worldPos && (! lastPointOverlaps)) ? [worldPos] : []);

                const curPlane = (! lastPointOverlaps) && (plane || getPlane(points));

                const uvs = curPlane && points.map(p => {
                    math.subVec3(p, curPlane.origin, tmpVec3a);
                    return math.vec2([ math.dotVec3(tmpVec3a, curPlane.u), math.dotVec3(tmpVec3a, curPlane.v) ]);
                });

                const isValid = (! lastPointOverlaps) && (! (uvs && testLastSegmentIntersects(uvs, snapToFirst)));
                const geometry = isValid && uvs && (snapToFirst || (! testLastSegmentIntersects(uvs, true))) && (function() {
                    try {
                        const [ baseVertices, baseTriangles, isCCW ] = triangulateEarClipping(uvs);
                        return {
                            faces: baseTriangles,
                            vertices: baseVertices.map(uv => math.addVec3(
                                curPlane.origin,
                                math.addVec3(
                                    math.mulVec3Scalar(curPlane.u, uv[0], tmpVec3a),
                                    math.mulVec3Scalar(curPlane.v, uv[1], tmpVec3b),
                                    tmpVec3a),
                                math.vec3()))
                        };
                    } catch (e) {
                        console.warn("e", e);
                        return false;
                    }
                })();

                onChange(points, snapToFirst, isValid, geometry);

                return placeVertex = (isValid && (snapToFirst
                                                  ? () => {
                                                      updatePointerLens(null);
                                                      onConclude();
                                                  }
                                                  : () => {
                                                      vertices.push(math.vec3(worldPos));
                                                      updatePointerLens(null);
                                                      selectNextPoint();
                                                  }));
            };

        currentInteraction = {
            closePolygon: (() => {
                const commit = (vertices.length >= 3) && onWorldPos(vertices[0]);
                if (commit) {
                    removePressListener();
                    commit();
                }
                return !! commit;
            }),
            placeVertex: () => {
                if (placeVertex) {
                    removePressListener();
                    placeVertex();
                }
                return !!placeVertex;
            },
            popVertex: () => {
                if (vertices.length > 0) {
                    removePressListener();
                    vertices.pop();
                    selectNextPoint();
                    return true;
                } else {
                    return false;
                }
            },
            removePressListener: removePressListener,
            updateOnChange: () => onWorldPos()
        };
    })();

    return {
        cancel: () => {
            currentInteraction.removePressListener();
            updatePointerLens(null);
        },
        closePolygon:   () => currentInteraction.closePolygon(),
        placeVertex:    () => currentInteraction.placeVertex(),
        popVertex:      () => currentInteraction.popVertex(),
        updateOnChange: () => currentInteraction.updateOnChange()
    };
};
