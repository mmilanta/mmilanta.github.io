// main.js
import { computeGraphOrError } from './compute';
import { linspace, probability_parallel, fairness, expectedLength } from './loadAlgo';
import {basicSetup} from "codemirror"
import {EditorView} from "@codemirror/view"
import {python} from "@codemirror/lang-python"
import './styles.css';
import { Chart, registerables} from 'chart.js';


const start_code = `s0 = (0,0)
N = 7
def play_fn(state, next_point: bool):
    if next_point:
        state = (state[0] + 1, state[1])
    else:
        state = (state[0], state[1] + 1)
    if state[0] == N:
        return GameEnd.WIN
    if state[1] == N:
        return GameEnd.LOSE
    return state
`

const latex_str = `\\[
\\begin{align*}
  \\text{Fairness} \\triangleq \\frac{d}{dp} \\mathcal{P}(\\text{Match}; p) |_{p=0.5} &= FAIRNESS_VALUE \\\\
  \\text{Expected Length} \\triangleq \\mathbb{E}[\\text{Length} (\\text{Match}) | p=0.5] &= EXPECTED_LENGTH_VALUE \\\\
\\end{align*}
\\]
`;
const conjecture_latex_str = `
We believe that, for any balanced match, the following bound holds:
\\[
  \\text{Expected Length} \\geq \\text{Fairness}^{2}.
\\]
This means that there is a lower bound on the expected length of a match, given the fairness.
`;
const conjecture_latex_optimal = `In your match, the bound is tight. Making the match optimal according to the conjecture,
\\[
EXPECTED_LENGTH_VALUE = FAIRNESS_VALUE_SQUARED.
\\]`;
const conjecture_latex_not_optimal = `In your match, the bound is not tight. The match structurecan be improved,
\\[
EXPECTED_LENGTH_VALUE > FAIRNESS_VALUE_SQUARED.
\\]
`
const conjecture_latex_counterexample = `You bet the bound! This results invalidates the conjecture.
\\[
EXPECTED_LENGTH_VALUE < FAIRNESS_VALUE_SQUARED.
\\]`
Chart.register(...registerables);

async function typesetMath(...elements: Element[]) {
  const mj = window.MathJax;
  if (!mj) return;
  if (mj.startup?.promise) await mj.startup.promise;
  if (typeof mj.typesetPromise === 'function') {
    await mj.typesetPromise(elements);
  }
}


