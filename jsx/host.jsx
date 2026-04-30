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
    if (!props || props.length === 0) return alert("Select properties with keys!");

    app.beginUndoGroup("Remap Selected Keys");

    for (var p = 0; p < props.length; p++) {
        var prop = props[p];

        if (!(prop instanceof Property) || prop.numKeys < 2) continue;

        var selectedKeys = prop.selectedKeys;
        if (!selectedKeys || selectedKeys.length === 0) continue;

        selectedKeys.sort(function(a, b) { return a - b; });

        var fd = comp.frameDuration;
        var t1 = prop.keyTime(selectedKeys[0]); 
        var startFrame = Math.round(t1 / fd);
        
        var keysData = [];
        for (var k = 0; k < selectedKeys.length; k++) {
            keysData.push({
                value: prop.keyValue(selectedKeys[k])
            });
        }

        for (var kk = selectedKeys.length - 1; kk >= 1; kk--) {
            prop.removeKey(selectedKeys[kk]);
        }

        for (var i = 1; i < keysData.length; i++) {
            var newFrame = startFrame + (i * step);
            var newTime = newFrame * fd;

            var newIdx = prop.addKey(newTime);
            prop.setValueAtKey(newIdx, keysData[i].value);
            
            prop.setInterpolationTypeAtKey(newIdx, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
        }
        
        var firstIdx = prop.nearestKeyIndex(t1);
        prop.setInterpolationTypeAtKey(firstIdx, KeyframeInterpolationType.LINEAR, KeyframeInterpolationType.LINEAR);
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
    if (!comp) return alert("Highlight the timeline!");

    var sel = comp.selectedLayers;
    if (!sel || sel.length === 0) return alert("Please select precompositions!");

    var targets = [];

    for (var i = 0; i < sel.length; i++) {
        if (sel[i].source instanceof CompItem) {
            targets.push(sel[i]);
        }
    }

    if (targets.length === 0) {
        return alert("Among the selected layers, there are no precompositions.");
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

function batchPrecompose() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return alert("Select the active composition!");

    var sel = comp.selectedLayers;
    if (!sel.length) return alert("Select layers!");

    app.beginUndoGroup("Batch Precompose by Bounds");

    var padding = 0, targets = [];

    for (var i = 0; i < sel.length; i++) {
        var l = sel[i], r = null;

        try { r = l.sourceRectAtTime(comp.time, false); } catch (e) {}

        var hasRect = r && r.width > 0 && r.height > 0;
        var w = hasRect ? Math.ceil(r.width) + padding * 2 : (l.source ? l.source.width : 100);
        var h = hasRect ? Math.ceil(r.height) + padding * 2 : (l.source ? l.source.height : 100);

        targets.push({
            id: l.id,
            index: l.index,
            name: l.name,
            inP: l.inPoint,
            outP: l.outPoint,
            start: l.startTime,
            pos: l.position.value,
            scale: l.scale.value,
            opacity: l.opacity.value,
            rot: l.property("Rotation") ? l.property("Rotation").value : 0,
            w: Math.max(1, w),
            h: Math.max(1, h),
            left: hasRect ? r.left - padding : 0,
            top: hasRect ? r.top - padding : 0
        });
    }

    targets.sort(function (a, b) { return b.index - a.index; });

    for (var j = 0; j < targets.length; j++) {
        var d = targets[j], layer = null;

        for (var n = 1; n <= comp.numLayers; n++) {
            if (comp.layer(n).id === d.id) {
                layer = comp.layer(n);
                break;
            }
        }

        if (!layer) continue;

        try {
            var inner = comp.layers.precompose([layer.index], d.name + "_precomp", true);
            inner.width = d.w;
            inner.height = d.h;
            inner.duration = d.outP - d.inP;

            var pre = null;
            for (var p = 1; p <= comp.numLayers; p++) {
                if (comp.layer(p).source === inner) {
                    pre = comp.layer(p);
                    break;
                }
            }

            if (!pre) continue;

            var il = inner.layer(1);

            il.startTime = d.start - d.inP;
            il.inPoint = 0;
            il.outPoint = inner.duration;
            il.anchorPoint.setValue([0, 0]);
            il.position.setValue([-d.left, -d.top]);
            il.scale.setValue([100, 100]);
            if (il.property("Rotation")) il.property("Rotation").setValue(0);

            pre.startTime = d.inP;
            pre.inPoint = d.inP;
            pre.outPoint = d.outP;
            pre.position.setValue(d.pos);
            pre.scale.setValue(d.scale);
            pre.opacity.setValue(d.opacity);
            pre.anchorPoint.setValue([d.w / 2, d.h / 2]);
            if (pre.property("Rotation")) pre.property("Rotation").setValue(d.rot);

        } catch (e) {
            alert("Error on layer: " + d.name + "\n" + e.toString());
        }
    }

    app.endUndoGroup();
}