let y=null;async function w(){return y||(window.loadPyodide||await new Promise((t,e)=>{const r=document.createElement("script");r.src="https://cdn.jsdelivr.net/pyodide/v0.27.6/full/pyodide.js",r.onload=t,r.onerror=e,document.head.appendChild(r)}),y=await window.loadPyodide({indexURL:"https://cdn.jsdelivr.net/pyodide/v0.27.6/full/"})),y}const b=`from enum import Enum
from typing import Any, Iterator, Callable
from dataclasses import dataclass
from inspect import signature


@dataclass(frozen=True, eq=True)
class Edge:
    future: tuple[bool, ...]
    target_state: int


@dataclass(frozen=True, eq=True)
class Node:
    state: int
    edges: tuple[Edge, ...]


class GameEnd(Enum):
    WIN = 1
    LOSE = 2


def generate_future(n_params: int) -> Iterator[tuple[bool, ...]]:
    if n_params == 1:
        yield (False,)
        yield (True,)
    else:
        for future in generate_future(n_params - 1):
            yield (False,) + future
            yield (True,) + future


@dataclass(frozen=True, eq=True)
class GameGraph:
    nodes: list[Node]
    states: list[Any]
    playing_function: Callable[..., Any | GameEnd]
    root: Any

    def _serialize_int(self) -> list[int]:
        output: list[int] = []
        n_edges: int = -1
        for node in self.nodes:
            if n_edges < 1:
                n_edges = len(node.edges)
            else:
                assert n_edges == len(node.edges)

        for node in self.nodes:
            for edge in node.edges:
                assert 2 ** len(edge.future) == n_edges
                k: int = len(edge.future)
        output = []
        output.append(k)
        output.append(len(self.nodes))
        for node in self.nodes:
            for edge in node.edges:
                output.append(edge.target_state)
        return output

    @classmethod
    def compute_graph(
        cls,
        playing_function: Callable[..., Any | GameEnd],
        root: Any,
    ) -> "GameGraph":
        n_params: int = len(signature(playing_function).parameters) - 1
        states: dict[Any, int] = {GameEnd.WIN: 0, GameEnd.LOSE: 1}
        nodes: list[Node] = [Node(state=0, edges=()), Node(state=1, edges=())]

        def _dfs(score: Any) -> None:
            states[score] = len(states)
            score_idx = len(states) - 1
            nodes.append(Node(state=score_idx, edges=()))
            edges: list[Edge] = []
            for probe in generate_future(n_params):
                n_score = playing_function(score, *probe)
                if n_score not in states and not isinstance(n_score, GameEnd):
                    _dfs(n_score)
                edges.append(Edge(future=probe, target_state=states[n_score]))
            nodes[score_idx] = Node(state=score_idx, edges=tuple(edges))

        _dfs(root)

        states_list = list(states.keys())
        for k in range(len(states_list)):
            states[states_list[k]] = k

        return GameGraph(
            nodes=nodes,
            states=states_list,
            playing_function=playing_function,
            root=root,
        )
`;async function P(t){const e=await w();await e.runPythonAsync(b),await e.runPythonAsync(t);const r=await e.runPythonAsync('"play_fn" in globals()'),a=await e.runPythonAsync('"s0" in globals()');if(!r)throw new Error("Function play_fn is not defined in the provided code.");if(!a)throw new Error("Variable s0 is not defined in the provided code.");const s=await e.runPythonAsync("GameGraph.compute_graph(play_fn, s0)._serialize_int()");return console.log(s.toJs()),console.log("MAX",Math.max(...s.toJs())),s.toJs()}async function T(t){try{return{result:await P(t),error:null}}catch(e){return e instanceof Error?(console.log(`Error executing Python code (instance of Error): ${e.message}`),{result:[],error:e.message??"Unknown error"}):(console.log(`Error executing Python code (not instance of Error): ${e}`),{result:[],error:String(e)??"Unknown error"})}}const A="modulepreload",v=function(t){return"/"+t},h={},x=function(e,r,a){let s=Promise.resolve();if(r&&r.length>0){let d=function(o){return Promise.all(o.map(c=>Promise.resolve(c).then(l=>({status:"fulfilled",value:l}),l=>({status:"rejected",reason:l}))))};document.getElementsByTagName("link");const n=document.querySelector("meta[property=csp-nonce]"),u=(n==null?void 0:n.nonce)||(n==null?void 0:n.getAttribute("nonce"));s=d(r.map(o=>{if(o=v(o),o in h)return;h[o]=!0;const c=o.endsWith(".css"),l=c?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${o}"]${l}`))return;const i=document.createElement("link");if(i.rel=c?"stylesheet":A,c||(i.as="script"),i.crossOrigin="",i.href=o,u&&i.setAttribute("nonce",u),document.head.appendChild(i),c)return new Promise((p,m)=>{i.addEventListener("load",p),i.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${o}`)))})}))}function _(d){const n=new Event("vite:preloadError",{cancelable:!0});if(n.payload=d,window.dispatchEvent(n),!n.defaultPrevented)throw d}return s.then(d=>{for(const n of d||[])n.status==="rejected"&&_(n.reason);return e().catch(_)})};async function G(){const t=(await x(async()=>{const{default:n}=await import("./algo-DIQMH_MR.js");return{default:n}},[])).default,e=await t(),r=e.cwrap("prob","number",["number","number","number"]),a=e.cwrap("explen","number",["number","number","number"]);function s(n,u,o,c=2){const l=new Uint32Array(u),i=new Float64Array(o),p=e._malloc(l.length*l.BYTES_PER_ELEMENT);e.HEAPU32.set(l,p>>2);const m=e._malloc(i.length*i.BYTES_PER_ELEMENT);e.HEAPF64.set(i,m>>3);const E=n(p,m,c);return e._free(p),e._free(m),E}function _(n,u,o){return s(r,n,u,o)}function d(n,u,o){return s(a,n,u,o)}return{probability:_,expectedLength:d}}let f=null;G().then(t=>{f=t});function g(t,e){if(!f)throw new Error("WASM module not loaded");return f.probability(t,[e])}function S(t,e=1e-4){if(!f)throw new Error("WASM module not loaded");const r=g(t,.5);return(g(t,.5+e)-r)/e}function L(t,e){if(!f)throw new Error("WASM module not loaded");return f.expectedLength(t,[e])}function k(t,e,r){const a=[];for(let s=t;s<=e;s+=r)a.push(s);return a}function N(t,e){return e.map(a=>g(t,a)).map((a,s)=>({x:e[s],y:a}))}export{x as _,T as c,L as e,S as f,k as l,N as p};
