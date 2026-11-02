// Reads {"html": "...", "root": "..."} from stdin, runs the built embed
// generator against it under jsdom, and prints {"text": "...", "hash": "..."}.
// Used by the Python behave specs, which exercise the real built bundle.
import { JSDOM } from "jsdom";

const chunks = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk);
}
const { html, root } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
const dom = new JSDOM(`<!DOCTYPE html><html><body>${html}</body></html>`);
globalThis.document = dom.window.document;
globalThis.Node = dom.window.Node;
globalThis.HTMLScriptElement = dom.window.HTMLScriptElement;
globalThis.Element = dom.window.Element;
const embed = await import("../../dist/embed.esm.js");
const { text } = embed.generateTtsText(root ? { root } : {});
const hash = await embed.computeContentHash(text, "default", "kokoro");
process.stdout.write(JSON.stringify({ text, hash }));
