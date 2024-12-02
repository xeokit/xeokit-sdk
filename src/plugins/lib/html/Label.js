import { addContextMenuListener } from "./MenuEvent.js";
/** @private */
class Label {

    constructor(parentElement, cfg = {}) {

        this._highlightClass = "viewer-ruler-label-highlighted";

        this._prefix = cfg.prefix || "";
        this._x = 0;
        this._y = 0;
        this._visible = true;
        this._culled = false;

        this._label = document.createElement('div');
        this._label.className += this._label.className ? ' viewer-ruler-label' : 'viewer-ruler-label';
        this._timeout = null;

        var label = this._label;
        var style = label.style;

        style["border-radius"] = 5 + "px";
        style.color = "white";
        style.padding = "4px";
        style.border = "solid 1px";
        style.background = "lightgreen";
        style.position = "absolute";
        style["z-index"] = cfg.zIndex === undefined ? "5000005" : cfg.zIndex;
        style.width = "auto";
        style.height = "auto";
        style.visibility = "visible";
        style.top = 0 + "px";
        style.left = 0 + "px";
        style["pointer-events"] = "all";
        style["opacity"] = 1.0;
        if (cfg.onContextMenu) {
            //  style["cursor"] = "context-menu";
        }
        label.innerText = "";

        parentElement.appendChild(label);

        this.setPos(cfg.x || 0, cfg.y || 0);
        this.setFillColor(cfg.fillColor);
        this.setBorderColor(cfg.fillColor);
        this.setText(cfg.text);

        if (cfg.onMouseOver) {
            label.addEventListener('mouseover', (event) => {
                cfg.onMouseOver(event, this);
                event.preventDefault();
            });
        }

        if (cfg.onMouseLeave) {
            label.addEventListener('mouseleave', (event) => {
                cfg.onMouseLeave(event, this);
                event.preventDefault();
            });
        }

        if (cfg.onMouseWheel) {
            label.addEventListener('wheel', (event) => {
                cfg.onMouseWheel(event, this);
            });
        }

        if (cfg.onMouseDown) {
            label.addEventListener('mousedown', (event) => {
                cfg.onMouseDown(event, this);
                event.stopPropagation();
            });
        }

        if (cfg.onMouseUp) {
            label.addEventListener('mouseup', (event) => {
                cfg.onMouseUp(event, this);
                event.stopPropagation();
            });
        }

        if (cfg.onMouseMove) {
            label.addEventListener('mousemove', (event) => {
                cfg.onMouseMove(event, this);
            });
        }

        if (cfg.onContextMenu) {
            const contextMenuCallback = (event) => {
                cfg.onContextMenu(event, this);
            }
            addContextMenuListener(label, contextMenuCallback);
            
        }
    }

    setPos(x, y) {
        this._x = x;
        this._y = y;
        var style = this._label.style;
        style["left"] = (Math.round(x) - 20) + 'px';
        style["top"] = (Math.round(y) - 12) + 'px';
    }

    setPosOnWire(x1, y1, x2, y2) {
        var x = x1 + ((x2 - x1) * 0.5);
        var y = y1 + ((y2 - y1) * 0.5);
        var style = this._label.style;
        style["left"] = (Math.round(x) - 20) + 'px';
        style["top"] = (Math.round(y) - 12) + 'px';
    }

    setPosBetweenWires(x1, y1, x2, y2, x3, y3) {
        var x = (x1 + x2 + x3) / 3;
        var y = (y1 + y2 + y3) / 3;
        var style = this._label.style;
        style["left"] = (Math.round(x) - 20) + 'px';
        style["top"] = (Math.round(y) - 12) + 'px';
    }

    setText(text) {
        this._label.innerHTML = this._prefix + (text || "");
    }

    setFillColor(color) {
        this._fillColor = color || "lightgreen";
        this._label.style.background =this._fillColor;
    }

    setBorderColor(color) {
        this._borderColor = color || "black";
        this._label.style.border = "solid 1px " + this._borderColor;
    }

    setOpacity(opacity) {
        this._label.style.opacity = opacity;
    }

    _updateVisibility() {
        this._label.style.visibility = this._visible && !this._culled ? "visible" : "hidden";
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

    setHighlighted(highlighted) {
        if (this._highlighted === highlighted) {
            return;
        }
        this._highlighted = !!highlighted;
        if (this._highlighted) {
            this._label.classList.add(this._highlightClass);
        } else {
            this._label.classList.remove(this._highlightClass);
        }
    }

    setClickable(clickable) {
        this._label.style["pointer-events"] = (clickable) ? "all" : "none";
    }

    setPrefix(prefix) {
        if(this._prefix === prefix){
            return;
        }
        this._prefix = prefix;
    }

    destroy() {
        if (this._label.parentElement) {
            this._label.parentElement.removeChild(this._label);
        }
    }

    
}

export {Label};

