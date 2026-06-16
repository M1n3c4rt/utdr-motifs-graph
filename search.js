const SEARCH_X = 27;
const SEARCH_LOAD = 160;
const SEARCH_GAP = 69;

const searchCamera = new Camera([document.getElementById("searchlayer")]);
const searchLayer = searchCamera.scenes[0];
const searchView = searchLayer.parentNode;

let searchBounds = searchView.getBoundingClientRect();
let searchHeight = searchBounds.bottom - searchBounds.top - SEARCH_GAP;
let searchScroll = 0;

const youtube = document.getElementById("youtubeintegration");
const trackContainer = document.getElementById("trackcontainer");
const trackIntegration = document.getElementById("trackintegration");

sfxPagerOut.volume = 0.75;
sfxNope.volume = 0.5;
sfxExit.volume = 0.5;

// ui elements!
// const toggle = document.getElementById("toggle");
const search = document.getElementById("search");
// const speed = document.getElementById("speed");

var searchraf; // I'm not sure why this is being kept track of, but... ok!

function searchDraw() {
    // Draw balls in search menu
    searchCamera.clear();
    searchLayer.style.height = `${searchResults.length * SEARCH_GAP}px`

    Object.entries(searchResults).forEach(([index, ball]) => {
        ball.searchBall.draw(SEARCH_X, index * SEARCH_GAP + NODE_HUD_HEIGHT);
    });
    // searchraf = window.requestAnimationFrame(searchDraw);
}

function updateBall(ball) {
    const index = searchResults.indexOf(ball);
    const newScroll = index * SEARCH_GAP;

    searchCamera.clearArea(0, index * SEARCH_GAP, searchCamera.width, SEARCH_GAP)
    ball.searchBall.draw(SEARCH_X, index * SEARCH_GAP + NODE_HUD_HEIGHT);
}

var ballInFocus;
function setBallFocus(ball, sound = true) {
    if (ballInFocus) {
        ballInFocus.inFocus = false;
        updateBall(ballInFocus);
    }

    ballInFocus = ball;

    if (ballInFocus) {
        ballInFocus.inFocus = true;
        camera.focus.enabled = true;

        const index = searchResults.indexOf(ballInFocus);
        if (index > -1) {
            searchBounds = searchView.getBoundingClientRect();
            searchHeight = searchBounds.bottom - searchBounds.top - SEARCH_GAP;
            const newScroll = index * SEARCH_GAP;

            if (newScroll < searchView.scrollTop) {
                searchView.scrollTop = newScroll;
            } else if (newScroll > searchView.scrollTop + searchHeight) {
                searchView.scrollTop = newScroll - searchHeight; 
            }

            updateBall(ballInFocus);
        }

        if (sound) {
            sfxPagerIn.currentTime = 0;
            sfxPagerIn.play();
        }

        if (ballInFocus.youtubeEmbed) {
            let src = "https://www.youtube-nocookie.com/embed/" + ballInFocus.youtubeEmbed.id + "?&autoplay=1";

            if (ballInFocus.youtubeEmbed.start) {
                src += "&start=" + ballInFocus.youtubeEmbed.start;
                if (ballInFocus.youtubeEmbed.end)
                    src += "&end=" + ballInFocus.youtubeEmbed.end;
            }

            // if (ballInFocus.youtubeEmbed.start) {
            //     // src += "&t=" + ballInFocus.youtubeEmbed.start
            //     youtube.setAttribute("start", ballInFocus.youtubeEmbed.start);
            // } else youtube.removeAttribute("start");

            // if (ballInFocus.youtubeEmbed.end) {
            //     // src += "&end=" + ballInFocus.youtubeEmbed.end;
            //     youtube.setAttribute("end", ballInFocus.youtubeEmbed.end);
            // } else youtube.removeAttribute("end");

            youtube.setAttribute("src", src);
            trackIntegration.setAttribute("src", "");
            trackContainer.pause();
        } else if (ballInFocus.trackEmbed) {
            trackIntegration.setAttribute("src", "assets/tracks/" + ballInFocus.trackEmbed.id + ".ogg");
            youtube.setAttribute("src", "");

            trackContainer.load();
            if (trackContainer.volume == 1) trackContainer.volume = 0.3;
            trackContainer.currentTime = 0;
            trackContainer.play();
        }
    } else {
        camera.focus.enabled = false;
        if (sound) {
            sfxPagerOut.currentTime = 0;
            sfxPagerOut.play();
        }
    }
}

