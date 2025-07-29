const os = {
    isIphoneSafari() {
        const userAgent = window.navigator.userAgent;
        const isIphone = /iPhone/i.test(userAgent);
        const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);

        return isIphone && isSafari;
    },
    isIphoneOrIpadSafari() {
        const userAgent = window.navigator.userAgent;
        const isIphoneOrIpad = /iPhone|iPad/i.test(userAgent) || (
            // iPad detection: Check for touch support and macOS-like user agent
            /Macintosh/i.test(userAgent) && navigator.maxTouchPoints && navigator.maxTouchPoints > 2
        );
        const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
        return isIphoneOrIpad && isSafari;
    },
    isTouchDevice() {
        return (
            'ontouchstart' in window || //works for most devices
            navigator.maxTouchPoints > 0 || //works for modern touch devices
            navigator.mxMaxTouchPoints > 0 //works for older microsoft touch devices
        )
    }
};

export { os };