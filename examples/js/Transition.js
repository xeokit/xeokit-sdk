class Transition {

    constructor(viewer, img) {
        this.viewer = viewer;
        this._img = img;
        this._pInterval = null;
    }

    doTransition(millisecs = 500) {
        const interval = 50;
        const inc = 1 / (millisecs / interval);
        if (this._pInterval) {
            clearInterval(this._pInterval);
            this._pInterval = null;
        }
        this._img.src = this.viewer.getSnapshot({format: "png"});
        this._img.style.opacity = 1.0;
        let opacity = 1;
        this._pInterval = setInterval(() => {
            opacity -= inc;
            this._img.style.opacity = opacity;
            if (opacity <= 0) {
                clearInterval(this._pInterval);
                this._pInterval = null;
            }
        }, interval);
    }

    clearTransition() {
        if (this._pInterval) {
            clearInterval(this._pInterval);
            this._pInterval = null;
        }
        this._img.style.opacity = 0;
    }
}

export {Transition};