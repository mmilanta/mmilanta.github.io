import { Chart, registerables, type ScatterDataPoint } from 'chart.js';
import { computeGraphOrError } from './compute';
import { linspace, probability_parallel, fairness, expectedLength as expectedLengthGraph } from './loadAlgo';
import precomputedPoints from './precomputed-points.json';

Chart.register(...registerables);

async function typesetMath(...elements: Element[]) {
  const mj = window.MathJax;
  if (!mj) return;
  if (mj.startup?.promise) await mj.startup.promise;
  if (typeof mj.typesetPromise === 'function') {
    await mj.typesetPromise(elements);
  }
}

const tie_breaker = `s0 = (0,0)
N = [[N_VALUE]]
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

document.addEventListener('DOMContentLoaded', () => {
  const canvasLeft = document.getElementById('tiebreaker_plot') as HTMLCanvasElement | null;
  const canvasRight = document.getElementById('tiebreaker_plot_right') as HTMLCanvasElement | null;
  const canvasTradeoff = document.getElementById('tradeoff_plot') as HTMLCanvasElement | null;
  if (!canvasLeft || !canvasRight || !canvasTradeoff) return;

  const slider = document.getElementById('tiebreaker_n') as HTMLInputElement | null;
  const sliderValue = document.getElementById('tiebreaker_n_value') as HTMLElement | null;
  const xLabelLeft = document.getElementById('tiebreaker_x_label') as HTMLDivElement | null;
  const yLabelLeft = document.getElementById('tiebreaker_y_label') as HTMLDivElement | null;
  const xLabelRight = document.getElementById('tiebreaker_x_label_right') as HTMLDivElement | null;
  const yLabelRight = document.getElementById('tiebreaker_y_label_right') as HTMLDivElement | null;
  const xLabelTradeoff = document.getElementById('tradeoff_x_label') as HTMLDivElement | null;
  const yLabelTradeoff = document.getElementById('tradeoff_y_label') as HTMLDivElement | null;
  const unreachableLabel = document.getElementById('tradeoff_unreachable_label') as HTMLDivElement | null;

  const ps = linspace(0, 1, 0.01);

  function tickLabel(value: unknown) {
    const v = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
    const r = Math.round(v * 100) / 100;
    if (Math.abs(r - 0) < 1e-9) return '0';
    if (Math.abs(r - 1) < 1e-9) return '1';
    return r.toString();
  }

  function makeProbabilityChart(canvas: HTMLCanvasElement) {
    return new Chart(canvas, {
      type: 'line',
      data: {
        datasets: [
          {
            label: 'data',
            data: [] as ScatterDataPoint[],
            borderColor: 'black',
            borderWidth: 2,
          },
          {
            label: 'fairness line',
            data: [] as ScatterDataPoint[],
            borderColor: 'black',
            borderDash: [6, 6],
            borderWidth: 2,
          },
        ],
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
            ticks: {
              stepSize: 0.25,
              autoSkip: false,
              callback: tickLabel,
            },
            title: {
              display: false,
              text: '',
            },
          },
          y: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: 1,
            ticks: {
              stepSize: 0.25,
              autoSkip: false,
              callback: tickLabel,
            },
            title: {
              display: false,
              text: '',
            },
          },
        },
        elements: {
          point: {
            radius: 0,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });
  }
  function makeExpectedLengthChart(canvas: HTMLCanvasElement) {
    return new Chart(canvas, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'data',
              data: [] as ScatterDataPoint[],
              borderColor: 'black',
              borderWidth: 2,
            },
          ],
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
              ticks: {
                stepSize: 0.25,
                autoSkip: false,
                callback: tickLabel,
              },
              title: {
                display: false,
                text: '',
              },
            },
            y: {
              type: 'linear',
              position: 'bottom',
              min: 0,
              max: 19,
              ticks: {
                stepSize: 1,
                autoSkip: false,
                callback: tickLabel,
              },
              title: {
                display: false,
                text: '',
              },
            },
          },
          elements: {
            point: {
              radius: 0,
            },
          },
          plugins: {
            legend: {
              display: false,
            },
          },
        },
      });
  }
  function makeTradeoffChart(canvas: HTMLCanvasElement) {
    const xMax = 12;
    const yMax = 250;
    const yTickStepSize = 50;
    const xMaxForCurve = Math.min(xMax, Math.sqrt(yMax)); // so y=x^2 stays within the visible y-range
    const curve = linspace(0, xMaxForCurve, 0.1).map((x) => ({ x, y: x * x }));
    return new Chart(canvas, {
        type: 'scatter',
        data: {
          datasets: [
            {
              type: 'line',
              label: 'Optimality Bound',
              data: curve as ScatterDataPoint[],
              borderColor: 'rgba(0,0,0,0.45)',
              backgroundColor: 'rgba(0,0,0,0.12)',
              borderWidth: 2,
              pointRadius: 0,
              tension: 0,
              fill: 'origin',
            },
            {
              label: 'Tiebreakers',
              data: [] as ScatterDataPoint[],
              borderColor: 'black',
              backgroundColor: 'black',
              pointRadius: 1,
            },
            {
              label: 'Optimal Matches',
              data: [] as ScatterDataPoint[],
              borderColor: 'black',
              backgroundColor: 'black',
              pointRadius: 3,
              pointStyle: 'rectRot',
            },
            {
              label: 'Official Match',
              data: [] as ScatterDataPoint[],
              borderColor: 'black',
              backgroundColor: 'black',
              pointRadius: 5,
              pointStyle: 'star',
            },
          ],
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
              max: xMax,
              ticks: {
                stepSize: 5,
                autoSkip: false,
                callback: tickLabel,
              },
              title: {
                display: false,
                text: '',
              },
            },
            y: {
              type: 'linear',
              position: 'bottom',
              min: 0,
              max: yMax,
              ticks: {
                stepSize: yTickStepSize,
                autoSkip: false,
                callback: tickLabel,
              },
              title: {
                display: false,
                text: '',
              },
            },
          },
          plugins: {
            legend: { display: false },
          },
        },
      });
  }
  const chartLeft = makeProbabilityChart(canvasLeft);
  const chartRight = makeExpectedLengthChart(canvasRight);
  const tradeoffChart = makeTradeoffChart(canvasTradeoff);

  const graphByN = new Map<number, number[]>();

  function render(n: number) {
    const graph = graphByN.get(n);
    if (!graph) return;

    const probData = probability_parallel(graph, ps) as ScatterDataPoint[];
    const fr = fairness(graph);
    const fairnessLine: ScatterDataPoint[] = [
      { x: 0.5 - 1 / (2 * fr), y: 0 },
      { x: 0.5 + 1 / (2 * fr), y: 1 },
    ];
    const expectedLengthData: ScatterDataPoint[] = ps.map((p) => ({
      x: p,
      y: expectedLengthGraph(graph, p),
    }));
    chartLeft.data.datasets[0].data = probData;
    chartLeft.data.datasets[1].data = fairnessLine;
    chartLeft.update();

    chartRight.data.datasets[0].data = expectedLengthData;
    chartRight.update();

    if (xLabelLeft) xLabelLeft.innerHTML = '\\(p\\)';
    if (yLabelLeft) yLabelLeft.innerHTML = `\\(\\mathbf{P}(p, T_{${n}})\\)`;
    if (xLabelRight) xLabelRight.innerHTML = '\\(p\\)';
    if (yLabelRight) yLabelRight.innerHTML = `\\(\\mathbf{E}(p, T_{${n}})\\)`;
    const labels = [xLabelLeft, yLabelLeft, xLabelRight, yLabelRight].filter(Boolean) as Element[];
    if (labels.length) void typesetMath(...labels);
  }

  function readN() {
    const nRaw = slider?.value ?? '2';
    const n = Math.max(2, Math.min(11, Number.parseInt(nRaw, 10) || 2));
    if (sliderValue) sliderValue.textContent = String(n);
    render(n);
  }

  if (slider) {
    slider.addEventListener('input', readN);
  }

  async function precomputeAll() {
    if (slider) slider.disabled = true;
    for (let n = 2; n <= 11; n++) {
      const code = tie_breaker.replace('[[N_VALUE]]', String(n));
      const { result, error } = await computeGraphOrError(code);
      if (error || !result) {
        console.error(`Failed to compute graph for T_${n}:`, error);
        continue;
      }
      console.log(`Precomputed T_${n}`);
      graphByN.set(n, result as number[]);
    }
    if (slider) slider.disabled = false;

    if (tradeoffChart) {
      // Use precomputed points instead of computing them
      // Filter out the last two points which are real match data
      const points: ScatterDataPoint[] = precomputedPoints.slice(0, -2);
      const realMatches: ScatterDataPoint[] = [
        { x: 10.7343, y: 164.5844 },
      ];
      const optimal_points: ScatterDataPoint[] = [];
      for (let t = 1; t < 16; t++) {
        optimal_points.push({ x: t, y: t * t });
      }
      tradeoffChart.data.datasets[1].data = points;
      tradeoffChart.data.datasets[2].data = optimal_points;
      tradeoffChart.data.datasets[3].data = realMatches;
      tradeoffChart.update();
    }

    if (xLabelTradeoff) xLabelTradeoff.innerHTML = '\\(\\mathbf{F}(T)\\)';
    if (yLabelTradeoff) yLabelTradeoff.innerHTML = '\\(\\mathbf{E}(0.5, T)\\)';
    if (unreachableLabel) unreachableLabel.innerHTML = '\\(\\text{Unreachable Zone}\\)';
    const labels = [xLabelTradeoff, yLabelTradeoff, unreachableLabel].filter(Boolean) as Element[];
    if (labels.length) void typesetMath(...labels);
  }

  void precomputeAll().then(() => readN());
});

