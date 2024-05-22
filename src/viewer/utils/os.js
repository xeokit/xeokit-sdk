const os = {
    isIphoneSafari() {
        const userAgent = window.navigator.userAgent;
        const isIphone = /iPhone/i.test(userAgent);
        const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);

        return isIphone && isSafari;
    }
};

export {os};