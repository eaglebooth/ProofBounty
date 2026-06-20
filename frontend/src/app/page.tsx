"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  ChevronRight,
  ClipboardCheck,
  Code2,
  GitPullRequestArrow,
  Loader2,
  Scale,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { connectWallet, readContract, writeContract } from "@/lib/genlayer";

type LogEntry = {
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad";
};

type SubmissionView = {
  bountyId: string;
  submissionId: string;
  status: string;
  score: string;
  payout: string;
  reason: string;
};

const statusClass: Record<string, string> = {
  DRAFT: "bg-white text-[var(--soft-ink)]",
  PENDING: "bg-[#eef5ff] text-[#2b68c8]",
  APPROVED_FULL: "bg-[var(--lime-soft)] text-[#1d7a00]",
  APPROVED_PARTIAL: "bg-[#fff4db] text-[#9a6500]",
  REJECTED: "bg-[#fff0ec] text-[#bd3b16]",
  ESCALATED: "bg-[#f3efff] text-[#6743bf]",
  PAID: "bg-[var(--lime)] text-black",
};

export default function Home() {
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
  const networkName = process.env.NEXT_PUBLIC_NETWORK || "testnetAsimov";
  const contractConfigured = Boolean(contractAddress);
  const [wallet, setWallet] = useState("");
  const [busy, setBusy] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      label: "Ready",
      value: contractConfigured
        ? `Connected to ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)} on ${networkName}.`
        : "Demo mode active. Add NEXT_PUBLIC_CONTRACT_ADDRESS after Studio deploy.",
      tone: contractConfigured ? "ok" : "warn",
    },
  ]);
  const [submission, setSubmission] = useState<SubmissionView>({
    bountyId: "-",
    submissionId: "-",
    status: "DRAFT",
    score: "0",
    payout: "0",
    reason: "Create a bounty, submit a GitHub URL, then let the Intelligent Contract review it.",
  });

  const [bountyForm, setBountyForm] = useState({
    creator: "OpenInfra DAO",
    title: "Fix flaky checkout webhook retry logic",
    requirements:
      "Resolve the retry race condition, add regression tests, keep the public API unchanged, and document the behavior.",
    issueUrl: "https://github.com/example/protocol/issues/128",
    reward: "1200",
    minScore: "82",
  });

  const [workForm, setWorkForm] = useState({
    contributor: "dev-alex",
    githubUrl: "https://github.com/example/protocol/pull/184",
    notes:
      "PR includes retry deduplication, two regression tests, and a short migration note in the README.",
  });

  function pushLog(entry: LogEntry) {
    setLogs((current) => [entry, ...current].slice(0, 4));
  }

  async function handleWallet() {
    setBusy("wallet");
    const result = await connectWallet();
    if (result.success && typeof result.data === "string") {
      setWallet(result.data);
      pushLog({ label: "Wallet", value: result.data, tone: "ok" });
    } else {
      pushLog({ label: "Wallet", value: result.error || "No wallet provider found", tone: "warn" });
    }
    setBusy("");
  }

  async function createBounty() {
    setBusy("bounty");
    if (!contractConfigured) {
      setSubmission((current) => ({
        ...current,
        bountyId: "0",
        status: current.status === "DRAFT" ? "PENDING" : current.status,
        reason: "Bounty #0 is open in demo mode with a 1,200 token pool.",
      }));
      pushLog({ label: "Bounty", value: "Created bounty #0 with 1,200 reward pool", tone: "ok" });
      setBusy("");
      return;
    }

    const result = await writeContract("create_bounty", [
      bountyForm.creator,
      bountyForm.title,
      bountyForm.requirements,
      bountyForm.issueUrl,
      Number(bountyForm.reward || "0"),
      Number(bountyForm.minScore || "0"),
    ]);
    pushLog({
      label: "create_bounty",
      value: result.success ? `Finalized ${String(result.data ?? result.hash)}` : result.error || "Failed",
      tone: result.success ? "ok" : "bad",
    });
    if (result.success) {
      const bountyId = typeof result.data === "number" || typeof result.data === "string" ? String(result.data) : "0";
      setSubmission((current) => ({
        ...current,
        bountyId,
        status: current.status === "DRAFT" ? "PENDING" : current.status,
        reason: `Bounty #${bountyId} was created on the configured GenLayer contract.`,
      }));
    }
    setBusy("");
  }

  async function submitWork() {
    setBusy("submit");
    if (!contractConfigured) {
      setSubmission({
        bountyId: "0",
        submissionId: "0",
        status: "PENDING",
        score: "0",
        payout: "0",
        reason: "GitHub PR URL submitted. ProofBounty is ready to read and score the work.",
      });
      pushLog({ label: "Submission", value: "Submitted PR #184 for bounty #0", tone: "ok" });
      setBusy("");
      return;
    }

    const result = await writeContract("submit_work", [
      Number(submission.bountyId === "-" ? "0" : submission.bountyId),
      workForm.contributor,
      workForm.githubUrl,
      workForm.notes,
    ]);
    pushLog({
      label: "submit_work",
      value: result.success ? `Finalized ${String(result.data ?? result.hash)}` : result.error || "Failed",
      tone: result.success ? "ok" : "bad",
    });
    if (result.success) {
      const submissionId =
        typeof result.data === "number" || typeof result.data === "string" ? String(result.data) : "0";
      setSubmission((current) => ({
        ...current,
        submissionId,
        status: "PENDING",
        score: "0",
        payout: "0",
        reason: `Submission #${submissionId} was sent to the configured GenLayer contract.`,
      }));
    }
    setBusy("");
  }

  async function evaluateSubmission() {
    setBusy("evaluate");
    if (!contractConfigured) {
      await new Promise((resolve) => setTimeout(resolve, 650));
      setSubmission({
        bountyId: "0",
        submissionId: "0",
        status: "APPROVED_FULL",
        score: "91",
        payout: "100",
        reason:
          "The PR matches the issue requirements, includes regression tests, and keeps the public API stable.",
      });
      pushLog({ label: "AI review", value: "PAY_FULL. Score 91, payout 100%.", tone: "ok" });
      setBusy("");
      return;
    }

    const id = Number(submission.submissionId === "-" ? "0" : submission.submissionId);
    const result = await writeContract("evaluate_submission", [id]);
    pushLog({
      label: "evaluate_submission",
      value: result.success ? `AI verdict ${String(result.data ?? result.hash)}` : result.error || "Failed",
      tone: result.success ? "ok" : "bad",
    });
    if (result.success) {
      const read = await readContract("get_submission", [id]);
      if (read.success && typeof read.data === "string") {
        const parsed = JSON.parse(read.data);
        setSubmission({
          bountyId: String(parsed.bounty_id || "0"),
          submissionId: String(parsed.submission_id || "0"),
          status: String(parsed.status || "PENDING"),
          score: String(parsed.score || "0"),
          payout: String(parsed.payout_percentage || "0"),
          reason: String(parsed.reason || ""),
        });
      }
    }
    setBusy("");
  }

  async function releaseReward() {
    setBusy("release");
    if (!contractConfigured) {
      setSubmission((current) => ({
        ...current,
        status: current.status === "APPROVED_FULL" || current.status === "APPROVED_PARTIAL" ? "PAID" : current.status,
        reason:
          current.status === "APPROVED_FULL" || current.status === "APPROVED_PARTIAL"
            ? "Reward ledger records a 1,200 token payout to dev-alex."
            : "Submission must be approved before payout.",
      }));
      pushLog({
        label: "Reward",
        value:
          submission.status === "APPROVED_FULL" || submission.status === "APPROVED_PARTIAL"
            ? "Released reward in demo ledger"
            : "Blocked until approval",
        tone: submission.status === "APPROVED_FULL" || submission.status === "APPROVED_PARTIAL" ? "ok" : "warn",
      });
      setBusy("");
      return;
    }

    const result = await writeContract("release_reward", [
      Number(submission.submissionId === "-" ? "0" : submission.submissionId),
    ]);
    pushLog({
      label: "release_reward",
      value: result.success ? `Reward finalized ${String(result.data ?? result.hash)}` : result.error || "Failed",
      tone: result.success ? "ok" : "bad",
    });
    setBusy("");
  }

  async function runDemo() {
    const consoleSection = document.getElementById("bounty");
    if (consoleSection) {
      const top = consoleSection.getBoundingClientRect().top + window.scrollY - 18;
      window.history.replaceState(null, "", "#bounty");
      window.scrollTo({ top, behavior: "smooth" });
    }

    if (contractConfigured) {
      pushLog({ label: "Demo", value: "Running the real contract flow with the current form values.", tone: "ok" });
      await createBounty();
      await submitWork();
      await evaluateSubmission();
      return;
    }

    setBusy("demo");
    setBountyForm({
      creator: "OpenInfra DAO",
      title: "Fix flaky checkout webhook retry logic",
      requirements:
        "Resolve the retry race condition, add regression tests, keep the public API unchanged, and document the behavior.",
      issueUrl: "https://github.com/example/protocol/issues/128",
      reward: "1200",
      minScore: "82",
    });
    setWorkForm({
      contributor: "dev-alex",
      githubUrl: "https://github.com/example/protocol/pull/184",
      notes:
        "PR includes retry deduplication, two regression tests, and a short migration note in the README.",
    });

    pushLog({ label: "Demo", value: "Loaded a sample GitHub bounty and contribution.", tone: "ok" });
    await new Promise((resolve) => setTimeout(resolve, 450));
    setSubmission({
      bountyId: "0",
      submissionId: "-",
      status: "PENDING",
      score: "0",
      payout: "0",
      reason: "Bounty #0 is open in demo mode with a 1,200 token reward pool.",
    });
    pushLog({ label: "Bounty", value: "Created bounty #0 with 1,200 reward pool.", tone: "ok" });

    await new Promise((resolve) => setTimeout(resolve, 550));
    setSubmission({
      bountyId: "0",
      submissionId: "0",
      status: "PENDING",
      score: "0",
      payout: "0",
      reason: "GitHub PR URL submitted. ProofBounty is ready to read and score the work.",
    });
    pushLog({ label: "Submission", value: "Submitted PR #184 for bounty #0.", tone: "ok" });

    await new Promise((resolve) => setTimeout(resolve, 700));
    setSubmission({
      bountyId: "0",
      submissionId: "0",
      status: "APPROVED_FULL",
      score: "91",
      payout: "100",
      reason:
        "The PR matches the issue requirements, includes regression tests, and keeps the public API stable.",
    });
    pushLog({ label: "AI review", value: "PAY_FULL. Score 91, payout 100%.", tone: "ok" });
    setBusy("");
  }

  return (
    <main>
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-[10px] bg-black text-white">
            <Code2 size={18} />
          </div>
          <div>
            <div className="text-xl font-semibold tracking-tight">ProofBounty</div>
            <div className="text-xs text-[var(--muted)]">
              {contractConfigured ? `${networkName} · ${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}` : "GitHub bounty adjudication"}
            </div>
          </div>
        </div>
        <nav className="hidden items-center gap-10 text-sm font-medium md:flex">
          <a href="#bounty">Bounties</a>
          <a href="#review">AI Review</a>
          <a href="#workflow">Workflow</a>
        </nav>
        <button
          onClick={handleWallet}
          className="lime-button flex h-11 items-center gap-2 rounded-[11px] px-5 text-sm font-medium"
        >
          {busy === "wallet" ? <Loader2 className="animate-spin" size={16} /> : <Wallet size={16} />}
          {wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : "Connect"}
          <ChevronRight size={16} />
        </button>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-14 pt-20 text-center">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-5 py-2 text-sm text-[var(--soft-ink)] shadow-sm">
            Trusted by open-source teams
            <span className="text-[var(--orange)]">★★★★★</span>
          </div>
          <h1 className="mx-auto mt-7 max-w-5xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] md:text-7xl">
            Pay GitHub work <span className="script text-[1.08em]">Faster</span>
            <br />
            When Proof Lives On-chain
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[var(--soft-ink)]">
            ProofBounty reads GitHub issues, pull requests, commits, tests, and review notes inside a GenLayer
            Intelligent Contract before releasing contributor rewards.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={runDemo} disabled={Boolean(busy)} className="lime-button flex h-12 items-center gap-2 rounded-[11px] px-6 font-medium disabled:opacity-60">
              {busy === "demo" ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
              {busy === "demo" ? "Running demo" : "Run bounty demo"}
              <ArrowRight size={17} />
            </button>
            <a href="#bounty" className="flex h-12 items-center gap-2 rounded-[11px] border border-[var(--line)] bg-white px-6 font-medium">
              Open console
              <ChevronRight size={17} />
            </a>
          </div>
        </motion.div>
      </section>

      <section id="bounty" className="mx-auto grid max-w-7xl gap-7 px-5 pb-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="media-panel min-h-[520px] p-7 text-white">
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="inline-flex rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
                Live bounty board
              </div>
              <h2 className="mt-6 max-w-lg text-4xl font-semibold leading-tight tracking-[-0.035em]">
                Every payout has a reviewed GitHub artifact behind it.
              </h2>
            </div>
            <div className="grid gap-3 rounded-[24px] bg-black/55 p-4 backdrop-blur">
              <BoardRow label="Issue" value="#128 retry race condition" tone="open" />
              <BoardRow label="Submission" value="PR #184 by dev-alex" tone="review" />
              <BoardRow label="AI verdict" value={`${submission.status} · score ${submission.score}`} tone="paid" />
            </div>
          </div>
        </div>

        <div className="soft-card rounded-[28px] p-5" id="review">
          <div className="grid gap-5 xl:grid-cols-2">
            <Panel title="1. Create bounty" icon={<BadgeCheck size={18} />}>
              <Field label="Creator" value={bountyForm.creator} onChange={(creator) => setBountyForm({ ...bountyForm, creator })} />
              <Field label="Title" value={bountyForm.title} onChange={(title) => setBountyForm({ ...bountyForm, title })} />
              <Field label="Requirements" value={bountyForm.requirements} onChange={(requirements) => setBountyForm({ ...bountyForm, requirements })} area />
              <Field label="GitHub issue URL" value={bountyForm.issueUrl} onChange={(issueUrl) => setBountyForm({ ...bountyForm, issueUrl })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Reward" value={bountyForm.reward} onChange={(reward) => setBountyForm({ ...bountyForm, reward })} />
                <Field label="Min score" value={bountyForm.minScore} onChange={(minScore) => setBountyForm({ ...bountyForm, minScore })} />
              </div>
              <ActionButton busy={busy === "bounty"} onClick={createBounty} icon={<ClipboardCheck size={17} />}>
                Create bounty
              </ActionButton>
            </Panel>

            <Panel title="2. Submit work" icon={<GitPullRequestArrow size={18} />}>
              <Field label="Contributor" value={workForm.contributor} onChange={(contributor) => setWorkForm({ ...workForm, contributor })} />
              <Field label="GitHub PR / commit URL" value={workForm.githubUrl} onChange={(githubUrl) => setWorkForm({ ...workForm, githubUrl })} />
              <Field label="Contributor notes" value={workForm.notes} onChange={(notes) => setWorkForm({ ...workForm, notes })} area />
              <ActionButton busy={busy === "submit"} onClick={submitWork} icon={<GitPullRequestArrow size={17} />}>
                Submit GitHub proof
              </ActionButton>

              <div className="rounded-[18px] bg-[var(--panel)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[var(--muted)]">Submission #{submission.submissionId}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[submission.status] || statusClass.DRAFT}`}>
                    {submission.status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Metric label="Score" value={submission.score} />
                  <Metric label="Payout %" value={submission.payout} />
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--soft-ink)]">{submission.reason}</p>
              </div>
            </Panel>
          </div>

          <div className="mt-5 grid gap-4 rounded-[24px] bg-[#111113] p-5 text-white md:grid-cols-[1fr_1fr_1.2fr]">
            <ActionButton dark busy={busy === "evaluate"} onClick={evaluateSubmission} icon={<Scale size={17} />}>
              AI evaluate
            </ActionButton>
            <ActionButton dark busy={busy === "release"} onClick={releaseReward} icon={<Banknote size={17} />}>
              Release reward
            </ActionButton>
            <div className="grid gap-2">
              {logs.map((entry) => (
                <div key={`${entry.label}-${entry.value}`} className={`rounded-[14px] px-3 py-2 text-xs ${logClass(entry.tone)}`}>
                  <span className="font-semibold">{entry.label}:</span>{" "}
                  <span className="text-white/70">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="mx-auto grid max-w-7xl gap-10 px-5 pb-24 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="inline-flex rounded-full border border-[var(--line)] bg-white px-5 py-2 text-sm">
            Simple steps — stronger payouts
          </div>
          <h2 className="mt-7 text-5xl font-semibold leading-tight tracking-[-0.04em]">
            How <span className="script">ProofBounty</span> Works
          </h2>
          <p className="mt-5 max-w-xl text-xl leading-8 text-[var(--soft-ink)]">
            Teams lock a bounty, contributors submit GitHub proof, and GenLayer reviews the work before funds move.
          </p>
        </div>
        <div className="grid grid-cols-[32px_1fr] gap-7">
          <div className="relative flex justify-center">
            <div className="timeline-line h-full w-px" />
            <div className="absolute top-0 size-4 rounded-full border-2 border-[var(--lime)] bg-white" />
          </div>
          <div className="grid gap-10">
            <Step title="Bounty & Setup" text="Define issue scope, reward amount, minimum score, and acceptance criteria." />
            <Step title="GitHub Proof" text="Contributor submits a PR, commit, or issue URL with implementation notes." />
            <Step title="Review & Release" text="The Intelligent Contract reads GitHub evidence, scores the work, and releases full or partial payout." />
          </div>
        </div>
      </section>
    </main>
  );
}

function BoardRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  const dot = tone === "paid" ? "bg-[var(--lime)]" : tone === "review" ? "bg-[#ffb020]" : "bg-white";
  return (
    <div className="flex items-center justify-between rounded-[16px] bg-white/10 px-4 py-3">
      <div>
        <div className="text-xs text-white/55">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </div>
      <span className={`size-2.5 rounded-full ${dot}`} />
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-[var(--line)] bg-white p-4">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
        <span className="grid size-8 place-items-center rounded-full bg-[var(--lime)]">{icon}</span>
        {title}
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  area = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  area?: boolean;
}) {
  const className =
    "w-full rounded-[14px] border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--lime)]";
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      {area ? (
        <textarea className={`${className} min-h-20 resize-none`} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input className={className} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function ActionButton({
  children,
  icon,
  busy,
  dark = false,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  busy: boolean;
  dark?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className={`flex h-11 items-center justify-center gap-2 rounded-[13px] px-4 text-sm font-semibold transition disabled:opacity-60 ${
        dark ? "bg-white text-black hover:bg-[var(--lime)]" : "lime-button"
      }`}
    >
      {busy ? <Loader2 className="animate-spin" size={17} /> : icon}
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white p-3">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Step({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-2xl font-semibold tracking-[-0.02em]">{title}</h3>
      <p className="mt-3 max-w-lg text-base leading-7 text-[var(--soft-ink)]">{text}</p>
    </div>
  );
}

function logClass(tone: LogEntry["tone"]) {
  if (tone === "ok") return "bg-[rgba(109,255,24,0.18)] text-[var(--lime)]";
  if (tone === "warn") return "bg-[rgba(255,176,32,0.18)] text-[#ffc35b]";
  return "bg-[rgba(255,91,46,0.18)] text-[#ff9a7e]";
}
