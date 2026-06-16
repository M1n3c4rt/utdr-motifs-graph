// import node from "/ball.js";
// import Camera from "/camera.js";
// import { mergeData, removeFrom } from "/utils.js";

const DRAW_FPS = 60;
const DRAW_DELTA = 1000 / DRAW_FPS;

const layers = [...document.getElementById("canvas").children];
const camera = new Camera(layers);

var raf; // I'm not sure why this is being kept track of, but... ok!
var cursor = {
    x: 0, y: 0,
    screenX: 0, screenY: 0
}

// Movement keys! :D
movement = {
    W: 0, A: 0, S: 0, D: 0
}

// Keeps track of the canvas area.
var bounds = {
    x: 0, y: 0
}

let youtubeData = {}
let tracksData = {}
async function loadJson(path, youtubePath, tracksPath) {
    let rawJson = await fetch(rootDirectory + path);
    if (!rawJson.ok) throw new Error(`FATAL: Couldn't retrieve Leitmotifs JSON! ${rawJson.status} - ${rawJson.statusText}`);

    let rawBand = await fetch(rootDirectory + youtubePath);
    if (!rawBand.ok) console.warn(`Couldn't retrieve YouTube JSON! ${rawBand.status} - ${rawBand.statusText}`);
    else youtubeData = (await rawBand.json()).tracks;

    let rawTracks = await fetch(rootDirectory + tracksPath);
    if (!rawTracks.ok) console.warn(`Couldn't retrieve Motif Tracks JSON! ${rawBand.status} - ${rawBand.statusText}`);
    else tracksData = (await rawTracks.json()).tracks;

    rawJson.json().then(refreshTree);
}

var balls = {}
var ballsMotifs = {} // for leitmotifs that coalesce into a track
var data = {}

// TODO: Rework implementation. This is still legacy.
function refreshTree(newData) {
    mergeData(data, newData);
    const medleys = {}
    const isolates = Object.keys(newData.tracks);

    // Handle ball creation.
    Object.entries(newData.tracks).forEach(([id, track]) => {
        balls[id] = new node(id, track).setRenderInfo(camera, searchCamera);
        balls[id].resetStyle();

        if (track.prefix) balls[id].prefix = track.prefix
        if (track.subtitle) balls[id].subtitle = track.subtitle
        if (track.leitmotifs) medleys[id] = track.leitmotifs
    });

    // Handle leitmotif creation.
    Object.entries(newData.leitmotifs).forEach(([motif, subdata]) => {
        // Here we handle motif coalescing -
        // if a motif is primarily found in one track, then we consider the motif to be the track itself.
        const motifID = subdata.id ??= motif;
        if (motifID == motif) balls[motifID] = new node(motifID, subdata).setRenderInfo(camera, searchCamera).resetStyle();
        if (subdata.prefix) balls[motifID].prefix = subdata.prefix
        if (subdata.subtitle) balls[motifID].subtitle = subdata.subtitle
        removeFrom(isolates, motifID);
        balls[motifID].isIsolate = false;
    });

    // Handle leitmotif connections.
    Object.entries(newData.leitmotifs).forEach(([motif, subdata]) => {
        // We do this in seperate iterations to allow
        // leitmotifs to connect to each other without issue.
        const motifID = subdata.id ??= motif;
        const curBall = balls[motifID];
        ballsMotifs[motif] = curBall;
        curBall.applyStyle("leitmotif");
        if (subdata.style) curBall.applyStyle(subdata.style);

        subdata.associations.forEach(id => {
            curBall.addChild(balls[id]);
            removeFrom(isolates, id);
            balls[id].isIsolate = false;
        });
    });

    // Handle medley styles and connections.
    Object.entries(medleys).forEach(([track, motifs]) => {
        const curBall = balls[track];
        if (Object.keys(motifs).length > 3) curBall.applyStyle("medley");
        removeFrom(isolates, track);
        balls[track].isIsolate = false;

        Object.entries(motifs).forEach(([index, motif]) => {
            balls[motif].addChild(curBall);
            removeFrom(isolates, motif);
            balls[motif].isIsolate = false;
        });
    });

    let allNames = {}
    Object.entries(newData.tracks).forEach(([id, track]) => {
        if (balls[id].isIsolate) balls[id].applyStyle("isolate");
        if (track.style) balls[id].applyStyle(track.style)
        else if (track.isMinor) balls[id].applyStyle("minor")

        const lowerName = balls[id].name.toLowerCase();
        if (allNames[lowerName]) {
            balls[id].shouldDisambiguate = true;
            allNames[lowerName].shouldDisambiguate = true;
        }
        allNames[lowerName] = balls[id];

        Object.entries(newData.groups).forEach(([gID, group]) => {
            if (id.startsWith(gID)) balls[id].applyGroup(group, gID);
        });
    });

    loadInitialSearch();
}

