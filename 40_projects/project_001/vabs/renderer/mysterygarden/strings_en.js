(function (root, factory) {
    var strings = factory();
    root.game_strings = strings;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = strings;
    }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    return {
        STUB_TITLE: "Mystery Garden Replay Summary (Stub)",
        STUB_SUBTITLE: "Read-only local replay proof from the project_001 archived-row fixture with explicit captured-vs-derived provenance and comparison status.",
        STUB_SCOPE: "This panel proves the row -> parser -> renderer direction only. It is not a finished production GS renderer."
    };
}));
