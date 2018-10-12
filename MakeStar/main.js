var sg = require("scenegraph"),
    commands = require("commands");

var DEFAULT_NUMBER_STAR_POINTS = 5;
var DEFAULT_STAR_POINT_INSET = 0.5;
var DEFAULT_STAR_RESIZE_SCALE = 1;
var STAR_POINTS_ID = "starPoints";
var STAR_POINT_INSET_ID = "starPointInset";
var STAR_RESIZE_ID = "starShapeResize";
var STAR_RESIZE_CONTROL_ID = "starShapeResizeControl";

document.body.innerHTML = `
<style>
    #dialog {
        min-width: 400px;
    }
    .sliderControl {
       display: flex;
       flex-direction: row;
    }
    .sliderControl input[type=range] {
         flex: 1 1 auto;
         min-width: 200px;
    }
    .sliderControl input[type=text] {
         flex: 0 0 36px;
    }
</style>
<dialog id="#dialog">
    <form method="dialog">
        <h1>Star Settings</h1>
        <hr>
        <p>&nbsp;</p>
        <label>
            <span>Number of points</span>
            <div class="sliderControl" id="starpointControl">
                <input type="range" id="starPoints" min=2 max=180 uxp-quiet="true" value=5>
                <input type="text" id="starPointsValue" uxp-quiet="true" readonly=true value="5"/>
            </div>
        </label>
        <p>&nbsp;</p>
        <label>
            <span>Star point inset percent</span>
            <div class="sliderControl" id="starPointInsetControl">
                <input type="range" id="starPointInset" min=0.1 max=0.99 value=0.5>
                <input type="text" id="starPointInsetValue" uxp-quiet="true" readonly=true value="0.5"/>
            </div>
        </label>
        <label>
            <span>Resize scale factor</span>
            <div class="sliderControl" id="starShapeResizeControl">
                <input type="range" id="starShapeResize" min=0.1 max=20 value=1>
                <input type="text" id="starShapeResizeValue" uxp-quiet="true" readonly=true value="1"/>
            </div>
        </label>
        <footer>
            <button type="reset" id="cancel" uxp-variant="primary">Cancel</button>
            <button type="submit" id="done" uxp-variant="cta">Done</button>
        </footer>
    </form>
</dialog>
`;

/**
 * This section attempts to create the same dialog via DOM manipulation in JS
 */

var dialogUI;
function createDialog() {
    if (dialogUI) {
        return;
    }

    console.log("Creating dialog ...");
    dialogUI = document.createElement("dialog");
    dialogUI.setAttribute("id", "#dialog");
    dialogUI.style.minWidth = "400px";

    // create form container
    var container = document.createElement("form");
    container.setAttribute("method", "dialog");
    container.style.padding = "10px";

    // create heading
    var title = document.createElement("h1");
    title.textContent = "Star Settings?";
    container.appendChild(title);
    var hr = document.createElement("hr");
    container.appendChild(hr);

    // create slides
    // Listeners are attached in showUI so that we have access to selection
    var slider1 = createSliderGroup("Number of points", STAR_POINTS_ID, 2, 180, DEFAULT_NUMBER_STAR_POINTS);
    var slider2 = createSliderGroup("Star point inset percent", STAR_POINT_INSET_ID, 0.1, 0.99, DEFAULT_STAR_POINT_INSET);
    var slider3 = createSliderGroup("Resize scale factor", STAR_RESIZE_ID, 0.1, 20, DEFAULT_STAR_RESIZE_SCALE, true);
    container.appendChild(slider1);
    container.appendChild(slider2);
    container.appendChild(slider3);

    // create footer
    var footer = document.createElement("footer");
    var cancelButton = createButton("cancel", "primary");
    var doneButton = createButton("Done", "cta");
    footer.appendChild(cancelButton);
    footer.appendChild(doneButton);
    container.appendChild(footer);
    
    // Add container to the dialog
    dialogUI.appendChild(container);

    document.body.appendChild(dialogUI);
}

