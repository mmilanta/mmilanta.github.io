commands
$$
\newcommand{\pr}{\mathbb{P}}
\newcommand{\var}{\mathbb{V}}
\newcommand{\imp}{\mathbb{I}}
\newcommand{\ex}{\mathbb{E}}
\newcommand{\G}{\mathbf{G}}
\newcommand{\win}{W}
\newcommand{\lose}{L}
\newcommand{\traj}{\mathbf{T}}
\newcommand{\x}{X}
\newcommand{\value}{h}
\newcommand{\fair}{\mathcal{F}}
\newcommand{\el}{\mathcal{E}}
\newcommand{\b}{B}
$$
**Definition 1 [Game Graph]** We define a game graph $\G$ to be a direted graph with:

* two special nodes $\win$ and $\lose$ which have no outward edges
* at least one (but potentially many) normal nodes, each of those nodes has always two outward named edges, a $+$ and a "-" edges. We will refer to $v_+$ and $v_-$ to be the nodes reached repsectivly from the $+$ and $-$ edge starting from $v$.
* Exactly one of the "normal" nodes is the start node.

Hopefully it is clear how this graph represent a match structure. You can think of the node as a scoring. From each scoring, if player 1 wins we navigate to the node connected with the $+$ edge, otherwise to the one connected with the $-$ edge. Finally if we reach $\win$ player 1 won the game, and if we reach $\lose$ player 1 lost the game.

// add an image of graph for a simple 3 points tiebreaker

**Definition 2 [Game Trajectory]** Given $p \in [0,1]$, we define the random process
$$
\b_0, \b_1, \dots \text{ to follow } \overset{\text{i.i.d.}}{\sim} \text{Bernoulli}(p).
$$
We refer to \pr

we call game trajectory the random process that leads from $s$ to either $\win$ or $\lose$. 
$$
\traj := (\x_0,\x_1, \dots,  \x_\tau) \text{ where }\x_0 = s\text{ and } \x_\tau \in \{\lose, \win\},
$$
Where $X_i = \left(X_{i-1}\right)_+$ with probability $p$ and $X_i = \left(X_{i-1}\right)_-$ with probability $1-p$. Notice that here $\tau \in \mathbb N \cup \{\infty\}$ is the length of the match (number of points won), and it itslef a random variable.

**Definition 3 [value function]** Given a graph $\G$ we define, for each node $v \in \G$,
$$
\value(v) := \pr_{1/2}(\x_\tau=\win).
$$
Furthermore we say that a game graph $\G$ is balanced if $\value_{\frac12}(s) = \frac12$.

**Definition 3 [Fairness]** In this framework, 
$$
\fair(\G) := \partial_p\value_p(s)\vert_{p=\frac12},
$$
and the expected length is just:
$$
\el(\G) := \ex_\frac12[\tau].
$$

# Th statement
For any balanced graph $\G$, we have that
$$
\fair(\G) ^ 2 \leq \el(\G).
$$
### proof
The proof starts by analyzing $\value_{\frac12}(v)$. We notice that
$$
\value_{\frac12}(v) = \pr_{\frac12}(\text{end up in } \win \text{ starting from } v) = \frac12\left(\value_\frac12(v_+) + \value_\frac12(v_-)\right).
$$

$$
\begin{align}
h(v) &:= \pr_{1/2}(\text{Winning from }v)\\
T &:= (X_0, \dots, X_{\tau})\\
M &:= (h(X_0), \dots, h(X_{\tau})) \\
\imp(v) &:= h(v_+) - h(v_-)
\end{align}
$$

## bound derivative

$$
\begin{align}
\pr_{\frac{1}{2} + \epsilon}(\text{Winning}) &= \ex[value(X_\tau)]\\
\var(M_1) &= \ex[(M_1 - \ex[M_1])^2]\\
\var(M_1) &= \ex[(M_1 - M_0)^2]\\
\var(M_1) &= \ex[(\imp(M_0)/2)^2]\\
\var(M_1) &= \imp(M_0)^2/4\\
\end{align}
$$

So, we always have that $M$ is a martingale.

$$
\begin{align}
\var(M_0) &= 0\\
\var(M_1) &= \ex[(M_1 - \ex[M_1])^2]\\
\var(M_1) &= \ex[(M_1 - M_0)^2]\\
\var(M_1) &= \ex[(\imp(M_0)/2)^2]\\
\var(M_1) &= \imp(M_0)^2/4\\
\end{align}
$$

done. now we generalize to $M_k$.
$$
\begin{align}
\var(M_k) &= \ex[(M_k - \ex[M_{k}])^2] \\
&= \ex[\ex[(M_k - \ex[M_{k}])^2 | M_{k-1}]] \\
&= \ex[\ex[(M_k - M_{k-1})^2 | M_{k-1}]] \\
&= \ex[\ex[(\imp(M_{k-1})/2)^2 | M_{k-1}]] \\
&= \ex[\ex[(\imp(M_{k-1})/2)^2 | M_{k-1}]] \\
\end{align}
$$