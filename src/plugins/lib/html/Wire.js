import { addContextMenuListener } from "./MenuEvent.js";
/** @private */
class Wire {

    constructor(parentElement, cfg = {}) {

        this._color = cfg.color || "black";
        this._highlightClass = "viewer-ruler-wire-highlighted";

        this._wire = document.createElement('div');
        this._wire.className += this._wire.className ? ' viewer-ruler-wire' : 'viewer-ruler-wire';

        this._wireClickable = document.createElement('div');
        this._wireClickable.className += this._wireClickable.className ? ' viewer-ruler-wire-clickable' : 'viewer-ruler-wire-clickable';

        this._thickness = cfg.thickness || 1.0;
        this._thicknessClickable = cfg.thicknessClickable || 6.0;

        this._visible = true;
        this._culled = false;

        var wire = this._wire;
        var wireStyle = wire.style;

        wireStyle.border = "solid " + this._thickness + "px " + this._color
        wireStyle.position = "absolute";
        wireStyle["z-index"] = cfg.zIndex === undefined ? "2000001" : cfg.zIndex;
        wireStyle.width = 0 + "px";
        wireStyle.height = 0 + "px";
        wireStyle.visibility = "visible";
        wireStyle.top = 0 + "px";
        wireStyle.left = 0 + "px";
        wireStyle['-webkit-transform-origin'] = "0 0";
        wireStyle['-moz-transform-origin'] = "0 0";
        wireStyle['-ms-transform-origin'] = "0 0";
        wireStyle['-o-transform-origin'] = "0 0";
        wireStyle['transform-origin'] = "0 0";
        wireStyle['-webkit-transform'] = 'rotate(0deg)';
        wireStyle['-moz-transform'] = 'rotate(0deg)';
        wireStyle['-ms-transform'] = 'rotate(0deg)';
        wireStyle['-o-transform'] = 'rotate(0deg)';
        wireStyle['transform'] = 'rotate(0deg)';
        wireStyle["opacity"] = 1.0;
        wireStyle["pointer-events"] = "none";
        if (cfg.onContextMenu) {
         //   wireStyle["cursor"] = "context-menu";
        }

        parentElement.appendChild(wire);

        var wireClickable = this._wireClickable;
        var wireClickableStyle = wireClickable.style;

        wireClickableStyle.border = "solid " + this._thicknessClickable + "px " + this._color;
        wireClickableStyle.position = "absolute";
        wireClickableStyle["z-index"] = cfg.zIndex === undefined ? "2000002" : (cfg.zIndex + 1);
        wireClickableStyle.width = 0 + "px";
        wireClickableStyle.height = 0 + "px";
        wireClickableStyle.visibility = "visible";
        wireClickableStyle.top = 0 + "px";
        wireClickableStyle.left = 0 + "px";
        // wireClickableStyle["pointer-events"] = "none";
        wireClickableStyle['-webkit-transform-origin'] = "0 0";
        wireClickableStyle['-moz-transform-origin'] = "0 0";
        wireClickableStyle['-ms-transform-origin'] = "0 0";
        wireClickableStyle['-o-transform-origin'] = "0 0";
        wireClickableStyle['transform-origin'] = "0 0";
        wireClickableStyle['-webkit-transform'] = 'rotate(0deg)';
        wireClickableStyle['-moz-transform'] = 'rotate(0deg)';
        wireClickableStyle['-ms-transform'] = 'rotate(0deg)';
        wireClickableStyle['-o-transform'] = 'rotate(0deg)';
        wireClickableStyle['transform'] = 'rotate(0deg)';
        wireClickableStyle["opacity"] = 0.0;
        wireClickableStyle["pointer-events"] = "none";
        if (cfg.onContextMenu) {
            //wireClickableStyle["cursor"] = "context-menu";
        }

        parentElement.appendChild(wireClickable);

        if (cfg.onMouseOver) {
            wireClickable.addEventListener('mouseover', (event) => {
                cfg.onMouseOver(event, this);
            });
        }

        if (cfg.onMouseLeave) {
            wireClickable.addEventListener('mouseleave', (event) => {
                cfg.onMouseLeave(event, this);
            });
        }

        if (cfg.onMouseWheel) {
            wireClickable.addEventListener('wheel', (event) => {
                cfg.onMouseWheel(event, this);
            });
        }

        if (cfg.onMouseDown) {
            wireClickable.addEventListener('mousedown', (event) => {
                cfg.onMouseDown(event, this);
            });
        }

        if (cfg.onMouseUp) {
            wireClickable.addEventListener('mouseup', (event) => {
                cfg.onMouseUp(event, this);
            });
        }

        if (cfg.onMouseMove) {
            wireClickable.addEventListener('mousemove', (event) => {
                cfg.onMouseMove(event, this);
            });
        }

        if (cfg.onContextMenu) {
            const contextMenuCallback = (event) => {
                cfg.onContextMenu(event, this);
            }
            addContextMenuListener(wireClickable, contextMenuCallback);
            
        }

        this._x1 = 0;
        this._y1 = 0;
        this._x2 = 0;
        this._y2 = 0;

        this._update();
    }

