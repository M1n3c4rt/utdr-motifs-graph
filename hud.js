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
    hudslide.setAttribute("isfocused", isFocused);
}

hudslide.addEventListener("focusin", (e) => updateHUD(1));
hudslide.addEventListener("focusout", (e) => updateHUD(-1));

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

function registerButtonPage(button, page) {
    button.addEventListener("click", (e) => {
        changePage(page);
    })
}

registerButtonPage(infobutton, infoui);
registerButtonPage(guidebutton, guideui);
registerButtonPage(searchbutton, searchui);

let currentPage;
function changePage(element) {

    if (currentPage) {
        currentPage.setAttribute("uivisible", false);
    }

    element.setAttribute("uivisible", true);
    currentPage = element;
}

changePage(searchui);