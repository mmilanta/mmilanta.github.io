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
const score = document.querySelector<HTMLElement>('#prediction-score')!;
const clearButton = document.querySelector<HTMLButtonElement>('#clear-drawing')!;
const canvas = document.querySelector<HTMLCanvasElement>('#prediction-chart')!;

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
  type: 'doughnut',
  data: {
    labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Does not know'],
    datasets: [{
      data: Array(11).fill(1),
      backgroundColor: ['#e07a5f', '#3d405b', '#81b29a', '#f2cc8f', '#5f7da8', '#c06c84', '#6d597a', '#4f8a8b', '#d08c60', '#8c9a64', '#adb5bd'],
      borderColor: '#fffdf8',
      borderWidth: 3,
      hoverOffset: 4,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    animation: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, color: '#3d405b', font: { family: 'Georgia' } } },
      tooltip: { callbacks: { label: (item) => ` ${item.label}: ${Number(item.raw).toFixed(3)}` } },
    },
  },
});

// The network has independent sigmoid outputs, rather than a softmax output.
// Treat each output as evidence (odds) for a digit and keep one extra unit of
// evidence for "does not know". This gives the pie genuinely categorical,
// normalized values without making the digit probabilities look more certain
// just because the other outputs happened to be large.
function categoricalProbabilities(logits: number[]): number[] {
  const odds = logits.map((logit) => Math.exp(Math.max(-50, Math.min(50, logit))));
  const total = odds.reduce((sum, value) => sum + value, 1); // 1 = unknown
  return [...odds.map((value) => value / total), 1 / total];
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
  chart.data.datasets[0].data = probabilities;
  chart.update();
  const winner = probabilities.slice(0, outputSize).indexOf(Math.max(...probabilities.slice(0, outputSize)));
  label.textContent = String(winner);
  score.textContent = `${(probabilities[winner] * 100).toFixed(1)}% confidence`;
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
clearButton.addEventListener('click', () => { pixels.fill(0); cells.forEach((cell) => cell.style.setProperty('--ink', '0')); label.textContent = '—'; score.textContent = 'Draw a digit'; chart.data.datasets[0].data = Array(11).fill(1); chart.update(); });

fetch('/mnist/model.json').then((response) => response.json()).then((loaded: Model) => { model = loaded; predict(); }).catch(() => { score.textContent = 'Model unavailable'; });