FRICTION = 0.1
GRAVITY = 0.00001
const HALFGRID = 46; // Half of the `GridSquare.png`'s size in pixels.

// // Physics step.
// let lastStepTime = 0;
// function step(timestamp = 0) {
//     // If you somehow have perfect 60 FPS, this will always be 1.
//     let deltaTime = Math.min(4, (timestamp - lastStepTime) / STEP_DELTA) || 1;
// }

let edgeLerp = 0;
let lastDrawTime = 0;
function draw(timestamp) {
    // if (speed.value < -4) speed.value = -4;
    // else if (speed.value > 1.5) speed.value = 1.5;

    // If you somehow have perfect 60 FPS, this will always be 1.
    let deltaTime = Math.min(4, Math.min(DRAW_FPS, timestamp - lastDrawTime) / DRAW_DELTA);
    // console.log(deltaTime);
    lastDrawTime = timestamp;

    camera.refresh();
    [cursor.screenX, cursor.screenY] = camera.fromScreenCoords(cursor.x, cursor.y);

    if (document.activeElement == document.body) {
        if (movement.A) camera.x -= 16 * movement.A * deltaTime * camera.zoom;
        if (movement.D) camera.x += 16 * movement.D * deltaTime * camera.zoom;

        if (movement.W) camera.y -= 16 * movement.W * deltaTime * camera.zoom;
        if (movement.S) camera.y += 16 * movement.S * deltaTime * camera.zoom;
    }

    // Process physics, draw edges
    Object.entries(balls).forEach(([id, ball]) => {
        if (id != draggedNode) {
            ball.vx += ball.ax * 0.5 * deltaTime;
            ball.vy += ball.ay * 0.5 * deltaTime;

            ball.ax = -GRAVITY * ball.x - FRICTION * ball.vx * deltaTime;
            ball.ay = -GRAVITY * ball.y - FRICTION * ball.vy * deltaTime;

            if (ball.isEnabled) {
                Object.entries(balls).forEach(([_, ballb]) => {
                    ball.interact(ballb);
                });
            }
        } else {
            ball.drawEdges();
        }
    });

    // Sort balls for drawing
    var sortedIDs = [];
    Object.entries(balls).forEach(([id, ball]) => {
        sortedIDs.push(id);
    });

    sortedIDs.sort((b, a) => balls[a].dist - balls[b].dist);
    camera.updatePosition(deltaTime);

    // Draw balls, apply physics
    Object.entries(sortedIDs).forEach(([i, id]) => {
        const ball = balls[id];
        ball.draw();
        if (id != draggedNode) {
            ball.applyMotion(deltaTime);

            ball.vx += ball.ax * 0.5 * deltaTime;
            ball.vy += ball.ay * 0.5 * deltaTime;
        }
    });

    if (balls[draggedNode]) {
        const node = balls[draggedNode];
        edgeLerp = freyalerp(edgeLerp, node.onScreenEdge ? 1 : 0, 150, deltaTime);

        if (edgeLerp > 0) {
            camera.x = freyalerp(camera.x, lerp(camera.x, balls[draggedNode].x, edgeLerp), 20, deltaTime);
            camera.y = freyalerp(camera.y, lerp(camera.y, balls[draggedNode].y, edgeLerp), 20, deltaTime);

            camera.enforceBoundaries();
            [balls[draggedNode].x, balls[draggedNode].y] =
                camera.fromScreenCoords(dragAnchor.x - dragOffset.x + cursor.x,
                dragAnchor.y - dragOffset.y + cursor.y)
        }
    } 

    if (ballInFocus?.shouldUnfocus && isDragging && (ballInFocus.id != draggedNode)) unfocusBall(searchIndex - 1);

    // document.body.style.backgroundPositionX = `${-(camera.x - HALFGRID) / camera.zoom + camera.width * 0.5}px`;
    // document.body.style.backgroundPositionY = `${-(camera.y - HALFGRID) / camera.zoom + camera.height * 0.5}px`;
    // document.body.style.backgroundSize = `${50 / camera.zoom}px`;

    raf = window.requestAnimationFrame(draw);
}

