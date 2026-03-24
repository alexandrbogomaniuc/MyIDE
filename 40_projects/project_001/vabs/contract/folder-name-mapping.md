# Folder Name Mapping

## Decision
- Intended GS VABS folder name for `project_001`: `mysterygarden`
- Decision status: provisional but intended

## Why This Folder Name
The audited GS VABS host page does not load an arbitrary folder name. It:
- reads the full game name from game metadata
- lowercases it
- strips supported platform/prefix variations
- resolves `common/vabs/<folderName>/code.js`

For `project_001`, the proven donor/game name is `Mystery Garden`.
The intended normalized folder token is therefore `mysterygarden`.

## Assumptions
- The eventual target GS full game name will normalize to `mysterygarden`.
- If the production full game name carries a platform suffix or known prefix, the GS normalization step should still collapse it back to `mysterygarden`.
- This decision is still marked provisional until a real target game name or target metadata export confirms the exact upstream name.

## Why Not Leave This Vague
- Folder-name drift is one of the easiest ways to break VABS package loading.
- The project-local renderer stub and verification harness need one concrete target folder in order to stay testable.

## Shipping Rule
Before a production VABS package ships:
- verify the real upstream full game name
- rerun the normalization logic against that name
- confirm the deployed static package folder matches the normalized result
