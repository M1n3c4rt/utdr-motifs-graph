class Namespace {
    id; // Must be present.

    data = {}; // This is the combined data of all the assets.
    indivData = {}; // Individual, un-combined data.

    tracksData = {}; // Track embed data
    youtubeData = {}; // Youtube embed data

    static all = {};

    constructor(id) {
        this.id = id;
        Namespace.all[id] = this;
    }

    checkDependencies() {
        for (const [id, curData] of Object.entries(this.indivData)) {
            console.log(curData);
            for (const dependency of curData.dependencies) {
                let missing = true;
                for (const [id, namespace] of Object.entries(Namespace.all)) {
                    if (Object.hasOwn(namespace.indivData, dependency)) {
                        missing = false;
                        break;
                    }
                }
                if (missing) return false;
            }
        }
        return true;
    }

    async loadJson(path, youtubePath, tracksPath) {
        let rawJson = await fetch(rootDirectory + path);
        if (!rawJson.ok) throw new Error(`FATAL: Couldn't retrieve Leitmotifs JSON! ${rawJson.status} - ${rawJson.statusText}`);
        const newData = await rawJson.json();

        this.indivData[rawJson.id] = newData;
        mergeData(data, newData);

        let rawBand = await fetch(rootDirectory + youtubePath);
        if (!rawBand.ok) console.warn(`Couldn't retrieve YouTube JSON! ${rawBand.status} - ${rawBand.statusText}`);
        else youtubeData = (await rawBand.json()).tracks;

        let rawTracks = await fetch(rootDirectory + tracksPath);
        if (!rawTracks.ok) console.warn(`Couldn't retrieve Motif Tracks JSON! ${rawBand.status} - ${rawBand.statusText}`);
        else tracksData = (await rawTracks.json()).tracks;

        mergeData(youtubeData, rawBand);
        mergeData(tracksData, rawTracks);

        console.log(this.checkDependencies());
    }
}