const canvas = document.getElementById("canvas");
// const DEBUG_TEXT = document.getElementById("t3");
const ctx = canvas.getContext("2d");

var balls = {}
let data = {}
async function initiate() {
    console.log(window.location.origin + "/utdr-leitmotif-graph.json");
    let rawJson = await fetch(window.location.origin + "/utdr-leitmotif-graph.json");
    if (!rawJson.ok) 
        throw new Error(`Couldn't retrieve JSON! ${rawJson.status} - ${rawJson.statusText}`);

    let data = rawJson.json();
    data.then(createTrees)
}

function mergeData(base, data) {
    for (const [key, value] of Object.entries(data)) {
        if (key in base && typeof(base[key]) == 'object') {
            mergeData(base[key], value);
        } else {
            base[key] = value;
        }
    }
}

function createTrees(newData) {
    mergeData(data, newData);

    const seenTracks = [];
    Object.entries(newData.motifGroups).forEach(([motif,tracks]) => {
        balls[motif] = new ball(motif, data.trackMappings[motif], 20, "#54527aff")
        tracks.forEach(track => {
            if (!seenTracks.includes(track)) {
                balls[track] = new ball(track, data.trackMappings[track], 15, "#b592db")
                seenTracks.push(track);
            }

            balls[motif].children.push(balls[track]);
            balls[track].parents.push(balls[motif]);
        });
    });

    newData.isolatedTracks.forEach(orphan => {
        balls[orphan] = new ball(orphan, data.trackMappings[orphan], 15, "#9797b3")
    });
}

initiate();

ctx.canvas.width  = window.innerWidth;
ctx.canvas.height = window.innerHeight;
ctx.rect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "#1f1f1f";
ctx.fill();
ctx.beginPath();

function pythagoras(dx, dy) {
    return (dx**2 + dy**2)**0.5;
}

SPRING_CONSTANT = 0.0025
IDEAL = 100
REPULSE_DISTANCE_MIN = 256
PERMITTIVITY = 250
FRICTION = 0.1
GRAVITY = 0.0001

class ball {
    parents = [];
    children = [];
    isEnabled = true;

    vx = 0;
    vy = 0;
    ax = 0;
    ay = 0;

    constructor(id, name, radius, color, x, y) {
        this.x = x == undefined ? ball.randomPosition() : x;
        this.y = y == undefined ? ball.randomPosition() : y;
        this.radius = radius
        this.id = id
        this.name = name || id
        this.color = color
    }