function unfocusBall(newIndex = 0) {
    searchIndex = newIndex % searchResults.length;
    while (searchIndex < 0) searchIndex += searchResults.length;
    setBallFocus(null);
}

const searchResults = [];
let searchIndex = 0;

function changeSelect(change) {
    let index = searchResults.indexOf(ballInFocus);
    if (index < 0) index = searchIndex - 1;

    index += change;
    index %= searchResults.length;

    while (index < 0) index += searchResults.length;
    setBallFocus(searchResults[index]);
}

function searchNavigate(e) {
    if (e.key === "Enter") {
        if (searchResults.length > 0) {
            setBallFocus(searchResults[searchIndex]);
            searchIndex = (searchIndex + 1) % searchResults.length;
        } else {
            setBallFocus(null, false);
            sfxNope.currentTime = 0;
            sfxNope.play();
        }
    } else if (e.key === "ArrowUp") {
        changeSelect(-1);
        e.preventDefault();
    } else if (e.key === "ArrowDown") {
        changeSelect(1);
        e.preventDefault();
    }
}

search.addEventListener("keydown", searchNavigate);
searchView.addEventListener("keydown", searchNavigate);

function loadInitialSearch() {
    searchResults.push(...Object.values(balls));
    searchDraw();
    document.fonts.ready.then(() => {
        searchDraw();
    })
}

search.addEventListener("input", () => {
    if (ballInFocus) unfocusBall();

    // the evil regex ever. ,,
    // const regexStr = "[(" + search.value.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&').split(" ").join(")(") + ")]";

    // significantly less evil, actually working regex. ,,,,
    searchResults.length = 0;

    if (search.value == '') {
        Object.entries(balls).forEach(([id, ball]) => {
            ball.matchPercent = 0;
        });

        searchResults.push(...Object.values(balls));
    } else {
        const regexStr = search.value.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&');
        const regex = new RegExp(regexStr, "i");

        Object.entries(balls).forEach(([id, ball]) => {
            if (ball.filter(regex)) searchResults.push(ball);
        });

        searchResults.sort((a, b) => a.matchString.localeCompare(b.matchString));
        searchResults.sort((a, b) => b.matchPercent - a.matchPercent);
    }

    // hehe
    if (search.value.toLowerCase() == 'gaster') {
        search.value = search.value.substring(0, -2);
        window.location.reload();
    }

    searchDraw();
    searchDraw();
})

// toggle.addEventListener("click", () => {
//     console.log("nya");
//     if (ballInFocus) {
//         sfxToggle.currentTime = 0;
//         sfxToggle.play();
//         ballInFocus.isEnabled = !ballInFocus.isEnabled;
//         updateBall(ballInFocus);
//     } else {
//         sfxNope.currentTime = 0;
//         sfxNope.play();
//     }
// })

searchLayer.onwheel = event => {
    event.stopPropagation();
}

searchLayer.onmousedown = event => {
    event.stopPropagation();
    const ballIndex = Math.floor((event.pageY - searchLayer.getBoundingClientRect().top) / SEARCH_GAP);
    if (searchResults[ballIndex]) {
        setBallFocus(searchResults[ballIndex]);
        searchIndex = ballIndex + 1;
    }
}

searchLayer.onmouseup = event => {
    event.stopPropagation();
}

search.addEventListener("focus", (e) => {
    sfxFocus.currentTime = 0;
    sfxFocus.play();
})

class searchnode extends uinode {
    draw(x, y) {
        // const testY = y - searchScroll;
        // if (testY > (searchHeight + SEARCH_LOAD) || testY < -SEARCH_LOAD) return;
        super.draw(x, y);
    }
}

// search.addEventListener("blur", ({}) => {
//     sfxExit.currentTime = 0;
//     sfxExit.play();
// })

searchView.addEventListener("scroll", (e) => {
    // console.log(searchView.scrollTop);
    searchScroll = searchView.scrollTop;
})

window.addEventListener("resize", (e) => {
    searchDraw();
})

// searchraf = window.requestAnimationFrame(searchDraw);