var isDragging = false
var draggedNode = null

const dragAnchor = { x: 0, y: 0 }
const dragOffset = { x: 0, y: 0 }

const lastPinchPos = {
    x1: 0, y1: 0,
    x2: 0, y2: 0
}

function select(event, radius = 1.5) {
    if (!Object.entries(balls).some(([id,ball]) => {
        if (!ball.isEnabled) return;
        let [screenx,screeny] = camera.toScreenCoords(ball.x, ball.y);
        const dist = pythagoras(event.pageX - screenx, event.pageY - screeny - camera.getCanvasOffset());
        if (dist <= ball.radius / camera.zoom * radius + Math.max(0, camera.zoom * 4 - 4)) {
            setBallFocus(ball);
            return true;
        }
    }) && ballInFocus) {
        unfocusBall();
    }
}
canvas.ondblclick = select

function setCursorPos(x, y) {
    if (x) cursor.x = x;
    if (y) cursor.y = y;
}

function dragStart(event, radius = 1.5) {
    isDragging = true
    camera.focus.blocked = true;

    dragOffset.x = event.pageX
    dragOffset.y = event.pageY
    setCursorPos(event.pageX, event.pageY);
    
    draggedNode = null
    Object.entries(balls).forEach(([id,ball]) => {
        if (!ball.isEnabled && ball != ballInFocus) return;
        let [screenx,screeny] = camera.toScreenCoords(ball.x, ball.y);
        const dist = pythagoras(event.pageX - screenx, event.pageY - screeny - camera.getCanvasOffset());
        if (dist <= ball.radius / camera.zoom * radius + Math.max(0, camera.zoom * 4 - 4)) {
            draggedNode = id;
        }
    });
    
    if (draggedNode === null) {
        [dragAnchor.x, dragAnchor.y] = [camera.x, camera.y];
        document.body.style.cursor = "move"
    } else {
        [dragAnchor.x, dragAnchor.y] = camera.toScreenCoords(balls[draggedNode].x, balls[draggedNode].y);
        document.body.style.cursor = "grabbing";
    }
}

let tapTimer = null;
function clearTapTimer() {
    clearTimeout(tapTimer);
    tapTimer = null;
}

canvas.onmousedown = dragStart
canvas.addEventListener("touchstart", event => {
    event.preventDefault();
    searchView.blur();

    if (event.touches.length == 1) {
        if (tapTimer) {
            tapTimer = clearTapTimer();
            select(event.touches[0], 5);
        } else {
            tapTimer = setTimeout(clearTapTimer, 600);
            dragStart(event.touches[0], 5);
        }

        lastPinchPos.x1 = event.touches[0].pageX
        lastPinchPos.y1 = event.touches[0].pageY
    } else if (event.touches.length == 2) {
        lastPinchPos.x2 = event.touches[1].pageX
        lastPinchPos.y2 = event.touches[1].pageY
    }
}, { passive : false });

function dragMove(event) {
    setCursorPos(event.pageX, event.pageY);
    if (isDragging) {
        if (draggedNode === null) {
            camera.x = dragAnchor.x + (dragOffset.x - cursor.x) * camera.zoom
            camera.y = dragAnchor.y + (dragOffset.y - cursor.y) * camera.zoom
            if (camera.checkBoundsHit()) {
                [dragOffset.x, dragOffset.y] = [cursor.x, cursor.y];
                [dragAnchor.x, dragAnchor.y] = [camera.x, camera.y];
            }
        } else {
            [balls[draggedNode].x, balls[draggedNode].y] =
                camera.fromScreenCoords(dragAnchor.x - dragOffset.x + cursor.x,
                dragAnchor.y - dragOffset.y + cursor.y)
        }
    }
}

