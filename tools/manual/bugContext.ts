import { formatManualBugContext, getManualContext } from "./shared";

function main(): void {
  const context = getManualContext();
  console.log(formatManualBugContext(context));
}

main();
