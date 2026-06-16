// some extra utility stuff that don't really make sense to put anywhere else.js
const rootDirectory = window.location.href.replace("/index.html", "");

function mergeData(base, data) {
    for (const [key, value] of Object.entries(data)) {
        if (key in base && typeof(base[key]) == 'object') {
            mergeData(base[key], value);
        } else {
            base[key] = value;
        }
    }
}

// Standardize shorthand definitions into the full ones.
function resolveShorthand(data, field) {
    try {
        if (data[field]) return data;
    } catch (error) {
        return data;
    }
    return { [field]: data };
}

function removeFrom(table, value) {
    const index = table.indexOf(value);
    if (index >= 0) table.splice(index, 1);
    return table;
}

function pythagoras(dx, dy) {
    return (dx**2 + dy**2)**0.5;
}

function lerp(from, to, i) {
    return from + (to - from) * i
}

// frame independent lerp - https://x.com/FreyaHolmer/status/1757836988495847568?lang=en :D
function freyalerp(from, to, halftime, deltaTime) {
    return lerp(from, to, 1 - Math.pow(2, -deltaTime / halftime))
}