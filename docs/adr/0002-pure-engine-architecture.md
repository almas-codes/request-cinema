# ADR 0002: Pure Engine Architecture and Deterministic Timeline

## Status
Accepted

## Context
Animating distributed traces requires accurate scrubbing forward and backward, variable playback speeds (0.25x to 8x), and cross-platform reproducibility (running identically in Node server tests and browser clients).

## Decision
`packages/cinema-engine` is strictly isolated as a pure mathematical core:
- Zero DOM, zero network, zero React.
- Time is injected exclusively via a `Clock` interface.
- Randomness is derived solely from a seeded pseudo-random number generator (`SeededRng`).
- The timeline function $\text{timeline}(\text{trace}, \text{layout}, t) \to \text{SceneState}$ is completely deterministic and idempotent.

## Consequences
- Guaranteed zero flaky tests.
- Reversible time scrubbing with frame-level reproducibility.
- Zero bundle pollution from browser or node globals.
