import { Chart } from 'chart.js';

Chart.defaults.font.family = '"Libre Baskerville", Georgia, serif';

// Canvas text must be redrawn once the web fonts have loaded.
void Promise.all([
  document.fonts.load('400 12px "Libre Baskerville"'),
  document.fonts.load('700 12px "Libre Baskerville"'),
]).then(() => {
  Object.values(Chart.instances).forEach((chart) => chart.update('none'));
});
