import CanvasWorkspace from "./CanvasWorkspace";

import { createKitchenSinkNodes } from "../data/kitchenSinkFlow";
import { nodeDefinitions } from "../data/node-definitions";

const kitchenSinkNodes = createKitchenSinkNodes();

function KitchenSinkPage() {
  return (
    <main className="ff-kitchen-sink" aria-label="Kitchen sink preview">
      <section className="ff-kitchen-sink__canvas-shell" aria-label="All available nodes preview">
        <CanvasWorkspace initialNodes={kitchenSinkNodes} />

        <div className="ff-kitchen-sink__panel">
          <p className="ff-kitchen-sink__eyebrow">Kitchen Sink</p>
          <h1 className="ff-kitchen-sink__title">All frontier nodes in one canvas</h1>
          <p className="ff-kitchen-sink__copy">
            This preview lays out every available node on the canvas background so you can inspect the full palette at once.
          </p>
          <p className="ff-kitchen-sink__meta">
            {String(nodeDefinitions.length)} nodes across event triggers, accessors, logic gates, data sources, and actions.
          </p>
        </div>
      </section>
    </main>
  );
}

export default KitchenSinkPage;