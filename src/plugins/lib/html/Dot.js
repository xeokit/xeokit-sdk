import { addContextMenuListener } from "./MenuEvent.js";
/** @private */
class Dot {

    constructor(parentElement, cfg = {}) {

        this._highlightClass = "viewer-ruler-dot-highlighted";

        this._x = 0;
        this._y = 0;

        this._dot = document.createElement('div');
        this._dot.className += this._dot.className ? ' viewer-ruler-dot' : 'viewer-ruler-dot';

        this._dotClickable = document.createElement('div');
        this._dotClickable.className += this._dotClickable.className ? ' viewer-ruler-dot-clickable' : 'viewer-ruler-dot-clickable';

        this._visible = cfg.visible !== false;
        this._culled = false;

        var dot = this._dot;
        var dotStyle = dot.style;
        dotStyle["border-radius"] = 25 + "px";
        dotStyle.border = "solid 2px white";
        dotStyle.background = "lightgreen";
        dotStyle.position = "absolute";
        dotStyle["z-index"] = cfg.zIndex === undefined ? "40000005" : cfg.zIndex ;
        dotStyle.width = 8 + "px";
        dotStyle.height = 8 + "px";
        dotStyle.visibility = this._visible ? "visible" : "hidden";
        dotStyle.top = 0 + "px";
        dotStyle.left = 0 + "px";
        dotStyle["box-shadow"] = "0 2px 5px 0 #182A3D;";
        dotStyle["opacity"] = 1.0;
        dotStyle["pointer-events"] = "none";
        if (cfg.onContextMenu) {
          //  dotStyle["cursor"] = "context-menu";
        }
        parentElement.appendChild(dot);

        var dotClickable = this._dotClickable;
        var dotClickableStyle = dotClickable.style;
        dotClickableStyle["border-radius"] = 35 + "px";
        dotClickableStyle.border = "solid 10px white";
        dotClickableStyle.position = "absolute";
        dotClickableStyle["z-index"] = cfg.zIndex === undefined ? "40000007" : (cfg.zIndex + 1);
        dotClickableStyle.width = 8 + "px";
        dotClickableStyle.height = 8 + "px";
        dotClickableStyle.visibility = "visible";
        dotClickableStyle.top = 0 + "px";
        dotClickableStyle.left = 0 + "px";
        dotClickableStyle["opacity"] = 0.0;
        dotClickableStyle["pointer-events"] = "none";
        if (cfg.onContextMenu) {
          //  dotClickableStyle["cursor"] = "context-menu";
        }
        parentElement.appendChild(dotClickable);

        dotClickable.addEventListener('click', (event) => {
            parentElement.dispatchEvent(new MouseEvent('mouseover', event));
        });

        if (cfg.onMouseOver) {
            dotClickable.addEventListener('mouseover', (event) => {
                cfg.onMouseOver(event, this);
                parentElement.dispatchEvent(new MouseEvent('mouseover', event));
            });
        }

        if (cfg.onMouseLeave) {
            dotClickable.addEventListener('mouseleave', (event) => {
                cfg.onMouseLeave(event, this);
            });
        }

        if (cfg.onMouseWheel) {
            dotClickable.addEventListener('wheel', (event) => {
                cfg.onMouseWheel(event, this);
            });
        }

        if (cfg.onMouseDown) {
            dotClickable.addEventListener('mousedown', (event) => {
                cfg.onMouseDown(event, this);
            });
        }

        if (cfg.onMouseUp) {
            dotClickable.addEventListener('mouseup', (event) => {
                cfg.onMouseUp(event, this);
            });
        }

        if (cfg.onMouseMove) {
            dotClickable.addEventListener('mousemove', (event) => {
                cfg.onMouseMove(event, this);
            });
        }

        if (cfg.onTouchstart) {
            dotClickable.addEventListener('touchstart', (event) => {
                cfg.onTouchstart(event, this);
            });
        }

        if (cfg.onTouchmove) {
            dotClickable.addEventListener('touchmove', (event) => {
                cfg.onTouchmove(event, this);
            });
        }

        if (cfg.onTouchend) {
            dotClickable.addEventListener('touchend', (event) => {
                cfg.onTouchend(event, this);
            });
        }

        if (cfg.onContextMenu) {
            const contextMenuCallback = (event) => {
                cfg.onContextMenu(event, this);
            }
            addContextMenuListener(dotClickable, contextMenuCallback);
            
        }

        this.setPos(cfg.x || 0, cfg.y || 0);
        this.setFillColor(cfg.fillColor);
        this.setBorderColor(cfg.borderColor);
    }

    setPos(x, y) {
        this._x = x;
        this._y = y;
        var dotStyle = this._dot.style;
        dotStyle["left"] = (Math.round(x) - 6) + 'px';
        dotStyle["top"] = (Math.round(y) - 6) + 'px';

        var dotClickableStyle = this._dotClickable.style;
        dotClickableStyle["left"] = (Math.round(x) - 14) + 'px';
        dotClickableStyle["top"] = (Math.round(y) - 14) + 'px';
    }

    setFillColor(color) {
        this._dot.style.background = color || "lightgreen";
    }

    setBorderColor(color) {
        this._dot.style.border = "solid 2px" + (color || "black");
    }

    setOpacity(opacity) {
        this._dot.style.opacity = opacity;
    }

    _updateVisibility() {
        this._dot.style.visibility = this._dotClickable.style.visibility = this._visible && !this._culled ? "visible" : "hidden";
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
        this._dotClickable.style["pointer-events"] = (clickable) ? "all" : "none";
    }

    setHighlighted(highlighted) {
        if (this._highlighted === highlighted) {
            return;
        }
        this._highlighted = !!highlighted;
        if (this._highlighted) {
            this._dot.classList.add(this._highlightClass);
        } else {
            this._dot.classList.remove(this._highlightClass);
        }
    }
    
    destroy() {
        this.setVisible(false);
        if (this._dot.parentElement) {
            this._dot.parentElement.removeChild(this._dot);
        }
        if (this._dotClickable.parentElement) {
            this._dotClickable.parentElement.removeChild(this._dotClickable);
        }
    }
}

export {Dot};