    draw() {
        if (!this.isEnabled) return;
        ctx.beginPath();
        ctx.arc(...toScreenCoords(this.x,this.y), this.radius/zoom, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.textAlign = "center"
        ctx.font = `${300/zoom/Math.max(10, this.name.length)}px determinationsans`
        ctx.fillStyle = "#ffffff";
        let [sx,sy] = toScreenCoords(this.x,this.y)
        ctx.fillText(this.name, sx, sy+3 / zoom * this.radius);
    }

    // Interacts with another ball, handling repulsion and spring physics.
    // If connected, also draws the edge between. Never called if the node is held.
    interact(ball) {
        if (ball.isEnabled && this.id != ball.id) {
            const dx = this.x - ball.x
            const dy = this.y - ball.y
            const dist = pythagoras(dx, dy)

            const isChild = this.parents.includes(ball);
            if (isChild) drawEdge(this.x, this.y, ball.x, ball.y);

            if (isChild || this.children.includes(ball)) {
                let spring = Math.max(-1000, Math.min(1000, -SPRING_CONSTANT * (dist - IDEAL)))
                this.ax += spring * dx / dist;
                this.ay += spring * dy / dist;
            } else {
                let repulsion = Math.min(1000, PERMITTIVITY / Math.max(REPULSE_DISTANCE_MIN, dist**1.5))
                this.ax += repulsion * dx / dist;
                this.ay += repulsion * dy / dist;
            }
        }
    }

    // This is used ONLY when the node is dragged.                                                i was here :3c - systemcymk
    // Else, this is handled by interact(), for minor performance reasons.
    drawEdges() {
        Object.entries(this.parents).forEach(([_, ball]) => {
            drawEdge(this.x, this.y, ball.x, ball.y);
        });
    }

    // Applies motion at the end of every frame.
    // Done separately from the interact() loop to ensure consistency in interactions.
    applyMotion() {
        this.x += this.vx;
        this.y += this.vy;
    }

    static randomPosition() {
        return Math.random() * 500 - 250;
    }
}

function drawEdge(x1,y1,x2,y2) {
    ctx.strokeStyle = "#aaaacc";
    ctx.beginPath();
    ctx.moveTo(...toScreenCoords(x1,y1));
    ctx.lineTo(...toScreenCoords(x2,y2));
    ctx.stroke();
}

var xoffset = 0
var yoffset = 0
var zoom = 1

function* toScreenCoords(x,y) {
    yield (x-xoffset)/zoom+canvas.width/2
    yield (y-yoffset)/zoom+canvas.height/2 
}
function* fromScreenCoords(x,y) {
    yield (x-canvas.width/2)*zoom + xoffset
    yield (y-canvas.height/2)*zoom + yoffset
}

function clear() {
    ctx.fillStyle = "#1f1f1f88";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function draw() {
    clear();
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;

    // Process physics, draw edges
    Object.entries(balls).forEach(([id, ball]) => {
        if (id != draggedNode) {
            ball.vx += ball.ax;
            ball.vy += ball.ay;
            ball.ax = -GRAVITY * ball.x - FRICTION * ball.vx
            ball.ay = -GRAVITY * ball.y - FRICTION * ball.vy
            Object.entries(balls).forEach(([_, ballb]) => {
                ball.interact(ballb);
            });
        } else {
            ball.drawEdges();
        }
    });

    // Draw balls, apply physics
    Object.entries(balls).forEach(([id,ball]) => {
        ball.draw()
        if (id != draggedNode) {
            ball.applyMotion();
        }
    });

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

function dragStart(event, radius = 1.5) {
    isDragging = true
    document.body.style.cursor = "move"
    dragOffset.x = event.pageX
    dragOffset.y = event.pageY
    
    draggedNode = null
    Object.entries(balls).forEach(([id,ball]) => {
        let [screenx,screeny] = toScreenCoords(ball.x, ball.y)
        const dist = pythagoras(event.pageX - screenx, event.pageY - screeny);
        if (dist <= ball.radius/zoom * radius) {
            draggedNode = id
        }
    });
    
    if (draggedNode === null) {
        dragAnchor.x = xoffset
        dragAnchor.y = yoffset
    } else {
        [dragAnchor.x, dragAnchor.y] = toScreenCoords(balls[draggedNode].x, balls[draggedNode].y)
    }
}

canvas.onmousedown = dragStart
canvas.ontouchstart = event => {
    event.preventDefault();
    if (event.touches.length == 1) {
        dragStart(event.touches[0], 5);
        lastPinchPos.x1 = event.touches[0].pageX
        lastPinchPos.y1 = event.touches[0].pageY
    } else if (event.touches.length == 2) {
        lastPinchPos.x2 = event.touches[1].pageX
        lastPinchPos.y2 = event.touches[1].pageY
    }
}

function dragMove(event) {
    if (isDragging) {
        if (draggedNode === null) {
            xoffset = Math.min(10000,Math.max(-10000,dragAnchor.x+(dragOffset.x-event.pageX)*zoom))
            yoffset = Math.min(5000,Math.max(-5000,dragAnchor.y+(dragOffset.y-event.pageY)*zoom))
        } else {
            [balls[draggedNode].x, balls[draggedNode].y] = fromScreenCoords(dragAnchor.x-dragOffset.x+event.pageX,dragAnchor.y-dragOffset.y+event.pageY)
        }
    }
}

canvas.onmousemove = dragMove
canvas.ontouchmove = event => {
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
        let [x,y] = fromScreenCoords(centerX, centerY)
        zoom = Math.min(10, Math.max(0.1, zoom * scale))
        let [newx,newy] = fromScreenCoords(centerX, centerY)
        xoffset += -newx+x
        yoffset += -newy+y

        lastPinchPos.x1 = drag.pageX
        lastPinchPos.y1 = drag.pageY
        lastPinchPos.x2 = pinch.pageX
        lastPinchPos.y2 = pinch.pageY
    }
}

function dragEnd(event) {
    isDragging = false
    draggedNode = null
    document.body.style.cursor = "auto"
}

function touchEnd(event) {
    if (event.touches.length >= 1)
        dragStart(event.touches[0], 5);
    else
        dragEnd(event);
}

canvas.onmouseup = dragEnd
canvas.onmouseleave = dragEnd

canvas.ontouchend = touchEnd
canvas.ontouchcancel = touchEnd

document.onwheel = event => {
    let oldzoom = zoom
    let [x,y] = fromScreenCoords(event.pageX,event.pageY)
    zoom = Math.min(10,Math.max(0.1,zoom*2**(event.deltaY/1000)))
    let [newx,newy] = fromScreenCoords(event.pageX,event.pageY)
    xoffset += -newx+x
    yoffset += -newy+y
}