// What is this, chess?
function touchMove(event) {
    if (!isDragging) return;
    event.preventDefault();

    let swipingDrag = false;
    let swipingPinch = false;
    const drag = event.touches[0];
    const pinch = event.touches[1];
    
    for (const touch of event.changedTouches) {
        if (drag && touch.identifier == drag.identifier) swipingDrag = true;
        if (pinch && touch.identifier == pinch.identifier) swipingPinch = true;
    }

    if (!pinch) {
        if (swipingDrag) dragMove(drag);
        return;
    }

    if (swipingDrag || swipingPinch) {
        const distLast = pythagoras(lastPinchPos.x1 - lastPinchPos.x2, lastPinchPos.y1 - lastPinchPos.y2)
        const dist = pythagoras(drag.pageX - pinch.pageX, drag.pageY - pinch.pageY);

        const centerX = (drag.pageX + pinch.pageX) * 0.5;
        const centerY = (drag.pageY + pinch.pageY) * 0.5;

        const scale = distLast / dist;
        let [x, y] = camera.fromScreenCoords(centerX, centerY)
        camera.zoom = Math.min(10, Math.max(0.1, camera.zoom * scale))
        let [newx, newy] = camera.fromScreenCoords(centerX, centerY)
        camera.x += -newx + x
        camera.y += -newy + y

        lastPinchPos.x1 = drag.pageX
        lastPinchPos.y1 = drag.pageY
        lastPinchPos.x2 = pinch.pageX
        lastPinchPos.y2 = pinch.pageY
    }
}

document.body.onmousemove = dragMove
document.body.addEventListener("touchmove", touchMove, { passive : false });

function dragEnd(event) {
    isDragging = false
    camera.focus.blocked = false;
    draggedNode = null
    document.body.style.cursor = "auto"
    setCursorPos(event.pageX, event.pageY);
}

function touchEnd(event) {
    if (event.touches.length >= 1)
        dragStart(event.touches[0], 5);
    else
        dragEnd(event.changedTouches[0]);
}

document.body.onmouseup = dragEnd
// document.body.onmouseleave = dragEnd

window.addEventListener("blur", e => {
    dragEnd(e);
    movement.W = false;
    movement.A = false;
    movement.S = false;
    movement.D = false;
})

document.body.ontouchend = touchEnd
document.body.ontouchcancel = touchEnd

document.onwheel = event => {
    let oldzoom = camera.zoom
    let [x, y] = camera.fromScreenCoords(event.pageX, event.pageY)
    camera.zoom = Math.min(10, Math.max(0.1, camera.zoom*2 ** (event.deltaY/1000)))
    let [newx, newy] = camera.fromScreenCoords(event.pageX, event.pageY)
    camera.x += -newx+x
    camera.y += -newy+y
}

document.addEventListener("keydown", ({key}) => {
    if (key === "w") movement.W = 1;
    else if (key === "a") movement.A = 1;
    else if (key === "s") movement.S = 1;
    else if (key === "d") movement.D = 1;
    else if (key === "W") movement.W = 2;
    else if (key === "A") movement.A = 2;
    else if (key === "S") movement.S = 2;
    else if (key === "D") movement.D = 2;
    // If you're seeing this... no, no you're not :3c
    // (was lazy, didn't feel like making this elegant)
});

document.addEventListener("keyup", ({key}) => {
    const key2 = key.toLowerCase();
    if (key2 === "w") movement.W = 0;
    else if (key2 === "a") movement.A = 0;
    else if (key2 === "s") movement.S = 0;
    else if (key2 === "d") movement.D = 0;
});

window.onload = (e) => raf = window.requestAnimationFrame(draw);
loadJson("/utdr-leitmotif-graph.json", "/utdr-youtube.json", "/utdr-tracks.json");
