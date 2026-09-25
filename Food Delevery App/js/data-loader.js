const DATA_ROOT = new URL("../data/", import.meta.url);

export async function loadJSON(path) {
    const safePath = String(path || "").trim();
    if (!safePath) {
        throw new Error("A JSON path is required.");
    }

    const response = await fetch(new URL(safePath, DATA_ROOT), {
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Failed to load ${safePath}: HTTP ${response.status}`);
    }

    return await response.json();
}

export async function loadDataBundle(files) {
    if (!Array.isArray(files) || !files.length) {
        return {};
    }

    const entries = await Promise.all(
        files.map(async (file) => {
            const data = await loadJSON(file);
            return [file.replace(/\.json$/i, ""), data];
        })
    );

    return Object.fromEntries(entries);
}
