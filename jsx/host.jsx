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
            
            var finalW = (w && w > 0) ? w : comp.width;
            var finalH = (h && h > 0) ? h : comp.height;

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

function getWorldTransform(layer) {
    var t = {};
    try { t.position    = layer.transform.position.value;    } catch(e) {}
    try { t.scale       = layer.transform.scale.value;       } catch(e) {}
    try { t.rotation    = layer.transform.rotation.value;    } catch(e) {}
    try { t.anchorPoint = layer.transform.anchorPoint.value; } catch(e) {}
    try { t.opacity     = layer.transform.opacity.value;     } catch(e) {}
    try { t.orientation = layer.transform.orientation.value; } catch(e) {}
    try { t.xRotation   = layer.transform.xRotation.value;   } catch(e) {}
    try { t.yRotation   = layer.transform.yRotation.value;   } catch(e) {}
    return t;
}

function setWorldTransform(layer, t) {
    try { if (t.position    !== undefined) layer.transform.position.setValue(t.position);       } catch(e) {}
    try { if (t.scale       !== undefined) layer.transform.scale.setValue(t.scale);             } catch(e) {}
    try { if (t.rotation    !== undefined) layer.transform.rotation.setValue(t.rotation);       } catch(e) {}
    try { if (t.anchorPoint !== undefined) layer.transform.anchorPoint.setValue(t.anchorPoint); } catch(e) {}
    try { if (t.opacity     !== undefined) layer.transform.opacity.setValue(t.opacity);         } catch(e) {}
    try { if (t.orientation !== undefined) layer.transform.orientation.setValue(t.orientation); } catch(e) {}
    try { if (t.xRotation   !== undefined) layer.transform.xRotation.setValue(t.xRotation);    } catch(e) {}
    try { if (t.yRotation   !== undefined) layer.transform.yRotation.setValue(t.yRotation);    } catch(e) {}
}

var SKIP_MATCH_NAMES = {
    "ADBE Marker":          true,
    "ADBE MaskAttr":        true,
    "ADBE Mask Parade":     true,
    "ADBE Transform Group": true
};

function shouldSkipProp(prop) {
    try {
        if (SKIP_MATCH_NAMES[prop.matchName]) return true;
    } catch(e) {}
    return false;
}

function collectPropertyValues(prop, store) {
    try {
        if (shouldSkipProp(prop)) {
            store.push({ skip: true, matchName: prop.matchName });
            return;
        }

        if (prop.propertyType === PropertyType.PROPERTY) {
            var entry = {
                matchName:         prop.matchName,
                expressionEnabled: false,
                expression:        "",
                value:             null,
                isLayerRef:        false,
                layerIndex:        -1,
                skip:              false
            };

            try {
                if (prop.expressionEnabled) {
                    entry.expressionEnabled = true;
                    entry.expression = prop.expression;
                }
            } catch(e) {}

            try {
                if (prop.propertyValueType === PropertyValueType.LAYER_INDEX) {
                    entry.isLayerRef = true;
                    entry.layerIndex = prop.value;
                } else {
                    entry.value = prop.value;
                }
            } catch(e) {}

            store.push(entry);

        } else {
            store.push({ matchName: prop.matchName, isGroup: true, skip: false });

            for (var i = 1; i <= prop.numProperties; i++) {
                try {
                    collectPropertyValues(prop.property(i), store);
                } catch(e) {}
            }
        }
    } catch(e) {}
}