/**
 *  Create slider group:
 *      Slider title
 *      [-------o----------][v ]
 */
function createSliderGroup(title, controlId, min, max, defaultValue, disabled) {
    // create slider input area
    console.log(`Creating input area for id: ${controlId}`);
    var inputArea = document.createElement("label");
    var inputTitle = document.createElement("span");
    inputTitle.textContent = title;
    inputArea.appendChild(inputTitle);

    var sliderControl = document.createElement("div");
    sliderControl.setAttribute("id", controlId + "Control");
    sliderControl.disabled = disabled;
    sliderControl.style.display = "flex";
    sliderControl.style.flexDirection = "row";
    inputArea.appendChild(sliderControl);

    var slider = document.createElement("input");
    slider.setAttribute("id", controlId);
    slider.setAttribute("type", "range");
    slider.setAttribute("min", min);
    slider.setAttribute("max", max);
    slider.value = defaultValue;
    slider.style.flex = "1 1 auto";
    slider.style.minWidth = "200px";

    var sliderValue = document.createElement("input");
    sliderValue.setAttribute("id", controlId + "Value");
    sliderValue.setAttribute("type", "text");
    sliderValue.setAttribute("readonly", true);
    sliderValue.setAttribute("uxp-quiet", true);
    sliderValue.value = defaultValue;
    sliderValue.style.flex = "0 0 56px";

    sliderControl.appendChild(slider);
    sliderControl.appendChild(sliderValue);

    return inputArea;
}

function shouldDisableResize() {
    let shouldDisable = selectionItems.length === 0 || selectionItems.filter(node => {
        return (node instanceof sg.Path);
    }).length < selectionItems.length;

    // "disabled" attribute is not a valid attribute on div elements
    // so disable its content instead
    document.getElementById(STAR_RESIZE_ID).disabled = shouldDisable;
    document.getElementById(STAR_RESIZE_ID + "Value").disabled = shouldDisable;
    console.log(`Updating shouldDisableResize control to ${shouldDisable}`);
}

// Create button
function createButton(text, variant) {
    let newButton = document.createElement("button");
    newButton.textContent = text;
    newButton.setAttribute("uxp-variant", variant);
    newButton.onclick = (e) => {
        e.preventDefault();
        dialogUI.close(text);
    }
    return newButton;
}

/**
 * Cache original item guid & localBounds
 * Used to compute the new width/height for resizing
 */
var selectedBounds;

/**
 * Items in the selection to update
 */
var selectionItems = [];
var insertionArtboard;

async function showUI(selection) {

    let dialogUI = document.getElementById("#dialog");
    try {
        console.log(`Showing dialog... ${dialogUI.id}`);

        shouldDisableResize();

        // we can't inject the code directly in html snippet
        // attach listeners
        let slider1 = document.getElementById(STAR_POINTS_ID);
        slider1.oninput = (event) => {
            selection.items = [];
            updateSliderValues(event);
        };
        slider1.onchange = (event) => {
            selection.items = selectionItems;
        };

        let slider2 = document.getElementById(STAR_POINT_INSET_ID);
        slider2.oninput = (event) => {
            selection.items = [];
            updateSliderValues(event);
        };        
        slider2.onchange = (event) => {
            selection.items = selectionItems;
        };

        let slider3 = document.getElementById(STAR_RESIZE_ID);
        slider3.oninput = (event) => {
            selection.items = [];
            handleShapeResize(event);
        };
        slider3.onchange = (event) => {
            selection.items = selectionItems;
        };

        // Cancel/Done
        // Comment out if dialog UI created with createDialog
        document.getElementById("done").onclick = function (event) {
            dialogUI.close("done");
        };
        document.getElementById("cancel").onclick = function (event) {
            dialogUI.close("cancel");
        };

        var response = await dialogUI.showModal();
        if (response === "cancel") {
            throw("Not a real error, throwing to rollback changes!");
        }
    } finally {
        // dialogUI.remove();
        console.log("Star Tool COMPLETED");
    }
}

