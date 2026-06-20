# ProofBounty

AI-reviewed GitHub bounty payouts on GenLayer.

One-line pitch: ProofBounty dies without GenLayer because its core product is an on-chain judgment about whether GitHub work actually satisfies a bounty before funds are released.

## Why GenLayer

Open-source bounties and hackathon rewards often depend on subjective review: did the PR actually solve the issue, are tests included, is the work spam, and should the contributor receive full, partial, or no payout? A normal smart contract cannot read GitHub pages or evaluate code quality.

ProofBounty puts that adjudication into a GenLayer Intelligent Contract:

- A project owner creates a bounty with a reward pool and acceptance criteria.
- A contributor submits a GitHub PR, issue, or commit URL.
- The contract reads the issue and submission through `gl.nondet.web.get`.
- An LLM prompt scores requirement match, code quality, tests, completeness, and spam risk.
- `gl.eq_principle.strict_eq` wraps the nondeterministic review.
- The contract stores a deterministic verdict and releases full or partial payout only after approval.
- Rejected or escalated work can go through a challenge path.

## Project Structure

```text
ProofBounty/
  contracts/ProofBounty.py
  frontend/
  tests/test_contract_static.py
  scripts/deploy/deploy.ps1
  docs/design-guidelines/mediacore-extracted-design.md
```

## Builder Program Score Path

| Axis | Target | Evidence |
|---|---:|---|
| GenLayer fit | 5 | Core payout decision depends on reading GitHub evidence and subjective AI review. |
| Contract quality | 4-5 | Guarded bounty lifecycle, partial payout logic, challenge path, deterministic JSON, and explicit errors. |
| Engineering | 4 | Separate contract, frontend, tests, deploy script, and design documentation. |
| Frontend / UX | 4 | Full flow for bounty creation, GitHub submission, AI review, and payout release. |

## Pre-Deploy Verification

```powershell
python -m unittest discover -s tests
python -c "import ast; ast.parse(open('contracts/ProofBounty.py', encoding='utf-8').read())"
genlayer lint contracts/ProofBounty.py
```

## Deploy Contract

```powershell
genlayer deploy contracts/ProofBounty.py --name ProofBounty
```

After deploy, set:

```text
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed address>
NEXT_PUBLIC_NETWORK=testnetAsimov
NEXT_PUBLIC_GENLAYER_RPC=
```

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend is in English and follows a MediaCore-inspired bright editorial SaaS style: centered hero, script accent typography, neon lime CTA, rounded visual panels, and a simple process timeline.
