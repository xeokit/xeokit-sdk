/**
 * @private
 */
function EventHandler() {
    this.handlers = {};
}

EventHandler.prototype.on = function (evt, handler) {
    (this.handlers[evt] || (this.handlers[evt] = [])).push(handler);
};

EventHandler.prototype.off = function (evt, handler) {
    const h = this.handlers[evt];
    let found = false;
    if (typeof (h) !== 'undefined') {
        const i = h.indexOf(handler);
        if (i >= -1) {
            h.splice(i, 1);
            found = true;
        }
    }
    if (!found) {
        throw new Error("Handler not found");
    }
};

EventHandler.prototype.fire = function (evt, args) {
    const h = this.handlers[evt];
    if (!h) {
        return;
    }
    for (let i = 0; i < h.length; ++i) {
        h[i].apply(this, args);
    }
};

export { EventHandler };