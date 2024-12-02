import { os } from "../../../viewer/utils/os.js";

export function addContextMenuListener(elem, callback) {
    if (!elem || !callback) return;

    let timeout = null;
    const longPressTimer = 500;
    const MOVE_THRESHOLD = 3;
    let startX, startY;

    const touchStartHandler = (event) => {
        event.preventDefault();
        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;

        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }

        timeout = setTimeout(() => {
            event.clientX = touch.clientX;
            event.clientY = touch.clientY;
            callback(event);
            clearTimeout(timeout);
            timeout = null;
        }, longPressTimer);
    };

    const touchMoveHandler = (event) => {
        if (!timeout) return;
        const touch = event.touches[0];
        const deltaX = Math.abs(touch.clientX - startX);
        const deltaY = Math.abs(touch.clientY - startY);

        if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
            clearTimeout(timeout);
            timeout = null;
        }
    };

    const touchEndHandler = (event) => {
        event.preventDefault();
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
    };

    const contextMenuHandler = (event) => {
        callback(event);
        event.preventDefault();
        event.stopPropagation();
    };

    console.log('adding context menu listener');
    if (os.isIphoneSafari()) {
        elem.addEventListener('touchstart', touchStartHandler);
        elem.addEventListener('touchmove', touchMoveHandler);
        elem.addEventListener('touchend', touchEndHandler);
    } else {
        elem.addEventListener('contextmenu', contextMenuHandler);
    }

    return function removeContextMenuListener() {
        if (os.isIphoneSafari()) {
            elem.removeEventListener('touchstart', touchStartHandler);
            elem.removeEventListener('touchmove', touchMoveHandler);
            elem.removeEventListener('touchend', touchEndHandler);
        } else {
            elem.removeEventListener('contextmenu', contextMenuHandler);
        }
    };
}