function handleShapeResize(event) {
    console.log(`handleShapeResize resizing selected shapes...`);
    var target = event.target;
    var value = target.value;
    var roundedValue = (Math.round(value*100)/100).toFixed(2);
    var valueControl = document.getElementById(target.id + "Value");
    valueControl.setAttribute("value", String(roundedValue));
    console.log(`valueControl id = ${valueControl.id} and new value = ${roundedValue}`);

    selectionItems.forEach(node => {
        if (node instanceof sg.Path) {
            if (!selectedBounds[node.guid]) {
                selectedBounds[node.guid] = node.localBounds;
            }
            var localBounds = selectedBounds[node.guid];
            var newWidth = localBounds.width * roundedValue;
            var newHeight = localBounds.height * roundedValue;
            node.resize(newWidth, newHeight);
        }
    });
}

function updateSliderValues(event) {
    var target = event.target;
    var value = target.value;
    console.log(`updateSliderValue for target id: ${event.target.id} & current value ${value}`);
    var roundedValue = Math.round(value);
    if (event.target.id === STAR_POINT_INSET_ID) {
        roundedValue = (Math.round(value*100)/100).toFixed(2);
    }
    console.log(`updated ${target.id}: ${value} rounded: ${roundedValue}`);
    var valueControl = document.getElementById(target.id + "Value");
    valueControl.setAttribute("value", String(roundedValue));
    console.log(`valueControl id = ${valueControl.id} and new value = ${roundedValue}`);

    updateShapes(selectionItems, getSettings());

    // Update resize control
    shouldDisableResize();
}

// TODO: Fix this so that it can draw the star shape to fit in the
// existing bounds.
function StarPathShape (cx, cy, starPoints, radius, innerFactor) {
    console.log("cx= "+cx+" cy= "+cy+" radius= "+radius);
    var innerRadius = innerFactor*radius;
    var radian = Math.PI/2*3;
    var step = Math.PI/starPoints; //(2Pi radian = 360, total number of steps = 2* np, so each step = 2*PI/2*np = Pi/np!)
    var n;

    var pathData = "M " + cx + " " + (cy-radius) + " ";
    for (n=0; n < starPoints; ++n) {
        var x = cx+Math.cos(radian)*radius;
        var y = cy+Math.sin(radian)*radius;
        pathData += "L " + x + " " + y + " ";
        radian += step;

        x = cx+Math.cos(radian)*innerRadius;
        y = cy+Math.sin(radian)*innerRadius;
        pathData += "L " + x + " " + y + " ";
        radian += step;
    }
    // close path
    pathData += "L " + cx + " " + (cy-radius);
    pathData += " Z";

    return pathData;
}

// Style properties
var strokeProperties = ["stroke", 
                       "strokeWidth", 
                       "strokePosition", 
                       "strokeEndCaps", 
                       "strokeJoins", 
                       "strokeMiterLimit", 
                       "strokeDashArray", 
                       "strokeDashOffset"];
var styleProperties = ["opacity",
                       "fill", 
                       "shadow", 
                       "blur"];

// stroke line endcap can influence the joins between two line segments
// that form sharp corners. (endcap is not exposed currently)
function copyStyles(sourceNode, dstNode) {
    strokeProperties.forEach(function(property) {
        dstNode[property] = sourceNode[property];
    });
    styleProperties.forEach(function(property) {
        dstNode[property] = sourceNode[property];
    });
    dstNode.fillEnabled = sourceNode.fillEnabled;
    dstNode.strokeEnabled = sourceNode.strokeEnabled;
}

function getSettings() {

    var starPoints = document.getElementById(STAR_POINTS_ID + "Value").value;
    var starPointInset = document.getElementById(STAR_POINT_INSET_ID + "Value").value;
    console.log(`Star Settings: ${starPoints} ${starPointInset}`);
    return {
        starPoints: starPoints,
        starPointInset: starPointInset
    };
}

