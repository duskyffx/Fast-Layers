function isCompActive() {
    var it = app.project.activeItem;
    if (it && it instanceof CompItem) return it;
    return null;
}

function hexToRGB(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map(function(h){ return h+h; }).join("");
    var bigint = parseInt(hex, 16);
    return [((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255];
}

function selectOnlyCreated(comp, layersArray) {
    for (var i = 1; i <= comp.numLayers; i++) comp.layer(i).selected = false;
    for (var j = 0; j < layersArray.length; j++) {
        if (layersArray[j]) layersArray[j].selected = true;
    }
}

function createNull(parentFlag) {
    var comp = isCompActive();
    if (!comp) return alert("Please click on the timeline first!");
    
    var sel = comp.selectedLayers;
    var created = [];
    var targets = [];
    for (var i = 0; i < sel.length; i++) targets.push(sel[i]);

    app.beginUndoGroup("Create Nulls");
    if (targets.length === 0) {
        created.push(comp.layers.addNull());
    } else {
        for (var i = 0; i < targets.length; i++) {
            var n = comp.layers.addNull();
            n.moveBefore(targets[i]);
            n.inPoint = targets[i].inPoint;
            n.outPoint = targets[i].outPoint;
            if (parentFlag) targets[i].parent = n;
            created.push(n);
        }
    }
    selectOnlyCreated(comp, created);
    app.endUndoGroup();
}

function createSolid(parentFlag, hex, w, h) {
    var comp = isCompActive();
    if (!comp) return alert("Click on the timeline first!");

    var color = hexToRGB(hex);
    var sel = comp.selectedLayers;
    var created = [];
    
    app.beginUndoGroup("Create Solid");

    if (sel.length === 0) {
        var finalW = (w && w > 0) ? w : comp.width;
        var finalH = (h && h > 0) ? h : comp.height;
        var s = comp.layers.addSolid(color, "Solid", finalW, finalH, 1);
        created.push(s);
    } else {
        for (var i = 0; i < sel.length; i++) {
            var target = sel[i];
            
            var finalW = (w && w > 0) ? w : (target.width || comp.width);
            var finalH = (h && h > 0) ? h : (target.height || comp.height);

            var s = comp.layers.addSolid(color, "Solid", finalW, finalH, 1);
            
            s.moveBefore(target);
            
            s.startTime = target.startTime; 
            s.inPoint = target.inPoint;
            s.outPoint = target.outPoint;

            if (parentFlag) {
                try { target.parent = s; } catch(e) {}
            }
            created.push(s);
        }
    }
    if (typeof selectOnlyCreated === "function") {
        selectOnlyCreated(comp, created);
    }
    
    app.endUndoGroup();
}

function createAdjustment(parentFlag) {
    var comp = isCompActive();
    if (!comp) return alert("Please click on the timeline first!");
    
    var sel = comp.selectedLayers;
    var created = [];
    var targets = [];
    for (var i = 0; i < sel.length; i++) targets.push(sel[i]);

    app.beginUndoGroup("Create Adj");
    
    if (targets.length === 0) {
        var a = comp.layers.addSolid([1,1,1], "Adj", comp.width, comp.height, 1);
        a.adjustmentLayer = true;
        a.label = 7; 
        
        created.push(a);
    } else {
        for (var i = 0; i < targets.length; i++) {
            var a = comp.layers.addSolid([1,1,1], "Adj", comp.width, comp.height, 1);
            a.adjustmentLayer = true;
            a.label = 7; 
            a.moveBefore(targets[i]);
            a.inPoint = targets[i].inPoint;
            a.outPoint = targets[i].outPoint;
            if (parentFlag) targets[i].parent = a;
            created.push(a);
        }
    }
    
    selectOnlyCreated(comp, created);
    app.endUndoGroup();
}
function createCamera() {
    var comp = isCompActive();
    if (!comp) return alert("Please click on the timeline first!");

    var sel = comp.selectedLayers;
    var created = [];

    app.beginUndoGroup("Create Camera");

    if (sel.length === 0) {
        var c = comp.layers.addCamera("CAM", [comp.width/2, comp.height/2]);
        created.push(c);
    } else {
        for (var i = 0; i < sel.length; i++) {
            var target = sel[i];
            var camDistance = 1500; 

            var c = comp.layers.addCamera("CAM_" + target.name, [comp.width/2, comp.height/2]);
            
            c.inPoint = target.inPoint;
            c.outPoint = target.outPoint;

            if (!target.threeDLayer) target.threeDLayer = true;
            
            var targetPos = target.property("Position").value;
            c.property("Position").setValue([targetPos[0], targetPos[1], targetPos[2] - camDistance]);
            
            if (c.property("Point of Interest")) {
                c.property("Point of Interest").setValue(targetPos);
            }

            c.property("Zoom").setValue(camDistance);
            c.moveBefore(target);
            created.push(c);
        }
    }

    selectOnlyCreated(comp, created);
    app.endUndoGroup();
}

function remapKeys(step) {
    var comp = isCompActive();
    if (!comp) return;
    
    var props = comp.selectedProperties;
    if (props.length === 0) return alert("Please select keys!");
    
    app.beginUndoGroup("Remap");
    for (var i = 0; i < props.length; i++) {
        var p = props[i];
        if (p.numKeys > 1) {
            var t = [], v = [];
            for (var k = 1; k <= p.numKeys; k++) { 
                t.push(p.keyTime(k)); 
                v.push(p.keyValue(k)); 
            }
            for (var d = p.numKeys; d >= 1; d--) p.removeKey(d);
            for (var n = 0; n < v.length; n++) {
                p.setValueAtTime(t[0] + (n * step * comp.frameDuration), v[n]);
            }
        }
    }
    app.endUndoGroup();
}

function findLayerByName(comp, name) {
    for (var i = 1; i <= comp.numLayers; i++) {
        if (comp.layer(i).name === name) return comp.layer(i);
    }
    return null;
}

function getMarkerSources() {
    var comp = isCompActive();
    if (!comp) return "";
    var sources = [];
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        if (layer.property("Marker") && layer.property("Marker").numKeys > 0) {
            sources.push(layer.name);
        }
    }
    return sources.join("|||");
}

function trimByMarkerSource(source) {
    try {
        var comp = isCompActive();
        if (!comp) return alert("Error: Composition is not active.");

        var selected = comp.selectedLayers;
        if (!selected || selected.length === 0) return alert("Please select layers to trim!");

        var markerProp = null;
        if (source === "comp") {
            markerProp = comp.markerProperty;
        } else {
            var mLayer = findLayerByName(comp, source);
            if (!mLayer) return alert("Source layer not found.");
            markerProp = mLayer.property("Marker");
        }

        if (!markerProp || markerProp.numKeys < 1) return alert("No markers found in the source.");

        var times = [];
        for (var m = 1; m <= markerProp.numKeys; m++) {
            times.push(markerProp.keyTime(m));
        }
        times.sort(function(a, b) { return a - b; });

        app.beginUndoGroup("Split by Markers Manual");

        for (var i = 0; i < selected.length; i++) {
            var layer = selected[i];
            for (var j = 0; j < times.length; j++) {
                var t = times[j];
                if (t > layer.inPoint + 0.001 && t < layer.outPoint - 0.001) {
                    var oldOut = layer.outPoint;
                    layer.outPoint = t;
                    var newLayer = layer.duplicate();
                    newLayer.inPoint = t;
                    newLayer.outPoint = oldOut;
                    layer = newLayer;
                }
            }
        }

        app.endUndoGroup();
    } catch (err) {
        alert("Error executing: " + err.toString());
        if (app.undoGroup && app.undoGroup !== "") app.endUndoGroup();
    }
}

function unPrecompose() {
    var comp = isCompActive();
    if (!comp) return alert("Выдели таймлинию!");

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return alert("Выделите прекомпозиции!");

    var targets = [];

    for (var i = 0; i < sel.length; i++) {
        if (sel[i].source instanceof CompItem) {
            targets.push(sel[i]);
        }
    }

    if (targets.length === 0) {
        return alert("Среди выделенных слоёв нет прекомпозиций.");
    }

    targets.sort(function (a, b) {
        return b.index - a.index;
    });

    app.beginUndoGroup("Un-precompose Keep Order");

    for (var t = 0; t < targets.length; t++) {
        var precompLayer = targets[t];

        if (!precompLayer || !(precompLayer.source instanceof CompItem)) {
            continue;
        }

        var innerComp = precompLayer.source;

        var pStart = precompLayer.startTime;
        var pIn = precompLayer.inPoint;
        var pOut = precompLayer.outPoint;

        for (var d = 1; d <= comp.numLayers; d++) {
            comp.layer(d).selected = false;
        }

        var createdLayers = [];

        for (var j = 1; j <= innerComp.numLayers; j++) {
            var innerLayer = innerComp.layer(j);

            innerLayer.copyToComp(comp);

            var newLayer = comp.layer(1);

            newLayer.moveBefore(precompLayer);

            newLayer.startTime = pStart + innerLayer.startTime;
            newLayer.inPoint = pStart + innerLayer.inPoint;
            newLayer.outPoint = pStart + innerLayer.outPoint;

            if (newLayer.inPoint < pIn) newLayer.inPoint = pIn;
            if (newLayer.outPoint > pOut) newLayer.outPoint = pOut;

            createdLayers.push(newLayer);
        }

        precompLayer.remove();

        for (var k = 0; k < createdLayers.length; k++) {
            createdLayers[k].selected = true;
        }
    }

    app.endUndoGroup();
}

function duplicateCompUnique() {
    var comp = isCompActive();
    if (!comp) return;

    var sel = comp.selectedLayers;
    if (sel.length === 0) {
        alert("Error: Please select a precomposition first!");
        return;
    }

    app.beginUndoGroup("Unique Duplicate Above");

    var processed = 0;

    for (var i = 0; i < sel.length; i++) {
        var layer = sel[i];

        if (layer.source instanceof CompItem) {
            var originalComp = layer.source;
            
            var newComp = originalComp.duplicate();
            newComp.name = originalComp.name + "_copy";
            
            var duplicatedLayer = layer.duplicate();
            
            duplicatedLayer.replaceSource(newComp, false);
            
            layer.selected = false;
            duplicatedLayer.selected = true;
            
            processed++;
        }
    }

    if (processed === 0) {
        alert("Error: The selected layers are not precompositions!");
    }

    app.endUndoGroup();
}