    get visible() {
        return this._wire.style.visibility === "visible";
    }

    _update() {

        var length = Math.abs(Math.sqrt((this._x1 - this._x2) * (this._x1 - this._x2) + (this._y1 - this._y2) * (this._y1 - this._y2)));
        var angle = Math.atan2(this._y2 - this._y1, this._x2 - this._x1) * 180.0 / Math.PI;

        var wireStyle = this._wire.style;
        wireStyle["width"] = Math.round(length) + 'px';
        wireStyle["left"] = Math.round(this._x1) + 'px';
        wireStyle["top"] = Math.round(this._y1) + 'px';
        wireStyle['-webkit-transform'] =
            wireStyle['-moz-transform'] =
            wireStyle['-ms-transform'] =
            wireStyle['-o-transform'] =
            wireStyle['transform'] = 'rotate(' + angle + 'deg) translate(-' + this._thickness + 'px, -' + this._thickness + 'px)';

        var wireClickableStyle = this._wireClickable.style;
        wireClickableStyle["width"] = Math.round(length) + 'px';
        wireClickableStyle["left"] = Math.round(this._x1) + 'px';
        wireClickableStyle["top"] = Math.round(this._y1) + 'px';
        wireClickableStyle['-webkit-transform'] =
            wireClickableStyle['-moz-transform'] =
            wireClickableStyle['-ms-transform'] =
            wireClickableStyle['-o-transform'] =
            wireClickableStyle['transform'] = 'rotate(' + angle + 'deg) translate(-' + this._thicknessClickable + 'px, -' + this._thicknessClickable + 'px)';
    }

    setStartAndEnd(x1, y1, x2, y2) {
        this._x1 = x1;
        this._y1 = y1;
        this._x2 = x2;
        this._y2 = y2;
        this._update();
    }

    setColor(color) {
        this._color = color || "black";
        this._wire.style.border = "solid " + this._thickness + "px " + this._color;
    }

    setOpacity(opacity) {
        this._wire.style.opacity = opacity;
    }

    _updateVisibility() {
        this._wire.style.visibility = this._wireClickable.style.visibility = this._visible && !this._culled ? "visible" : "hidden";
    }

    setVisible(visible) {
        if (this._visible === visible) {
            return;
        }
        this._visible = !!visible;
        this._updateVisibility();
    }

    setCulled(culled) {
        if (this._culled === culled) {
            return;
        }
        this._culled = !!culled;
        this._updateVisibility();
    }

    setClickable(clickable) {
        this._wireClickable.style["pointer-events"] = (clickable) ? "all" : "none";
    }

    setHighlighted(highlighted) {
        if (this._highlighted === highlighted) {
            return;
        }
        this._highlighted = !!highlighted;
        if (this._highlighted) {
            this._wire.classList.add(this._highlightClass);
        } else {
            this._wire.classList.remove(this._highlightClass);
        }
    }

    destroy(visible) {
        if (this._wire.parentElement) {
            this._wire.parentElement.removeChild(this._wire);
        }
        if (this._wireClickable.parentElement) {
            this._wireClickable.parentElement.removeChild(this._wireClickable);
        }
    }
}

export {Wire};
