class Camera {
    x = 0; y = 0;
    scenes; // These are all canvases!
    layers = []; // Meanwhile, these are all contexts.

    // Focus to this position over time.
    focus = {
        x: 0, y: 0,
        auto: false, // Auto-disable when destination is reached.
        enabled: false, // Enables the camera focus - `false` when there's nothing to focus on.
        blocked: false // Blocked does the same thing as disabled, but is used when dragging the canvas around.
    };

    // Enforces screen limits.
    bounds = {
        x: 5000, y: 4500
    };

    zoom = 1;
    width; height;
    fontSize = 21;
    font = 'determinationsans';

    constructor(scenes = []) {
        this.scenes = scenes;
        for (let i in scenes) this.layers.push(scenes[i].getContext("2d"));
        if (scenes.length > 0) this.refresh();
    }

    // Should be called at the beginning of every `draw()` call.
    refresh() {
        this.width = this.scenes[0].width;
        this.height = this.scenes[0].height;
        const fontSize = Math.max(this.fontSize * 0.5, this.fontSize / this.zoom);

        for (let i in this.layers) {
            this.layers[i].clearRect(0, 0, this.width, this.height);
            this.scenes[i].width  = this.scenes[i].clientWidth;
            this.scenes[i].height = this.scenes[i].clientHeight;
            this.layers[i].font = `${fontSize}px ${this.font}`;
        }
    }

    updatePosition(deltaTime) {
        if (this.focus.enabled && !this.focus.blocked) {
            this.x = freyalerp(this.x, this.focus.x, 10, deltaTime);
            this.y = freyalerp(this.y, this.focus.y, 10, deltaTime);
            if (this.focus.auto && this.x == this.focus.x && this.y == this.focus.y)
                this.focus.enabled = false;
        }

        this.enforceBoundaries();
    }

    // Alternative to `refresh`. Use for simpler applications or when things break.
    clear() {
        const fontSize = Math.max(this.fontSize * 0.5, this.fontSize / this.zoom);

        for (let i in this.layers) {
            this.layers[i].clearRect(0, 0, this.width, this.height);
            this.scenes[i].width  = this.scenes[i].clientWidth;
            this.scenes[i].height = this.scenes[i].clientHeight;
            this.layers[i].font = `${fontSize}px ${this.font}`;
        }
    }

    clearArea(x, y, width, height) {
        for (let i in this.layers) {
            this.layers[i].clearRect(x, y, width, height);
        }
    }

    getTrueBounds() {
        const result = [this.bounds.x + (this.width * 0.5 / this.zoom), this.bounds.y + (this.height * 0.5 / this.zoom)];
        return result;
    }

    checkBoundsHit() {
        const [width, height] = this.getTrueBounds();
        if (this.x < -width || this.x > width ||
            this.y < -height || this.y > height) return true;
        return false;
    }

    enforceBoundaries() {
        const [width, height] = this.getTrueBounds();
        this.x = Math.min(width, Math.max(this.x, -width));
        this.y = Math.min(height, Math.max(this.y, -height));
        // this.x = Math.min(this.bounds.x, Math.max(this.x, -this.bounds.x));
        // this.y = Math.min(this.bounds.y, Math.max(this.y, -this.bounds.y));
    }

    // Legacy function. Keeping it here to keep my sanity sane
    getCanvasOffset() {
        return this.scenes[0].getBoundingClientRect().top;
    }

    * toScreenCoords(x, y) {
        yield (x - this.x) / this.zoom + this.width / 2
        yield (y - this.y) / this.zoom + this.height / 2
    }

    * fromScreenCoords(x, y) {
        yield (x - this.width / 2) * this.zoom + this.x
        yield (y - this.height / 2) * this.zoom + this.y
    }
}
