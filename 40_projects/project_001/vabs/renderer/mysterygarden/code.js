/*
 * Project-specific GS VABS stub for project_001 / mysterygarden.
 * This is a deterministic contract stub only. It is not a finished production renderer.
 */

var project001VabsStub = {
    readValue: function (row, key) {
        if (row && typeof row.getValue === "function") {
            return row.getValue(key);
        }
        return null;
    },

    getSummary: function (row) {
        return {
            roundId: this.readValue(row, "ROUND_ID"),
            entryState: this.readValue(row, "ENTRY_STATE"),
            resultState: this.readValue(row, "RESULT_STATE"),
            followUpState: this.readValue(row, "FOLLOW_UP_STATE"),
            awardFreeSpins: this.readValue(row, "AWARD_FREE_SPINS"),
            currency: this.readValue(row, "CURRENCY"),
            evidenceRefs: this.readValue(row, "EVIDENCE_REFS"),
            symbolGrid: this.readValue(row, "SYMBOL_GRID"),
            extBetId: row && typeof row.getExtBetId === "function" ? row.getExtBetId() : "",
            stateName: row && typeof row.getStateText === "function" ? row.getStateText() : "",
            bet: row && typeof row.getBet === "function" ? row.getBet() : "",
            payout: row && typeof row.getPayout === "function" ? row.getPayout() : ""
        };
    }
};

function start() {
    console.log("project_001 mysterygarden VABS stub loaded");
}

function createRowEvent(row) {
    var summary = project001VabsStub.getSummary(row);

    if (summary.roundId && typeof row.setRoundID === "function") {
        row.setRoundID(summary.roundId);
    }

    return row;
}

function draw(row) {
    var summary = project001VabsStub.getSummary(row);

    console.log("project_001 mysterygarden VABS stub draw", summary);

    /*
     * TODO: draw the reel grid from SYMBOL_GRID.
     * TODO: surface the free-spins award strip from AWARD_FREE_SPINS.
     * TODO: map visual states to the locked project_001 archived row contract.
     * TODO: replace console-only output with real engine drawing once a target row is captured.
     */

    return summary;
}
