import { os } from "../../../viewer/utils/os.js";

//failCallback will be called when the press is not long enough to considered a long press
export function addContextMenuListener(elem, callback, failCallback = () => {}) {
    if (!elem || !callback) return;

    let timeout = null;
    const longPressTimer = 500;
    const MOVE_THRESHOLD = 3;
    let startX, startY;

    const touchStartHandler = (event) => {
        event.preventDefault();
        
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        // If more than one finger touches the screen, cancel the timeout
        if (event.touches.length > 1) return;

        const touch = event.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;

        timeout = setTimeout(() => {
            event.clientX = touch.clientX;
            event.clientY = touch.clientY;
            callback(event);
            clearTimeout(timeout);
            timeout = null;
        }, longPressTimer);
    };

    const globalTouchStartHandler = (event) => {
        // Cancel timeout if multiple touches are detected anywhere on the screen
        if (event.touches.length > 1 && timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
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
            failCallback(event);
            clearTimeout(timeout);
            timeout = null;
        }
    };

    const contextMenuHandler = (event) => {
        callback(event);
        event.preventDefault();
        event.stopPropagation();
    };
    
    if (os.isIphoneOrIpadSafari()) {
        elem.addEventListener('touchstart', touchStartHandler);
        elem.addEventListener('touchmove', touchMoveHandler);
        elem.addEventListener('touchend', touchEndHandler);
        window.addEventListener('touchstart', globalTouchStartHandler);
    } else {
        elem.addEventListener('contextmenu', contextMenuHandler);
    }

    return function removeContextMenuListener() {
        if (os.isIphoneOrIpadSafari()) {
            elem.removeEventListener('touchstart', touchStartHandler);
            elem.removeEventListener('touchmove', touchMoveHandler);
            elem.removeEventListener('touchend', touchEndHandler);
            window.removeEventListener('touchstart', globalTouchStartHandler);
        } else {
            elem.removeEventListener('contextmenu', contextMenuHandler);
        }
    };
}
