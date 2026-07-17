**Title:** Finding soft boulders with math

**Post:**

Hey /r/bouldering — I made a data project that tries to infer how hard boulders actually are from public ascent logs.

I trained a Bayesian model on roughly **1.5M ticks**, covering about **50k boulders** and **31k climbers**. It only sees patterns like who sent or flashed which problems, then infers things like climber ability, boulder difficulty, and boulder popularity.

The inferred difficulty matches community grades pretty well. The fun part is the residuals: the model flags possible sandbags and soft touches based on who actually sends them.

Writeup:

**[Inferring Boulder Grades](https://mmilanta.github.io/boulder-grades/)**

Searchable table:

**[Browse the predictions](https://mmilanta.github.io/vl-predictor/)**

Would love feedback, especially if you look up areas/problems you know and find places where it’s obviously right or hilariously wrong.
