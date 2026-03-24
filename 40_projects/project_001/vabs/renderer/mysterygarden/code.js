/*
 * Project-specific GS VABS stub for project_001 / mysterygarden.
 * This is a deterministic replay-summary stub only. It is not a finished production renderer.
 */

(function (root, factory) {
    var api = factory(root);
    root.project001VabsStub = api;
    root.start = api.start;
    root.createRowEvent = api.createRowEvent;
    root.draw = api.draw;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
}(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
    var fallbackStrings = {
        STUB_TITLE: "Mystery Garden Replay Summary (Stub)",
        STUB_SUBTITLE: "Read-only local replay proof from the project_001 archived-row fixture with explicit captured-vs-derived provenance.",
        STUB_SCOPE: "This panel proves the row -> parser -> renderer direction only. It is not a finished production GS renderer."
    };

    function readStrings() {
        if (root && root.game_strings) {
            return root.game_strings;
        }
        return fallbackStrings;
    }

    function readValue(row, key) {
        if (row && typeof row.getValue === "function") {
            return row.getValue(key);
        }
        return "";
    }

    function parseList(text) {
        if (!text) {
            return [];
        }
        return String(text)
            .split("|")
            .map(function (value) { return value.trim(); })
            .filter(function (value) { return value.length > 0; });
    }

    function parseGrid(text) {
        return parseList(text).map(function (column) {
            return column
                .split(",")
                .map(function (cell) { return cell.trim(); })
                .filter(function (cell) { return cell.length > 0; });
        });
    }

    function flattenGrid(grid) {
        return grid.reduce(function (cells, column) {
            return cells.concat(column);
        }, []);
    }

    function countSymbol(grid, symbol) {
        return flattenGrid(grid).filter(function (value) {
            return value === symbol;
        }).length;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll("\"", "&quot;");
    }

    function renderGridTable(columns) {
        if (!columns.length) {
            return "<p>No encoded board is available in this stub fixture.</p>";
        }

        var maxRows = 0;
        columns.forEach(function (column) {
            if (column.length > maxRows) {
                maxRows = column.length;
            }
        });

        var rows = [];
        for (var rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
            var cells = columns.map(function (column) {
                return "<td>" + escapeHtml(column[rowIndex] || "-") + "</td>";
            });
            rows.push("<tr>" + cells.join("") + "</tr>");
        }

        return "<table>" + rows.join("") + "</table>";
    }

    function getSummary(row) {
        var symbolGrid = parseGrid(readValue(row, "SYMBOL_GRID"));
        var followUpSymbolGrid = parseGrid(readValue(row, "FOLLOW_UP_SYMBOL_GRID"));
        var evidenceRefs = parseList(readValue(row, "EVIDENCE_REFS"));

        return {
            roundId: readValue(row, "ROUND_ID"),
            capturedRoundId: readValue(row, "CAPTURED_ROUND_ID"),
            capturedRoundIdEvidence: readValue(row, "CAPTURED_ROUND_ID_EVIDENCE"),
            fixtureKind: readValue(row, "FIXTURE_KIND"),
            fixtureProvenance: readValue(row, "FIXTURE_PROVENANCE"),
            captureStatus: readValue(row, "CAPTURE_STATUS"),
            sourceCapture: readValue(row, "SOURCE_CAPTURE"),
            donorId: readValue(row, "DONOR_ID"),
            sourceNote: readValue(row, "SOURCE_NOTE"),
            entryState: readValue(row, "ENTRY_STATE"),
            resultState: readValue(row, "RESULT_STATE"),
            followUpState: readValue(row, "FOLLOW_UP_STATE"),
            featureMode: readValue(row, "FEATURE_MODE"),
            awardFreeSpins: readValue(row, "AWARD_FREE_SPINS"),
            counterFreeSpinsAwarded: readValue(row, "COUNTER_FREE_SPINS_AWARDED"),
            currency: readValue(row, "CURRENCY"),
            triggerModalText: readValue(row, "TRIGGER_MODAL_TEXT"),
            followUpCounterText: readValue(row, "FOLLOW_UP_COUNTER_TEXT"),
            evidenceRefs: evidenceRefs,
            evidenceRefCount: evidenceRefs.length,
            symbolGrid: symbolGrid,
            followUpSymbolGrid: followUpSymbolGrid,
            triggerBoardColumns: symbolGrid.length,
            triggerBoardRows: symbolGrid.length ? Math.max.apply(null, symbolGrid.map(function (column) { return column.length; })) : 0,
            followUpBoardColumns: followUpSymbolGrid.length,
            followUpBoardRows: followUpSymbolGrid.length ? Math.max.apply(null, followUpSymbolGrid.map(function (column) { return column.length; })) : 0,
            triggerKeyCount: countSymbol(symbolGrid, "KEY"),
            triggerBookCount: countSymbol(symbolGrid, "BOOK"),
            followUpKeyCount: countSymbol(followUpSymbolGrid, "KEY"),
            followUpBookCount: countSymbol(followUpSymbolGrid, "BOOK"),
            extBetId: row && typeof row.getExtBetId === "function" ? row.getExtBetId() : "",
            stateId: row && typeof row.getStateID === "function" ? row.getStateID() : "",
            stateName: row && typeof row.getStateText === "function" ? row.getStateText() : "",
            bet: row && typeof row.getBet === "function" ? row.getBet() : "",
            win: row && typeof row.getPayout === "function" ? row.getPayout() : "",
            balance: row && typeof row.getBalance === "function" ? row.getBalance() : ""
        };
    }

    function renderSummaryText(summary) {
        var lines = [
            "Mystery Garden Replay Summary (Stub)",
            "ROUND_ID: " + (summary.roundId || "-"),
            "Captured ROUND_ID: " + (summary.capturedRoundId || "-"),
            "Captured ROUND_ID Evidence: " + (summary.capturedRoundIdEvidence || "-"),
            "Fixture: " + (summary.actualFixtureSelection || summary.fixtureKind || "-") + " [" + (summary.fixturePath || "-") + "]",
            "Fixture Provenance: " + (summary.fixtureProvenance || "-"),
            "Capture Status: " + (summary.captureStatus || "-"),
            "State: " + (summary.stateName || "-") + " (" + (summary.stateId || "-") + ")",
            "State Flow: " + (summary.entryState || "-") + " -> " + (summary.resultState || "-") + " -> " + (summary.followUpState || "-"),
            "Feature Mode: " + (summary.featureMode || "-"),
            "Bet/Win/Balance: " + summary.bet + " / " + summary.win + " / " + summary.balance + " " + (summary.currency || ""),
            "Free Spins Awarded: " + (summary.awardFreeSpins || "-"),
            "Counter: " + (summary.followUpCounterText || "-"),
            "Trigger Message: " + (summary.triggerModalText || "-"),
            "Trigger Board: " + summary.triggerBoardColumns + "x" + summary.triggerBoardRows + " (KEY=" + summary.triggerKeyCount + ", BOOK=" + summary.triggerBookCount + ")",
            "Follow-up Board: " + summary.followUpBoardColumns + "x" + summary.followUpBoardRows + " (KEY=" + summary.followUpKeyCount + ", BOOK=" + summary.followUpBookCount + ")",
            "extBetId: " + (summary.extBetId || "-"),
            "Source Capture: " + (summary.sourceCapture || "-"),
            "Evidence Refs: " + (summary.evidenceRefs.length ? summary.evidenceRefs.join(", ") : "-"),
            "Source Note: " + (summary.sourceNote || "-")
        ];

        return lines.join("\n");
    }

    function renderSummaryHtml(summary) {
        var strings = readStrings();
        var evidenceItems = summary.evidenceRefs.length
            ? "<ul class=\"mg-vabs-stub-list\">" + summary.evidenceRefs.map(function (ref) {
                return "<li>" + escapeHtml(ref) + "</li>";
            }).join("") + "</ul>"
            : "<p>No grounded evidence refs are recorded for this row.</p>";

        return [
            "<section class=\"mg-vabs-stub-panel\">",
            "  <div class=\"mg-vabs-stub-header\">",
            "    <h1>" + escapeHtml(strings.STUB_TITLE || fallbackStrings.STUB_TITLE) + "</h1>",
            "    <p class=\"mg-vabs-stub-subtitle\">" + escapeHtml(strings.STUB_SUBTITLE || fallbackStrings.STUB_SUBTITLE) + "</p>",
            "  </div>",
            "  <div class=\"mg-vabs-stub-grid\">",
            "    <article class=\"mg-vabs-stub-card\">",
            "      <h2>Round</h2>",
            "      <p><span class=\"mg-vabs-stub-label\">ROUND_ID</span>" + escapeHtml(summary.roundId || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Captured</span>" + escapeHtml(summary.capturedRoundId || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">extBetId</span>" + escapeHtml(summary.extBetId || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">State</span>" + escapeHtml(summary.stateName || "-") + " (" + escapeHtml(summary.stateId || "-") + ")</p>",
            "    </article>",
            "    <article class=\"mg-vabs-stub-card\">",
            "      <h2>Wallet Summary</h2>",
            "      <p><span class=\"mg-vabs-stub-label\">Bet</span>" + escapeHtml(summary.bet) + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Win</span>" + escapeHtml(summary.win) + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Balance</span>" + escapeHtml(summary.balance) + " " + escapeHtml(summary.currency || "") + "</p>",
            "    </article>",
            "    <article class=\"mg-vabs-stub-card\">",
            "      <h2>Feature Cue</h2>",
            "      <p><span class=\"mg-vabs-stub-label\">Mode</span>" + escapeHtml(summary.featureMode || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Award</span>" + escapeHtml(summary.awardFreeSpins || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Counter</span>" + escapeHtml(summary.counterFreeSpinsAwarded || "-") + "</p>",
            "    </article>",
            "    <article class=\"mg-vabs-stub-card\">",
            "      <h2>Provenance</h2>",
            "      <p><span class=\"mg-vabs-stub-label\">Fixture</span>" + escapeHtml(summary.actualFixtureSelection || summary.fixtureKind || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Provenance</span>" + escapeHtml(summary.fixtureProvenance || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Status</span>" + escapeHtml(summary.captureStatus || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Evidence</span>" + escapeHtml(summary.capturedRoundIdEvidence || "-") + "</p>",
            "    </article>",
            "  </div>",
            "  <div class=\"mg-vabs-stub-sequence\">" + escapeHtml(summary.entryState || "-") + " -> " + escapeHtml(summary.resultState || "-") + " -> " + escapeHtml(summary.followUpState || "-") + "</div>",
            "  <div class=\"mg-vabs-stub-grid\">",
            "    <article class=\"mg-vabs-stub-card\">",
            "      <h2>Text Cue</h2>",
            "      <p>" + escapeHtml(summary.triggerModalText || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Follow-up</span>" + escapeHtml(summary.followUpCounterText || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Source</span>" + escapeHtml(summary.sourceCapture || "-") + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">Donor</span>" + escapeHtml(summary.donorId || "-") + "</p>",
            "    </article>",
            "    <article class=\"mg-vabs-stub-card\">",
            "      <h2>Trigger Board</h2>",
            "      <p><span class=\"mg-vabs-stub-label\">Shape</span>" + escapeHtml(summary.triggerBoardColumns + "x" + summary.triggerBoardRows) + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">KEY</span>" + escapeHtml(summary.triggerKeyCount) + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">BOOK</span>" + escapeHtml(summary.triggerBookCount) + "</p>",
                   renderGridTable(summary.symbolGrid),
            "    </article>",
            "    <article class=\"mg-vabs-stub-card\">",
            "      <h2>Follow-up Board</h2>",
            "      <p><span class=\"mg-vabs-stub-label\">Shape</span>" + escapeHtml(summary.followUpBoardColumns + "x" + summary.followUpBoardRows) + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">KEY</span>" + escapeHtml(summary.followUpKeyCount) + "</p>",
            "      <p><span class=\"mg-vabs-stub-label\">BOOK</span>" + escapeHtml(summary.followUpBookCount) + "</p>",
                   renderGridTable(summary.followUpSymbolGrid),
            "    </article>",
            "  </div>",
            "  <article class=\"mg-vabs-stub-card\">",
            "    <h2>Evidence Refs</h2>",
            "    <p><span class=\"mg-vabs-stub-label\">Count</span>" + escapeHtml(summary.evidenceRefCount || 0) + "</p>",
                 evidenceItems,
            "  </article>",
            "  <article class=\"mg-vabs-stub-card\">",
            "    <h2>Source Note</h2>",
            "    <p>" + escapeHtml(summary.sourceNote || "-") + "</p>",
            "  </article>",
            "  <p class=\"mg-vabs-stub-subtitle\">" + escapeHtml(strings.STUB_SCOPE || fallbackStrings.STUB_SCOPE) + "</p>",
            "</section>"
        ].join("");
    }

    function mountSummary(summary) {
        if (!root || !root.document || !root.document.body) {
            return;
        }

        var container = root.document.getElementById("mg-vabs-stub-summary");
        if (!container) {
            container = root.document.createElement("section");
            container.id = "mg-vabs-stub-summary";
            root.document.body.appendChild(container);
        }
        container.innerHTML = renderSummaryHtml(summary);
    }

    function start() {
        console.log("project_001 mysterygarden VABS stub loaded");
    }

    function createRowEvent(row) {
        var summary = getSummary(row);

        if (summary.roundId && row && typeof row.setRoundID === "function") {
            row.setRoundID(summary.roundId);
        }

        return row;
    }

    function draw(row) {
        var summary = getSummary(row);
        mountSummary(summary);
        console.log("project_001 mysterygarden replay summary", summary);
        return summary;
    }

    return {
        start: start,
        createRowEvent: createRowEvent,
        draw: draw,
        getSummary: getSummary,
        renderSummaryHtml: renderSummaryHtml,
        renderSummaryText: renderSummaryText
    };
}));