function restorePropertyValues(prop, store, cursor, innerIndexToNewLayer) {
    try {
        var entry = store[cursor[0]];
        cursor[0]++;

        if (!entry || entry.skip) return;

        if (prop.propertyType === PropertyType.PROPERTY) {
            if (entry.isLayerRef) {
                try {
                    if (entry.layerIndex > 0 && innerIndexToNewLayer[entry.layerIndex]) {
                        prop.setValue(innerIndexToNewLayer[entry.layerIndex].index);
                    }
                } catch(e) {}
            } else {
                try {
                    if (entry.value !== null) prop.setValue(entry.value);
                } catch(e) {}
            }

            if (entry.expressionEnabled && entry.expression !== "") {
                try {
                    var expr = entry.expression;

                    for (var oldIdx in innerIndexToNewLayer) {
                        if (innerIndexToNewLayer.hasOwnProperty(oldIdx)) {
                            var newIdx = innerIndexToNewLayer[oldIdx].index;
                            var re = new RegExp("(\\.layer\\()(" + oldIdx + ")(\\))", "g");
                            expr = expr.replace(re, "$1" + newIdx + "$3");
                        }
                    }

                    prop.expressionEnabled = true;
                    prop.expression = expr;
                } catch(e) {}
            }

        } else {
            for (var i = 1; i <= prop.numProperties; i++) {
                try {
                    restorePropertyValues(prop.property(i), store, cursor, innerIndexToNewLayer);
                } catch(e) {}
            }
        }
    } catch(e) {}
}

function collectMarkers(layer) {
    var markers = [];

    try {
        var markerProp = layer.property("Marker");
        if (!markerProp) return markers;

        for (var i = 1; i <= markerProp.numKeys; i++) {
            try {
                var mv = markerProp.keyValue(i);

                markers.push({
                    time:     markerProp.keyTime(i),
                    comment:  mv.comment,
                    duration: mv.duration,
                    chapter:  mv.chapter,
                    url:      mv.url,
                    label:    mv.label,
                    cuePointName: mv.cuePointName
                });
            } catch(e) {}
        }
    } catch(e) {}

    return markers;
}

function restoreMarkers(layer, markers, timeOffset) {
    try {
        var markerProp = layer.property("Marker");
        if (!markerProp) return;

        while (markerProp.numKeys > 0) {
            try {
                markerProp.removeKey(1);
            } catch(e) {
                break;
            }
        }

        for (var i = 0; i < markers.length; i++) {
            try {
                var m  = markers[i];
                var mv = new MarkerValue(m.comment || "");

                try { mv.duration     = m.duration;     } catch(e) {}
                try { mv.chapter      = m.chapter;      } catch(e) {}
                try { mv.url          = m.url;           } catch(e) {}
                try { mv.label        = m.label;         } catch(e) {}
                try { mv.cuePointName = m.cuePointName;  } catch(e) {}

                markerProp.setValueAtTime(m.time + timeOffset, mv);
            } catch(e) {}
        }
    } catch(e) {}
}

function restoreOriginalPrecompParents(layerInfos) {
    for (var i = 0; i < layerInfos.length; i++) {
        var info = layerInfos[i];

        try {
            if (info.sourceLayer && info.sourceParent) {
                info.sourceLayer.parent = info.sourceParent;
                setWorldTransform(info.sourceLayer, info.worldXform);
            }
        } catch(e) {}
    }
}

