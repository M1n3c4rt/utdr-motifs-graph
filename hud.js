const NODE_HUD_HEIGHT = 36;

// For the UI + Search menu !!
const sfxPagerIn = new Audio(rootDirectory + '/sfx/snd_select.wav');
const sfxPagerOut = new Audio(rootDirectory + '/sfx/snd_smallswing.wav');
const sfxNope = new Audio(rootDirectory + '/sfx/snd_cantselect.wav');
const sfxFocus = new Audio(rootDirectory + '/sfx/snd_menumove.wav');
const sfxExit = new Audio(rootDirectory + '/sfx/snd_cantselect.wav');
const sfxToggle = new Audio(rootDirectory + '/sfx/snd_equip.wav');

const hud = document.getElementById("hud");
const hudslide = document.getElementById("hudslide");
const hudbuttons = document.getElementById("uiselector");
const bandcamp = document.getElementById("bandcampintegration");

const infoui = document.getElementById("infoui");
const guideui = document.getElementById("guideui");
const searchui = document.getElementById("searchui");

const infobutton = document.getElementById("uiselector-info");
const guidebutton = document.getElementById("uiselector-guide");
const searchbutton = document.getElementById("uiselector-search");

hud.setAttribute("isfocused", false);
let hudFocused = false;

function isHudFocused() {
    return hudFocused > 0;
}

function updateHUD(inc) {
    hudFocused += inc;
    const isFocused = isHudFocused();
    const wasFocused = hudslide.getAttribute("isfocused");
    hudslide.setAttribute("isfocused", isFocused);
    return isFocused != wasFocused;
}

// Give up, focus on bandcamp is broken
// var wasBandcamp = false;
// window.addEventListener("click", (e) => {
//     console.log(document.activeElement);
//     if (document.activeElement != bandcamp) return;
//     wasBandcamp = true;
//     updateHUD(1);
// })

// window.addEventListener("blur", (e) => {
//     if (!wasBandcamp) return;
//     wasBandcamp = false;
//     updateHUD(-1);
// })

// Would love to use click here, but it messes with focusin
function registerButtonPage(button, page) {
    button.addEventListener("click", (e) => {
        changePage(page, button);
    })
}

registerButtonPage(infobutton, infoui);
registerButtonPage(guidebutton, guideui);
registerButtonPage(searchbutton, searchui);

searchbutton.addEventListener("click", (e) => {
    searchDraw();
})

// hudslide.addEventListener("focusin", (e) => {
//     // if (updateHUD(1)) e.target.click();
//     updateHUD(1);
// });
// hudslide.addEventListener("focusout", (e) => updateHUD(-1));

let currentPage = null;
let currentButton = null;
function changePage(element, button) {
    sfxPagerIn.currentTime = 0;
    sfxPagerIn.play();

    if (currentButton == button) {
        if (button) updateHUD(-1);
        button = null;
    } else if (!currentButton) updateHUD(1);

    if (currentPage) {
        if (currentButton) currentButton.setAttribute("selected", false);
        if (element) currentPage.setAttribute("uivisible", false);
    }

    if (element) {
        element.setAttribute("uivisible", true);
        if (button) button.setAttribute("selected", true);
    }

    currentPage = element;
    currentButton = button;

    console.log(hudFocused);
}

changePage(searchui);

class uinode {
    sx; sy;
    camera; bodyLayer;
    constructor(ball, camera) {
        this.ball = ball;
        this.camera = camera;
        this.bodyLayer = camera.layers[0];
    }

    get ctx() { return this.bodyLayer; }
    get color() { return this.ball.color; }
    get outline() { return this.ball.outline; }
    get inFocus() { return this.ball.inFocus; }
    get radius() { return this.ball.radius; }
    get angle() { return this.ball.angle; }
    get sides() { return this.ball.sides; }

    draw(x, y) {
        this.sx = x; this.sy = y;
        if (!this.ball.isEnabled) this.ctx.globalAlpha = 0.25;

        node.drawGeneric(this);
        this.ctx.globalAlpha = 1;

        const xpos = this.sx + NODE_HUD_HEIGHT;
        const ypos = this.ball.subtitle ? this.sy : this.sy + 8;

        this.ctx.textAlign = "left"
        this.ctx.strokeStyle = "#000000";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.lineWidth = node.getStrokeZoomed(4, this.camera.zoom);

        if (!this.ball.prefix) {
            node.drawText(this.ctx, this.ball.name, xpos, ypos);
        } else {
            const width = this.ctx.measureText(this.ball.prefix + " ").width;

            node.drawText(this.ctx, this.ball.name, xpos + width, ypos);
            this.ctx.fillStyle = "#ccff22";
            node.drawText(this.ctx, this.ball.prefix, xpos, ypos);
        }

        if (this.ball.subtitle) {
            this.ctx.fillStyle = "#7f7f7f";
            node.drawText(this.ctx, this.ball.subtitle, xpos, ypos + this.camera.fontSize + 2);
        }
    }
}
