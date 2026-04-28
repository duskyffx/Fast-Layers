function CSInterface() {}

CSInterface.prototype.evalScript = function(script, callback) {
    if (callback === null || callback === undefined) {
        callback = function(result) {};
    }
    
    if (window.__adobe_cep__) {

        window.__adobe_cep__.evalScript(script, callback);
    } else {
        console.error("CEP API not found. Are you running the panel in a browser, rather than in After Effects?");
    }
};

CSInterface.prototype.getSystemPath = function(pathType) {
    if (window.__adobe_cep__) {
        return window.__adobe_cep__.getSystemPath(pathType);
    }
    return "";
};