// update path data
function updatePathData(node, settings) {
    var bounds = node.localBounds;
    var radius = (bounds.width > bounds.height) ? bounds.height/2 : bounds.width/2;
    var cx = radius;
    var cy = radius;
    node.pathData = StarPathShape(cx, cy, settings.starPoints, radius, settings.starPointInset);
    node.resize(bounds.width, bounds.height);
}

// convert node to star Path
function convertToPath(node, settings) {
    var parent = node.parent;
    var bounds = node.localBounds;
    var radius = (bounds.width > bounds.height) ? bounds.height/2 : bounds.width/2;
    var cx = radius;
    var cy = radius;

    // cache current transformation
    var rotation = node.rotation;
    var translation = node.translation;

    // Draw shape with origin at 0,0 of parent
    var newNode = new sg.Path();
    newNode.pathData = StarPathShape(cx, cy, settings.starPoints, radius, settings.starPointInset);

    // Copy styles
    copyStyles(node, newNode);
    // Restore transformation
    newNode.rotateAround(rotation, newNode.localCenterPoint);
    // Resize to matcth size of the original shape
    // (If bitmap fill, scaling would not match the original fill!)
    console.log(`New size:  ${bounds.width} ${bounds.height}`);
    newNode.resize(bounds.width, bounds.height);
    newNode.translation = translation;

    // children is not an Array.
    var found = false;
    var indexOfNode = -1;
    parent.children.forEach(function(child) {
        if (!found && child !== node) {
            indexOfNode++;
        } else {
            found = true;
        }
    });

    // Add new node in the same z-order
    console.log("indexOfNode = "+ indexOfNode);
    parent.addChild(newNode, indexOfNode);

    // remove old node
    node.removeFromParent();

    return newNode;
}

function updateShapes(nodes, settings) {
    var newNodesToSelect = [];
    nodes.forEach(node => {
        if (node instanceof sg.Rectangle || node instanceof sg.Ellipse) {
            console.log("Converting Rectangle or Ellipse shapes to star shapes...");
            var newNode = convertToPath(node, settings);
            newNodesToSelect.push(newNode);
        } else if (node instanceof sg.Path) {
            console.log("Edit Path shapes to star shapes...");
            updatePathData(node, settings);
        }
    });

    // If there are converted shapes, these are the new nodes to update
    if (newNodesToSelect.length > 0) {
        selectionItems = newNodesToSelect;
    }
}

function newStarShape() {
    console.log(`Creating a new star shape...`);
    var radius = 50;
    var settings = getSettings();

    // Draw shape and place in  center of parent
    var newNode = new sg.Path();
    newNode.pathData = StarPathShape(radius, radius, settings.starPoints, radius, settings.starPointInset);

    // Apply default stroke color
    newNode.stroke = new sg.Color("#707070");
    newNode.strokeWidth = 1;
    // Add new star shape to the currently focused artboard and move it to a position just below the settings text node if one is specified.
    insertionArtboard.addChild(newNode);
    var parentCenter = insertionArtboard.localCenterPoint;
    newNode.placeInParentCoordinates(newNode.localBounds, {x: parentCenter.x-newNode.localBounds.width/2, y: parentCenter.y-newNode.localBounds.height/2});

    return newNode;
}

// selection: current selection
// root: XD document root
function starTool(selection, root) {
    selectedBounds = new Map();
    selectionItems = selection.items;
    if (selection.focusedArtboard) {
        insertionArtboard = selection.focusedArtboard;
    } else {
        insertionArtboard = root;
    }

    // Uncomment to test creation of dialog UI in JS code
    //  createDialog();

    // Create a star shape path node if there isn't a selection
    if (selectionItems.length === 0) {
        var newNode = newStarShape();

        // Select the new star shape
        selection.items = [newNode];
        selectionItems = selection.items;
    }

    return showUI(selection);
}

module.exports = {
    commands: {
        "command.tool.shape.star": starTool
    }
};