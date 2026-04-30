window.onload = function() {
    refreshMarkerSourcesBtn();
};

var csInterface = new CSInterface();

function toggleSettings() {
    var overlay = document.getElementById('modalOverlay');
    if (!overlay) {
        console.error("The modalOverlay element was not found!");
        return;
    }
    var currentDisplay = window.getComputedStyle(overlay).display;
    if (currentDisplay === "none") {
        overlay.style.display = "flex"; 
    } else {
        overlay.style.display = "none";
    }
}

function runNull(p) { csInterface.evalScript("createNull(" + p + ")"); }

function runSolid(p) {
    var colInput = document.getElementById('solidColor');
    var col = colInput.value.replace('#', ''); 
    
    var wInput = document.getElementById('solidW');
    var hInput = document.getElementById('solidH');
    
    var w = parseFloat(wInput.value) || 0;
    var h = parseFloat(hInput.value) || 0;
    
    csInterface.evalScript("createSolid(" + p + ", '" + col + "', " + w + ", " + h + ")");
    
    wInput.value = "";
    hInput.value = "";
}

function runAdj(p) {
    var w = parseInt(document.getElementById('solidW').value) || 0;
    var h = parseInt(document.getElementById('solidH').value) || 0;
    csInterface.evalScript("createAdjustment(" + p + ", " + w + ", " + h + ")");
}

function runCam() { csInterface.evalScript("createCamera()"); }

function refreshMarkerSourcesBtn() {
    csInterface.evalScript("getMarkerSources()", function (result) {
        var select = document.getElementById("markerSource");
        if (!select) return;
        
        select.innerHTML = "";
        var compOption = document.createElement("option");
        compOption.value = "comp";
        compOption.textContent = "Composition";
        select.appendChild(compOption);

        if (!result || result === "undefined" || result === "") return;

        var layers = result.split("|||");
        for (var i = 0; i < layers.length; i++) {
            var opt = document.createElement("option");
            opt.value = layers[i];
            opt.textContent = layers[i];
            select.appendChild(opt);
        }
    });
}

function trimByMarkersBtn() {
    var select = document.getElementById("markerSource");
    if (!select || select.value === "") {
        alert("Please select a marker source first (click 🔄)");
        return;
    }
    var source = select.value;
    var escapedSource = source.replace(/'/g, "\\'");
    
    csInterface.evalScript("trimByMarkerSource('" + escapedSource + "')");
}

function runRemap() {
    var val = parseFloat(document.getElementById('remapStep').value);
    csInterface.evalScript("remapKeys(" + (isNaN(val) ? 1 : val) + ")");
}

function runUnPrecompose() {
    csInterface.evalScript("unPrecompose()");
}

function runDuplicateUnique() {
    csInterface.evalScript("duplicateCompUnique()");
}

function runBatchPrecomp() {
    csInterface.evalScript("batchPrecompose()");
}

var CURRENT_VERSION = "1.1.0";

document.addEventListener("DOMContentLoaded", function () {

    fetch("https://raw.githubusercontent.com/duskyffx/Fast-Layers/refs/heads/main/version.json")
        .then(function (res) { return res.json(); })
        .then(function (data) {

            if (data.version !== CURRENT_VERSION) {

                document.getElementById("updateVersion").innerText =
                    "New version: " + data.version;

                document.getElementById("updateMessage").innerText =
                    data.message;

                document.getElementById("updateBox").style.display = "block";

                document.getElementById("downloadUpdateBtn").onclick = function () {
                    window.open(data.url);
                };
            }

        })
        .catch(function () {
        });

    document.getElementById("closeUpdateBtn").onclick = function () {
        document.getElementById("updateBox").style.display = "none";
    };

});