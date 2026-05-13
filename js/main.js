var csInterface = new CSInterface();
var CURRENT_VERSION = "1.0.6";

window.addEventListener("load", function () {
    initTabs();
    refreshMarkerSourcesBtn();
    checkForUpdate();
    initReport();
});

function initTabs() {
    var tabs    = document.querySelectorAll(".tab-btn");
    var panels  = document.querySelectorAll(".tab-panel");

    function activate(id) {
        tabs.forEach(function(t) { t.classList.toggle("active", t.dataset.tab === id); });
        panels.forEach(function(p) { p.classList.toggle("active", p.id === "tab-" + id); });
    }

    tabs.forEach(function(tab) {
        tab.addEventListener("click", function() { activate(tab.dataset.tab); });
    });

    activate("create");   
}

function runNull(withParent) {
    var opts = {
        keysP:      document.getElementById("keysPos").checked,
        keysS:      document.getElementById("keysScale").checked,
        keysR:      document.getElementById("keysRot").checked,
        motionTile: document.getElementById("nullMotionTile").checked
    };
    var json = '{"keysP":'    + opts.keysP +
               ',"keysS":'    + opts.keysS +
               ',"keysR":'    + opts.keysR +
               ',"motionTile":' + opts.motionTile + '}';
    var escaped = json.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    csInterface.evalScript('createNull(' + (withParent ? "true" : "false") + ',"' + escaped + '")');
}

function runSolid() {
    var col = (document.getElementById("solidColor").value || "#ffffff").replace("#", "");
    var w   = parseFloat(document.getElementById("solidW").value)  || 0;
    var h   = parseFloat(document.getElementById("solidH").value)  || 0;
    document.getElementById("solidW").value = "";
    document.getElementById("solidH").value = "";
    csInterface.evalScript("createSolid('" + col + "'," + w + "," + h + ")");
}

function toggleSettings() {
    var overlay = document.getElementById("modalOverlay");
    overlay.style.display = (overlay.style.display === "flex") ? "none" : "flex";
}

function runAdj() {
    csInterface.evalScript("createAdjustment()");
}

function runCam() {
    csInterface.evalScript("createCamera()");
}

function runRemap() {
    var val = parseFloat(document.getElementById("remapStep").value);
    csInterface.evalScript("remapKeys(" + (isNaN(val) ? 1 : val) + ")");
}

function refreshMarkerSourcesBtn() {
    csInterface.evalScript("getMarkerSources()", function(result) {
        var select = document.getElementById("markerSource");
        if (!select) return;
        select.innerHTML = "";
        var compOpt = document.createElement("option");
        compOpt.value = "comp"; compOpt.textContent = "Composition";
        select.appendChild(compOpt);
        if (!result || result === "undefined" || result === "") return;
        result.split("|||").forEach(function(name) {
            var opt = document.createElement("option");
            opt.value = opt.textContent = name;
            select.appendChild(opt);
        });
    });
}

function trimByMarkersBtn() {
    var select = document.getElementById("markerSource");
    if (!select || !select.value) { alert("Click 🔄 first"); return; }
    var escaped = select.value.replace(/'/g, "\\'");
    csInterface.evalScript("trimByMarkerSource('" + escaped + "')");
}

function pcUpdatePreview() {
    var on     = document.getElementById("pcAutoNumber").checked;
    var el     = document.getElementById("pcPreview");
    if (!on) { el.textContent = ""; return; }
    var prefix = document.getElementById("pcPrefixInput").value.trim() || "Precomp";
    var start  = parseInt(document.getElementById("pcStartInput").value, 10) || 1;
    el.textContent = prefix + " " + start + ",  " + prefix + " " + (start+1) + ",  \u2026";
}

function runBatchPrecomp() {
    var autoNumber = document.getElementById("pcAutoNumber").checked;
    var prefix     = (document.getElementById("pcPrefixInput").value.trim() || "Precomp")
                        .replace(/"/g, '\\"');
    var startIndex = parseInt(document.getElementById("pcStartInput").value, 10) || 1;

    var optJSON = '{"autoNumber":' + (autoNumber ? "true" : "false") +
                  ',"prefix":"'   + prefix + '"' +
                  ',"startIndex":' + startIndex + '}';
    var escaped = optJSON.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    csInterface.evalScript('batchPrecompose("' + escaped + '")');
}

function runUnPrecompose() {
    csInterface.evalScript("unPrecompose()");
}

function runDuplicateUnique() {
    csInterface.evalScript("duplicateCompUnique()");
}

function checkForUpdate() {
    fetch("https://raw.githubusercontent.com/duskyffx/Fast-Layers/main/version.json?v=" + Date.now())
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.version !== CURRENT_VERSION) {
                document.getElementById("updateVersion").innerText = "New version: " + data.version;
                document.getElementById("updateMessage").innerText = data.message;
                document.getElementById("updateBox").style.display = "block";
                document.getElementById("downloadUpdateBtn").onclick = function() {
                    if (typeof cep !== "undefined" && cep.util) {
                        cep.util.openURLInDefaultBrowser(data.url);
                    } else {
                        window.open(data.url, "_blank");
                    }
                };
            }
        })
        .catch(function() {});

    document.getElementById("closeUpdateBtn").onclick = function() {
        document.getElementById("updateBox").style.display = "none";
    };
}

var REPORT_SERVER = "https://server-for-script.onrender.com";

function initReport() {
    var modal = document.getElementById("reportModal");

    document.getElementById("reportOpenBtn").onclick = function() { modal.style.display = "flex"; };
    document.getElementById("reportCloseBtn").onclick = function() { modal.style.display = "none"; };

    document.getElementById("reportSendBtn").onclick = function() {
        var text = document.getElementById("reportText").value.trim();
        var file = document.getElementById("reportImage").files[0];

        var caption = "⚠️ Fast Tools Report\n\nProblem:\n" + (text || "No text") + "\n\nVersion: " + CURRENT_VERSION;

        if (!text && !file) { alert("Write something or attach a photo"); return; }

        if (file) {
            var fd = new FormData();
            fd.append("caption", caption);
            fd.append("photo", file);
            fetch(REPORT_SERVER + "/report-photo", { method: "POST", body: fd })
                .then(function() {
                    alert("Sent!");
                    document.getElementById("reportText").value = "";
                    document.getElementById("reportImage").value = "";
                    modal.style.display = "none";
                })
                .catch(function() { alert("Error sending"); });
        } else {
            fetch(REPORT_SERVER + "/report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: caption })
            })
                .then(function() {
                    alert("Sent!");
                    document.getElementById("reportText").value = "";
                    modal.style.display = "none";
                })
                .catch(function() { alert("Error sending"); });
        }
    };
}