document.addEventListener("DOMContentLoaded", () => {
  const runButton = document.getElementById("run") as HTMLButtonElement;
  const error_p = document.getElementById("error_p") as HTMLParagraphElement;
  const error_div = document.getElementById("error_div") as HTMLDivElement;
  const result_div = document.getElementById("result_div") as HTMLDivElement;
  const output_div = document.getElementById("output_div") as HTMLDivElement;
  const balanced_p = document.getElementById("balanced_p") as HTMLParagraphElement;
  const conjecture_p = document.getElementById("conjecture_p") as HTMLParagraphElement;
  const result_p = document.getElementById("result_p") as HTMLParagraphElement;
  const codeArea = new EditorView({
    doc: start_code,
    parent: document.getElementById("code_area") as HTMLDivElement,
    extensions: [basicSetup, python()]
  });
  var trace1 = {
    x: [0, 0.1, 0.2, .3, .4, .5, .6, .7, .8, .9, 1],
    y: [0, 0.1, 0.2, .3, .4, .5, .6, .7, .8, .9, 1],
    mode: 'lines',
  };

  var trace2 = {
    x: [.4,.6],
    y: [0,1],
    type: 'line'
  };

  var data = [trace1, trace2];
  const ctx_output_plot = document.getElementById('output_plot') as HTMLCanvasElement;
  const ctx_optimality_plot = document.getElementById('optimality_plot') as HTMLCanvasElement;
  const outputPlot = new Chart(ctx_output_plot, {

    type: 'line',
    data: {
      datasets: [{
        label: 'data',
        data: [{
          x: 0,
          y: 0
        }, {
          x: 1,
          y: 1
        }],
        borderColor: 'rgb(75, 192, 192)',
      },
      {
        label: 'fairness line',
        data: [{x: 0.4, y: 0}, {x: 0.6, y: 1}],
        borderColor: 'rgb(255, 99, 132)',
      }],
    },
    options: {
        responsive: true,
        aspectRatio: 1,
        animation: false,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: 1,
            title: {
              display: true,
              text: 'p'
            }
          },
          y: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: 1,
            title: {
              display: true,
              text: 'P(Match, p)'
            }
          }
        },
        elements: {
          point: {
            radius: 0
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `P(Match, p)`,
            font: {
              size: 16
            },
            padding: {
              top: 10,
              bottom: 10
            }
          }
        }
      }
    }
  );
  const optimalityPlot = new Chart(ctx_optimality_plot, {
    data: {
      datasets: [{
        type: "scatter",
        label: 'data',
        data: [{
          x: 0,
          y: 0
        }],
      },{
        type: "line",
        label: 'threshold',
        data: [{
          x: 0,
          y: 0
        }],
        pointRadius: 0,
      }],
    },
    options: { 
        responsive: true,
        aspectRatio: 1,
        animation: false,
        scales: {
          x: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            title: {
              display: true,
              text: 'F(Match, 0.5)'
            }
          },
          y: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            title: {
              display: true,
              text: 'E(Match, 0.5)'
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `Optimality Curve`,
            font: {
              size: 16
            },
            padding: {
              top: 10,
              bottom: 10
            }
          }
        }
      }
    }
  );
  runButton.addEventListener("click", async () => {
    runButton.textContent = "Running...";
    output_div.classList.add("hidden");
    error_div.classList.add("hidden");
    const {result: result, error: errorMessage} = await computeGraphOrError(codeArea.state.doc.toString());
    runButton.textContent = "Run";
    if (errorMessage) {
      error_p.textContent = errorMessage;
      error_div.classList.remove("hidden");
      output_div.classList.add("hidden");
      return;
    }
    else {
      error_div.classList.add("hidden");
      output_div.classList.remove("hidden");
    }
    const fr = fairness(result);
    const el = expectedLength(result, 0.5);
    const ps = linspace(0, 1, 0.01);
    const data = probability_parallel(result, ps);
    outputPlot.data.datasets[0].data = data;
    outputPlot.data.datasets[1].data = [
      { x: 0.5 - (1 / (2 * fr)), y: 0 },
      { x: 0.5 + (1 / (2 * fr)), y: 1 }
    ];
    outputPlot.update();
    optimalityPlot.data.datasets[0].data = [{
      x: fr,
      y: el
    }];

    // python eqivalent: optimalityPlot.data.datasets[1].data = [{"x": x, "y": x ** 2} for x in range(0, fr * 1.1, 0.01)]
    optimalityPlot.data.datasets[1].data = linspace(0, 1.5 * fr, 0.01).map(p => ({ x: p, y: p * p }));
    optimalityPlot.options!.scales!.x!.max = 1.2 * fr;
    optimalityPlot.update();

    // copute correct game
    const half_point = Math.floor(ps.length / 2);
    let error = 0;
    for (let i = 0; i < half_point; i++) {
      const x = data[i + 1].y;
      const y = data[ps.length - 1 - i].y;
      error += (x + y - 1) ** 2;
    }
    const balanced = error < 1e-10;
    // update fairness and expected length
    
    if (balanced) {
      balanced_p.textContent = `The match is balanced`;
      result_div.classList.remove("hidden");
      result_p.innerHTML = latex_str.replace("FAIRNESS_VALUE", fr.toFixed(4)).replace("EXPECTED_LENGTH_VALUE", el.toFixed(4));
      let delta = el - (fr * fr);
      if (-0.0001 < delta && delta < 0.0001) {
        delta = 0;
      }
      let conjecture_latex_instance = (delta == 0) ? conjecture_latex_optimal : (( delta > 0 ) ? conjecture_latex_not_optimal : conjecture_latex_counterexample);


      conjecture_p.innerHTML = conjecture_latex_str + conjecture_latex_instance.replace("EXPECTED_LENGTH_VALUE", el.toFixed(4)).replace("FAIRNESS_VALUE_SQUARED", (fr * fr).toFixed(4));
      await typesetMath(result_p, conjecture_p);
    } else {
      balanced_p.textContent = `❌ The match is not balanced, the order of players matters`;
      result_div.classList.add("hidden");
      result_p.innerHTML = ``;
      conjecture_p.innerHTML = ``;
    }
  });
});