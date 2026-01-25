// load_module.js

interface WasmAlgo {
    probability: (graph: number[], ps: number[], startIndex?: number) => number;
    expectedLength: (graph: number[], ps: number[], startIndex?: number) => number;
  }
// loadAlgo.ts

export async function loadWasmModule(): Promise<WasmAlgo> {
  // @ts-expect-error
  const ModuleFactory = (await import('./wasm/algo.js')).default;
  const Module = await ModuleFactory();

  const c_prob = Module.cwrap('prob', 'number', ['number', 'number', 'number']);
  const c_explen = Module.cwrap('explen', 'number', ['number', 'number', 'number']);

  function callWasmFunc(
    fn: (graphPtr: number, psPtr: number, startIndex: number) => number,
    graphArr: number[],
    psArr: number[],
    startIndex: number = 2
  ): number {
    const graphTyped = new Uint32Array(graphArr);
    const psTyped = new Float64Array(psArr);

    const graphPtr = Module._malloc(graphTyped.length * graphTyped.BYTES_PER_ELEMENT);
    Module.HEAPU32.set(graphTyped, graphPtr >> 2);

    const psPtr = Module._malloc(psTyped.length * psTyped.BYTES_PER_ELEMENT);
    Module.HEAPF64.set(psTyped, psPtr >> 3);

    const result = fn(graphPtr, psPtr, startIndex);

    Module._free(graphPtr);
    Module._free(psPtr);

    return result;
  }

  function probability(graphArr: number[], psArr: number[], startIndex?: number): number {
    return callWasmFunc(c_prob, graphArr, psArr, startIndex);
  }

  function expectedLength(graphArr: number[], psArr: number[], startIndex?: number): number {
    return callWasmFunc(c_explen, graphArr, psArr, startIndex);
  }
  console.log
  return { probability, expectedLength };
}

let wasmInterface: WasmAlgo | null = null;
loadWasmModule().then((api) => {
  wasmInterface = api;
});

export function probability(graph: number[], p: number): number {
    if (!wasmInterface) {
      throw new Error('WASM module not loaded');
    }
    return wasmInterface.probability(graph, [p]);
  }
export function fairness(graph: number[], delta: number = 0.0001): number {
if (!wasmInterface) {
    throw new Error('WASM module not loaded');
}
    const p1 = probability(graph, 0.5);
    const p2 = probability(graph, 0.5 + delta);
    return (p2 - p1) / delta;
}
export function expectedLength(graph: number[], p: number): number {
  if (!wasmInterface) {
    throw new Error('WASM module not loaded');
  }
  return wasmInterface.expectedLength(graph, [p]);
}
export function linspace(start: number, stop: number, gap: number): number[] {
  const result: number[] = [];
  for (let i = start; i <= stop; i += gap) {
    result.push(i);
  }
  return result;
}
export function probability_parallel(
  graph: number[],
  ps: number[],
): { x: number; y: number; }[] {
  const ys = ps.map((p) => probability(graph, p));
  return ys.map((y, i) => ({ x: ps[i], y }));
}