function unPrecompose() {
    try {
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

        var totalExpanded = 0;
        var transformWarnings = [];

        for (var t = 0; t < targets.length; t++) {
            var precompLayer = targets[t];

            if (!precompLayer || !(precompLayer.source instanceof CompItem)) {
                continue;
            }

            var innerComp  = precompLayer.source;
            var timeOffset = precompLayer.startTime;

            var precompWasTrimmed =
                precompLayer.inPoint > precompLayer.startTime ||
                precompLayer.outPoint < precompLayer.startTime + innerComp.duration;

            var pIn  = precompLayer.inPoint;
            var pOut = precompLayer.outPoint;

            try {
                var pcScale = precompLayer.transform.scale.value;
                var pcRot   = precompLayer.transform.rotation.value;

                if (pcScale[0] !== 100 || pcScale[1] !== 100 || pcRot !== 0) {
                    transformWarnings.push(innerComp.name);
                }
            } catch(e) {}

            for (var d = 1; d <= comp.numLayers; d++) {
                try {
                    comp.layer(d).selected = false;
                } catch(e) {}
            }

            var layerInfos = [];

            for (var j = 1; j <= innerComp.numLayers; j++) {
                var innerLayer = innerComp.layer(j);

                var worldXform = getWorldTransform(innerLayer);

                var parentIndex = -1;
                var sourceParent = null;

                try {
                    if (innerLayer.parent) {
                        parentIndex = innerLayer.parent.index;
                        sourceParent = innerLayer.parent;

                        innerLayer.parent = null;
                        setWorldTransform(innerLayer, worldXform);
                    }
                } catch(e) {}

                var propSnapshot = [];

                for (var pi = 1; pi <= innerLayer.numProperties; pi++) {
                    try {
                        collectPropertyValues(innerLayer.property(pi), propSnapshot);
                    } catch(e) {}
                }

                layerInfos.push({
                    innerIndex:   j,
                    parentIndex:  parentIndex,
                    sourceLayer:  innerLayer,
                    sourceParent: sourceParent,
                    worldXform:   worldXform,
                    propSnapshot: propSnapshot,
                    markers:      collectMarkers(innerLayer),
                    innerStart:   innerLayer.startTime,
                    innerIn:      innerLayer.inPoint,
                    innerOut:     innerLayer.outPoint
                });
            }

            var innerIndexToNewLayer = {};
            var copiedLayers = [];
            var insertAfterLayer = null;

            for (var c = 1; c <= innerComp.numLayers; c++) {
                var sourceLayer = innerComp.layer(c);

                sourceLayer.copyToComp(comp);

                var newLayer = comp.layer(1);

                if (c === 1) {
                    newLayer.moveBefore(precompLayer);
                } else {
                    newLayer.moveAfter(insertAfterLayer);
                }

                insertAfterLayer = newLayer;

                innerIndexToNewLayer[layerInfos[c - 1].innerIndex] = newLayer;

                copiedLayers.push({
                    layer: newLayer,
                    info: layerInfos[c - 1]
                });
            }

            restoreOriginalPrecompParents(layerInfos);
            for (var k = 0; k < copiedLayers.length; k++) {
                var copiedLayer = copiedLayers[k].layer;
                var copiedInfo  = copiedLayers[k].info;

                if (copiedInfo.parentIndex !== -1) {
                    var parentObj = innerIndexToNewLayer[copiedInfo.parentIndex];

                    if (parentObj) {
                        try {
                            copiedLayer.parent = parentObj;
                            setWorldTransform(copiedLayer, copiedInfo.worldXform);
                        } catch(e) {}
                    }
                }
            }

            for (var r = 0; r < copiedLayers.length; r++) {
                var newCopiedLayer = copiedLayers[r].layer;
                var restoreInfo = copiedLayers[r].info;
                var cursor = [0];

                for (var rp = 1; rp <= newCopiedLayer.numProperties; rp++) {
                    try {
                        restorePropertyValues(
                            newCopiedLayer.property(rp),
                            restoreInfo.propSnapshot,
                            cursor,
                            innerIndexToNewLayer
                        );
                    } catch(e) {}
                }

                restoreMarkers(newCopiedLayer, restoreInfo.markers, timeOffset);

                try { newCopiedLayer.startTime = restoreInfo.innerStart + timeOffset; } catch(e) {}
                try { newCopiedLayer.inPoint   = restoreInfo.innerIn    + timeOffset; } catch(e) {}
                try { newCopiedLayer.outPoint  = restoreInfo.innerOut   + timeOffset; } catch(e) {}

                if (precompWasTrimmed) {
                    try {
                        if (newCopiedLayer.inPoint < pIn) {
                            newCopiedLayer.inPoint = pIn;
                        }
                    } catch(e) {}

                    try {
                        if (newCopiedLayer.outPoint > pOut) {
                            newCopiedLayer.outPoint = pOut;
                        }
                    } catch(e) {}
                }

                try {
                    newCopiedLayer.selected = true;
                } catch(e) {}
            }

            try {
                precompLayer.remove();
            } catch(e) {}

            totalExpanded++;
        }

        app.endUndoGroup();

    } catch (e) {
        try { app.endUndoGroup(); } catch(e2) {}
        alert("Error: " + e.toString() + "\nLine: " + e.line);
    }
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

function setSafe(prop, value) {
    if (!prop) return;
    if (!prop.enabled) return; 
    if (prop.numKeys === 0) {
        prop.setValue(value);
    }
}

function batchPrecompose() {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) return alert("Select the active composition!");

    var sel = comp.selectedLayers;
    if (!sel.length) return alert("Select layers!");

    app.beginUndoGroup("Batch Precompose by Bounds");

    var targets = [];
    var padding = 0;

    for (var i = 0; i < sel.length; i++) {
        var l = sel[i];
        var r = null;
        
        if (l.hasVideo) {
            try { r = l.sourceRectAtTime(comp.time, false); } catch (e) {}
        }

        var isNull = l.nullLayer;
        var hasParent = l.parent !== null;
        var fullSize = isNull || hasParent || !l.hasVideo;

        var w = comp.width, h = comp.height, left = 0, top = 0;

        if (!fullSize && l.hasVideo) {
            if (r && r.width > 0) {
                w = Math.ceil(r.width) + padding * 2;
                h = Math.ceil(r.height) + padding * 2;
                left = r.left - padding;
                top = r.top - padding;
            } else if (l.source) {
                w = l.source.width;
                h = l.source.height;
            }
        }

        var transformData = {
            pos: l.hasVideo ? l.property("Position").value : [0,0],
            scale: l.hasVideo ? l.property("Scale").value : [100,100],
            anchor: l.hasVideo ? l.property("Anchor Point").value : [0,0],
            rot: (l.hasVideo && l.property("Rotation")) ? l.property("Rotation").value : 0
        };

        targets.push({
            id: l.id,
            index: l.index,
            name: l.name,
            inP: l.inPoint,
            outP: l.outPoint,
            start: l.startTime,
            transform: transformData,
            parent: l.parent,
            isNull: isNull,
            hasVideo: l.hasVideo,
            fullSize: fullSize,
            w: Math.max(1, w), h: Math.max(1, h),
            left: left, top: top
        });
    }

    targets.sort(function (a, b) { return b.index - a.index; });

    for (var j = 0; j < targets.length; j++) {
        var d = targets[j];
        var layer = null;
        for(var n=1; n<=comp.numLayers; n++) { if(comp.layer(n).id === d.id) { layer = comp.layer(n); break; } }

        if (!layer) continue;

        try {
            var tMarker = comp.layers.addNull();
            tMarker.moveBefore(layer);
            
            var innerCompItem = comp.layers.precompose([tMarker.index, layer.index], d.name + "_precomp", true);
            innerCompItem.layer(1).remove(); 
            
            innerCompItem.width = d.w;
            innerCompItem.height = d.h;
            innerCompItem.duration = Math.max(d.outP - d.inP, 0.1);

            var il = innerCompItem.layer(1); 
            var pre = comp.layer(d.index); 

            il.startTime = d.start - d.inP;
            
            if (d.hasVideo && !d.fullSize) {
                setSafe(il.property("Anchor Point"), d.transform.anchor);
                setSafe(il.property("Position"), [d.w/2, d.h/2]);
            }

            pre.startTime = d.inP;
            
            if (d.hasVideo) {
                setSafe(pre.property("Anchor Point"), [d.w/2, d.h/2]);
                setSafe(pre.property("Position"), d.transform.pos);
            }

            if (d.parent) pre.setParentWithJump(d.parent);

        } catch (e) {
            $.writeln("Error: " + d.name + " - " + e.toString());
        }
    }
    app.endUndoGroup();
}