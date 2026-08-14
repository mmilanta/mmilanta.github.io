import { Chart, registerables } from 'chart.js';
import './styles.css';

Chart.register(...registerables);

type Model = { model_weights: number[][][] };
const size = 28;
const pixels = new Float64Array(size * size);
const cells: HTMLButtonElement[] = [];
let model: Model | null = null;
let drawing = false;
let lastPixel: [number, number] | null = null;

const grid = document.querySelector<HTMLDivElement>('#pixel-grid')!;
const label = document.querySelector<HTMLElement>('#prediction-label')!;
const clearButton = document.querySelector<HTMLButtonElement>('#clear-drawing')!;
const canvas = document.querySelector<HTMLCanvasElement>('#prediction-chart')!;
let largestProbabilityIndex: number | null = null;

for (let i = 0; i < pixels.length; i += 1) {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.tabIndex = -1;
  cell.setAttribute('aria-label', `Pixel ${i + 1}`);
  cell.className = 'pixel';
  grid.appendChild(cell);
  cells.push(cell);
}

const chart = new Chart(canvas, {
  type: 'bar',
  data: {
    labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
    datasets: [{
      label: 'Probability',
      data: Array(10).fill(0),
      backgroundColor: ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#5f7da8', '#c06c84', '#6d597a', '#4f8a8b', '#d08c60', '#8c9a64'],
      borderRadius: 2,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 1.5,
    animation: false,
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#3d405b',
          font: (context) => ({ family: 'Georgia', weight: context.index === largestProbabilityIndex ? 'bold' : 'normal' }),
        },
      },
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          color: '#6c757d',
          callback: (value) => `${Math.round(Number(value) * 100)}%`,
          font: { family: 'Georgia' },
        },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (item) => ` ${Number(item.raw).toLocaleString(undefined, { style: 'percent', maximumFractionDigits: 1 })}` } },
    },
  },
});

// Normalize the network's output scores into categorical probabilities.
function categoricalProbabilities(logits: number[]): number[] {
  const odds = logits.map((logit) => Math.exp(Math.max(-50, Math.min(50, logit))));
  const total = odds.reduce((sum, value) => sum + value, 0);
  return odds.map((value) => value / total);
}

function predict() {
  if (!model) return;
  const [w0, w1] = model.model_weights;
  // Derive the layer sizes from the checkpoint. This model has 256 hidden
  // units; hard-coding 128 would silently discard half of the network.
  const inputSize = w0.length;
  const hiddenSize = w0[0].length;
  const outputSize = w1[0].length;
  const hidden = new Float64Array(hiddenSize);
  for (let j = 0; j < hiddenSize; j += 1) {
    let sum = 0;
    for (let i = 0; i < inputSize; i += 1) sum += w0[i][j] * pixels[i];
    hidden[j] = Math.max(0, sum);
  }
  const logits = Array.from({ length: outputSize }, (_, j) => {
    let sum = 0;
    for (let i = 0; i < hiddenSize; i += 1) sum += w1[i][j] * hidden[i];
    return sum;
  });
  const probabilities = categoricalProbabilities(logits);
  largestProbabilityIndex = probabilities.indexOf(Math.max(...probabilities));
  chart.data.datasets[0].data = probabilities;
  chart.update();
  const winner = probabilities.slice(0, outputSize).indexOf(Math.max(...probabilities.slice(0, outputSize)));
  label.textContent = String(winner);
}

// A soft, three-pixel brush: the centre is solid and the surrounding
// pixels fade out, much like the anti-aliased strokes in MNIST samples.
function paintBrush(row: number, column: number) {
  const softness = [
    [0.15, 0.45, 0.15],
    [0.45, 1.00, 0.45],
    [0.15, 0.45, 0.15],
  ];
  for (let brushRow = -1; brushRow <= 1; brushRow += 1) {
    for (let brushColumn = -1; brushColumn <= 1; brushColumn += 1) {
      const targetRow = row + brushRow;
      const targetColumn = column + brushColumn;
      if (targetRow < 0 || targetRow >= size || targetColumn < 0 || targetColumn >= size) continue;
      const index = targetRow * size + targetColumn;
      pixels[index] = Math.min(1, pixels[index] + 0.72 * softness[brushRow + 1][brushColumn + 1]);
      cells[index].style.setProperty('--ink', String(pixels[index]));
    }
  }
}

function paintLine(from: [number, number] | null, to: [number, number]) {
  if (!from) { paintBrush(to[0], to[1]); return; }
  const distance = Math.max(Math.abs(to[0] - from[0]), Math.abs(to[1] - from[1]));
  for (let step = 0; step <= distance; step += 1) {
    const amount = distance === 0 ? 0 : step / distance;
    paintBrush(Math.round(from[0] + (to[0] - from[0]) * amount), Math.round(from[1] + (to[1] - from[1]) * amount));
  }
}

function pointerPixel(event: PointerEvent): [number, number] {
  const rect = grid.getBoundingClientRect();
  return [Math.floor((event.clientY - rect.top) / (rect.height / size)), Math.floor((event.clientX - rect.left) / (rect.width / size))];
}

grid.addEventListener('pointerdown', (event) => { drawing = true; grid.setPointerCapture(event.pointerId); lastPixel = pointerPixel(event); paintLine(null, lastPixel); predict(); });
grid.addEventListener('pointermove', (event) => { if (!drawing) return; const next = pointerPixel(event); paintLine(lastPixel, next); lastPixel = next; predict(); });
grid.addEventListener('pointerup', () => { drawing = false; lastPixel = null; });
grid.addEventListener('pointercancel', () => { drawing = false; lastPixel = null; });
clearButton.addEventListener('click', () => { pixels.fill(0); cells.forEach((cell) => cell.style.setProperty('--ink', '0')); label.textContent = '—'; largestProbabilityIndex = null; chart.data.datasets[0].data = Array(10).fill(0); chart.update(); });

fetch('/mnist/model.json').then((response) => response.json()).then((loaded: Model) => { model = loaded; predict(); }).catch(() => { label.textContent = 'Model unavailable'; });
