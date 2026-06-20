# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import typing
import json


class ProofBounty(gl.Contract):
    bounty_creators: TreeMap[u256, str]
    bounty_titles: TreeMap[u256, str]
    bounty_requirements: TreeMap[u256, str]
    bounty_issue_urls: TreeMap[u256, str]
    bounty_reward_amounts: TreeMap[u256, u256]
    bounty_remaining_amounts: TreeMap[u256, u256]
    bounty_min_scores: TreeMap[u256, u256]
    bounty_statuses: TreeMap[u256, str]
    bounty_count: u256

    submission_bounty_ids: TreeMap[u256, u256]
    submission_contributors: TreeMap[u256, str]
    submission_github_urls: TreeMap[u256, str]
    submission_notes: TreeMap[u256, str]
    submission_statuses: TreeMap[u256, str]
    submission_scores: TreeMap[u256, u256]
    submission_payout_pcts: TreeMap[u256, u256]
    submission_reasons: TreeMap[u256, str]
    submission_verdicts: TreeMap[u256, str]
    submission_count: u256

    payout_recipients: DynArray[str]
    payout_amounts: DynArray[u256]
    payout_submission_ids: DynArray[u256]
    payout_reasons: DynArray[str]
    payout_count: u256

    challenge_submission_ids: DynArray[u256]
    challenge_reasons: DynArray[str]
    challenge_outcomes: DynArray[str]
    challenge_panel_json: DynArray[str]
    challenge_count: u256

    def __init__(self):
        self.bounty_count = u256(0)
        self.submission_count = u256(0)
        self.payout_count = u256(0)
        self.challenge_count = u256(0)

    @gl.public.write
    def create_bounty(
        self,
        creator: str,
        title: str,
        requirements: str,
        issue_url: str,
        reward_amount: u256,
        min_score: u256,
    ) -> typing.Any:
        if len(creator) == 0:
            return "MISSING_CREATOR"
        if len(title) == 0:
            return "MISSING_TITLE"
        if len(requirements) == 0:
            return "MISSING_REQUIREMENTS"
        if len(issue_url) == 0:
            return "MISSING_ISSUE_URL"
        if reward_amount == u256(0):
            return "ZERO_REWARD"
        if min_score == u256(0):
            return "ZERO_MIN_SCORE"
        if min_score > u256(100):
            return "INVALID_MIN_SCORE"

        bounty_id = self.bounty_count
        self.bounty_creators[bounty_id] = creator
        self.bounty_titles[bounty_id] = title
        self.bounty_requirements[bounty_id] = requirements
        self.bounty_issue_urls[bounty_id] = issue_url
        self.bounty_reward_amounts[bounty_id] = reward_amount
        self.bounty_remaining_amounts[bounty_id] = reward_amount
        self.bounty_min_scores[bounty_id] = min_score
        self.bounty_statuses[bounty_id] = "OPEN"
        self.bounty_count = bounty_id + u256(1)
        return bounty_id

    @gl.public.write
    def close_bounty(self, bounty_id: u256) -> typing.Any:
        if bounty_id >= self.bounty_count:
            return "INVALID_BOUNTY_ID"
        if self.bounty_statuses[bounty_id] != "OPEN":
            return "BOUNTY_NOT_OPEN"
        self.bounty_statuses[bounty_id] = "CLOSED"
        return "CLOSED"

    @gl.public.write
    def submit_work(
        self,
        bounty_id: u256,
        contributor: str,
        github_url: str,
        notes: str,
    ) -> typing.Any:
        if bounty_id >= self.bounty_count:
            return "INVALID_BOUNTY_ID"
        if self.bounty_statuses[bounty_id] != "OPEN":
            return "BOUNTY_NOT_OPEN"
        if len(contributor) == 0:
            return "MISSING_CONTRIBUTOR"
        if len(github_url) == 0:
            return "MISSING_GITHUB_URL"
        if self.bounty_remaining_amounts[bounty_id] == u256(0):
            return "BOUNTY_EMPTY"

        submission_id = self.submission_count
        self.submission_bounty_ids[submission_id] = bounty_id
        self.submission_contributors[submission_id] = contributor
        self.submission_github_urls[submission_id] = github_url
        self.submission_notes[submission_id] = notes
        self.submission_statuses[submission_id] = "PENDING"
        self.submission_scores[submission_id] = u256(0)
        self.submission_payout_pcts[submission_id] = u256(0)
        self.submission_reasons[submission_id] = ""
        self.submission_verdicts[submission_id] = ""
        self.submission_count = submission_id + u256(1)
        return submission_id

    @gl.public.write
    def evaluate_submission(self, submission_id: u256) -> typing.Any:
        if submission_id >= self.submission_count:
            return "INVALID_SUBMISSION_ID"
        if self.submission_statuses[submission_id] != "PENDING":
            return "ALREADY_EVALUATED"

        bounty_id = self.submission_bounty_ids[submission_id]
        if self.bounty_statuses[bounty_id] != "OPEN":
            return "BOUNTY_NOT_OPEN"
        if self.bounty_remaining_amounts[bounty_id] == u256(0):
            return "BOUNTY_EMPTY"

        creator = self.bounty_creators[bounty_id]
        title = self.bounty_titles[bounty_id]
        requirements = self.bounty_requirements[bounty_id]
        issue_url = self.bounty_issue_urls[bounty_id]
        min_score = self.bounty_min_scores[bounty_id]
        contributor = self.submission_contributors[submission_id]
        github_url = self.submission_github_urls[submission_id]
        notes = self.submission_notes[submission_id]

        def truncate(text, limit):
            if len(text) > limit:
                return text[:limit]
            return text

        def run_review() -> str:
            issue_content = ""
            try:
                resp = gl.nondet.web.get(issue_url)
                issue_content = resp.body.decode("utf-8")
            except Exception:
                issue_content = "[FETCH_FAILED:issue_url]"

            submission_content = ""
            try:
                resp = gl.nondet.web.get(github_url)
                submission_content = resp.body.decode("utf-8")
            except Exception:
                submission_content = "[FETCH_FAILED:github_url]"

            prompt = (
                "You are ProofBounty, a GenLayer on-chain reviewer for GitHub bounties. "
                "Your verdict determines whether real bounty funds are paid. Review the actual "
                "issue requirements and submitted PR/commit/issue evidence. Be strict about spam, "
                "copy-paste changes, missing tests, and work that does not solve the bounty.\n\n"
                "=== BOUNTY ===\n"
                "Creator: " + creator + "\n"
                "Title: " + title + "\n"
                "Requirements: " + requirements + "\n"
                "Minimum Score for full payout: " + str(min_score) + "\n"
                "Issue URL: " + issue_url + "\n\n"
                "=== CONTRIBUTOR SUBMISSION ===\n"
                "Contributor: " + contributor + "\n"
                "GitHub URL: " + github_url + "\n"
                "Notes: " + notes + "\n\n"
                "=== ISSUE / BOUNTY CONTENT ===\n"
                + truncate(issue_content, 4000) + "\n\n"
                "=== SUBMISSION CONTENT ===\n"
                + truncate(submission_content, 5000) + "\n\n"
                "Score each criterion from 0-100:\n"
                "- requirement_match: solves the stated bounty requirements\n"
                "- code_quality: appropriate, maintainable, minimal-risk implementation\n"
                "- test_quality: tests, validation, or convincing manual proof\n"
                "- completeness: covers edge cases and integrates cleanly\n"
                "- spam_risk: low-effort, irrelevant, copied, malicious, or fake work\n\n"
                "Compute overall_score = round((requirement_match * 35 + code_quality * 25 + "
                "test_quality * 15 + completeness * 25) / 100 - spam_risk * 0.35).\n"
                "Decision rules:\n"
                "- PAY_FULL if overall_score >= minimum score and spam_risk < 30.\n"
                "- PAY_PARTIAL if overall_score >= 60 and spam_risk < 45.\n"
                "- ESCALATE if evidence is promising but critical GitHub pages failed to load or conflict.\n"
                "- REJECT otherwise.\n\n"
                "Respond with ONLY this JSON, no other text or explanation:\n"
                '{"decision":"PAY_FULL|PAY_PARTIAL|REJECT|ESCALATE",'
                '"requirement_match":N,'
                '"code_quality":N,'
                '"test_quality":N,'
                '"completeness":N,'
                '"spam_risk":N,'
                '"overall_score":N,'
                '"payout_percentage":N,'
                '"reason":"1-2 sentence evidence-based reason"}'
            )
            answer = gl.nondet.exec_prompt(prompt)
            return answer.replace("```json", "").replace("```", "").strip()

        review_json = gl.eq_principle.strict_eq(run_review)
        try:
            data = json.loads(review_json)
        except Exception:
            return "INVALID_REVIEW_JSON"

        decision = str(data.get("decision", ""))
        if decision not in ["PAY_FULL", "PAY_PARTIAL", "REJECT", "ESCALATE"]:
            return "INVALID_DECISION"

        score = int(data.get("overall_score", 0))
        payout_pct = int(data.get("payout_percentage", 0))
        if score < 0:
            score = 0
        if score > 100:
            score = 100
        if payout_pct < 0:
            payout_pct = 0
        if payout_pct > 100:
            payout_pct = 100

        if decision == "PAY_FULL":
            payout_pct = 100
        if decision == "REJECT" or decision == "ESCALATE":
            payout_pct = 0

        self.submission_verdicts[submission_id] = json.dumps(data, sort_keys=True, separators=(",", ":"))
        self.submission_scores[submission_id] = u256(score)
        self.submission_payout_pcts[submission_id] = u256(payout_pct)
        self.submission_reasons[submission_id] = str(data.get("reason", ""))

        if decision == "PAY_FULL":
            self.submission_statuses[submission_id] = "APPROVED_FULL"
        elif decision == "PAY_PARTIAL":
            self.submission_statuses[submission_id] = "APPROVED_PARTIAL"
        elif decision == "ESCALATE":
            self.submission_statuses[submission_id] = "ESCALATED"
        else:
            self.submission_statuses[submission_id] = "REJECTED"
        return self.submission_verdicts[submission_id]

    @gl.public.write
    def release_reward(self, submission_id: u256) -> typing.Any:
        if submission_id >= self.submission_count:
            return "INVALID_SUBMISSION_ID"
        status = self.submission_statuses[submission_id]
        if status != "APPROVED_FULL" and status != "APPROVED_PARTIAL":
            return "NOT_APPROVED"

        bounty_id = self.submission_bounty_ids[submission_id]
        reward = self.bounty_reward_amounts[bounty_id]
        remaining = self.bounty_remaining_amounts[bounty_id]
        payout_pct = self.submission_payout_pcts[submission_id]
        payout_amount = reward * payout_pct // u256(100)
        if payout_amount == u256(0):
            return "ZERO_PAYOUT"
        if payout_amount > remaining:
            payout_amount = remaining
        new_remaining = remaining - payout_amount
        self.bounty_remaining_amounts[bounty_id] = new_remaining

        self.payout_recipients.append(self.submission_contributors[submission_id])
        self.payout_amounts.append(payout_amount)
        self.payout_submission_ids.append(submission_id)
        self.payout_reasons.append(self.submission_reasons[submission_id])
        self.payout_count = self.payout_count + u256(1)
        self.submission_statuses[submission_id] = "PAID"
        if new_remaining == u256(0):
            self.bounty_statuses[bounty_id] = "PAID_OUT"
        return "PAID"

    @gl.public.write
    def challenge_review(self, submission_id: u256, reason: str) -> typing.Any:
        if submission_id >= self.submission_count:
            return "INVALID_SUBMISSION_ID"
        status = self.submission_statuses[submission_id]
        if status != "REJECTED" and status != "ESCALATED":
            return "NOT_CHALLENGEABLE"
        if len(reason) == 0:
            return "MISSING_REASON"
        challenge_id = self.challenge_count
        self.challenge_submission_ids.append(submission_id)
        self.challenge_reasons.append(reason)
        self.challenge_outcomes.append("PENDING")
        self.challenge_panel_json.append("")
        self.challenge_count = challenge_id + u256(1)
        self.submission_statuses[submission_id] = "CHALLENGED"
        return challenge_id

    @gl.public.write
    def resolve_challenge(self, submission_id: u256) -> typing.Any:
        if submission_id >= self.submission_count:
            return "INVALID_SUBMISSION_ID"
        if self.submission_statuses[submission_id] != "CHALLENGED":
            return "NOT_IN_CHALLENGE"

        bounty_id = self.submission_bounty_ids[submission_id]
        title = self.bounty_titles[bounty_id]
        requirements = self.bounty_requirements[bounty_id]
        issue_url = self.bounty_issue_urls[bounty_id]
        github_url = self.submission_github_urls[submission_id]
        original_verdict = self.submission_verdicts[submission_id]

        def panel_review() -> str:
            issue_content = ""
            try:
                resp = gl.nondet.web.get(issue_url)
                issue_content = resp.body.decode("utf-8")
            except Exception:
                issue_content = "[FETCH_FAILED:issue_url]"
            submission_content = ""
            try:
                resp = gl.nondet.web.get(github_url)
                submission_content = resp.body.decode("utf-8")
            except Exception:
                submission_content = "[FETCH_FAILED:github_url]"
            prompt = (
                "You are an appeal panel for ProofBounty. Check the semantic correctness "
                "of the original bounty verdict, not merely its JSON format.\n\n"
                "Title: " + title + "\n"
                "Requirements: " + requirements + "\n"
                "Original Verdict: " + original_verdict + "\n\n"
                "Issue Evidence:\n" + issue_content[:4000] + "\n\n"
                "Submission Evidence:\n" + submission_content[:5000] + "\n\n"
                "Respond with ONLY this JSON:\n"
                '{"appeal_decision":"UPHOLD|OVERTURN_FULL|OVERTURN_PARTIAL|OVERTURN_REJECT",'
                '"score":N,'
                '"payout_percentage":N,'
                '"reason":"1-2 sentence reason"}'
            )
            return gl.nondet.exec_prompt(prompt).replace("```json", "").replace("```", "").strip()

        panel_json = gl.eq_principle.strict_eq(panel_review)
        try:
            panel = json.loads(panel_json)
        except Exception:
            return "INVALID_PANEL_JSON"

        appeal = str(panel.get("appeal_decision", ""))
        if appeal not in ["UPHOLD", "OVERTURN_FULL", "OVERTURN_PARTIAL", "OVERTURN_REJECT"]:
            return "INVALID_APPEAL_DECISION"

        idx = self.challenge_count
        self.challenge_submission_ids.append(submission_id)
        self.challenge_reasons.append("RESOLUTION")
        self.challenge_outcomes.append(appeal)
        self.challenge_panel_json.append(json.dumps(panel, sort_keys=True, separators=(",", ":")))
        self.challenge_count = idx + u256(1)

        if appeal == "OVERTURN_FULL":
            self.submission_statuses[submission_id] = "APPROVED_FULL"
            self.submission_payout_pcts[submission_id] = u256(100)
        elif appeal == "OVERTURN_PARTIAL":
            pct = int(panel.get("payout_percentage", 50))
            if pct < 1:
                pct = 1
            if pct > 99:
                pct = 99
            self.submission_statuses[submission_id] = "APPROVED_PARTIAL"
            self.submission_payout_pcts[submission_id] = u256(pct)
        elif appeal == "OVERTURN_REJECT":
            self.submission_statuses[submission_id] = "REJECTED"
            self.submission_payout_pcts[submission_id] = u256(0)
        else:
            self.submission_statuses[submission_id] = "ESCALATED"
        self.submission_reasons[submission_id] = str(panel.get("reason", ""))
        return self.submission_statuses[submission_id]

    @gl.public.view
    def get_bounty(self, bounty_id: u256) -> str:
        if bounty_id >= self.bounty_count:
            return json.dumps({"error": "INVALID_BOUNTY_ID"}, sort_keys=True, separators=(",", ":"))
        obj = {
            "bounty_id": str(bounty_id),
            "creator": self.bounty_creators[bounty_id],
            "issue_url": self.bounty_issue_urls[bounty_id],
            "min_score": str(self.bounty_min_scores[bounty_id]),
            "remaining_amount": str(self.bounty_remaining_amounts[bounty_id]),
            "requirements": self.bounty_requirements[bounty_id],
            "reward_amount": str(self.bounty_reward_amounts[bounty_id]),
            "status": self.bounty_statuses[bounty_id],
            "title": self.bounty_titles[bounty_id],
        }
        return json.dumps(obj, sort_keys=True, separators=(",", ":"))

    @gl.public.view
    def get_submission(self, submission_id: u256) -> str:
        if submission_id >= self.submission_count:
            return json.dumps({"error": "INVALID_SUBMISSION_ID"}, sort_keys=True, separators=(",", ":"))
        obj = {
            "bounty_id": str(self.submission_bounty_ids[submission_id]),
            "contributor": self.submission_contributors[submission_id],
            "github_url": self.submission_github_urls[submission_id],
            "notes": self.submission_notes[submission_id],
            "payout_percentage": str(self.submission_payout_pcts[submission_id]),
            "reason": self.submission_reasons[submission_id],
            "score": str(self.submission_scores[submission_id]),
            "status": self.submission_statuses[submission_id],
            "submission_id": str(submission_id),
            "verdict": self.submission_verdicts[submission_id],
        }
        return json.dumps(obj, sort_keys=True, separators=(",", ":"))

    @gl.public.view
    def get_bounty_count(self) -> u256:
        return self.bounty_count

    @gl.public.view
    def get_submission_count(self) -> u256:
        return self.submission_count

    @gl.public.view
    def get_submission_status(self, submission_id: u256) -> str:
        if submission_id >= self.submission_count:
            return "INVALID_SUBMISSION_ID"
        return self.submission_statuses[submission_id]

    @gl.public.view
    def get_payout_count(self) -> u256:
        return self.payout_count

    @gl.public.view
    def get_payout(self, index: u256) -> str:
        if index >= self.payout_count:
            return json.dumps({"error": "INVALID_PAYOUT_INDEX"}, sort_keys=True, separators=(",", ":"))
        obj = {
            "amount": str(self.payout_amounts[index]),
            "reason": self.payout_reasons[index],
            "recipient": self.payout_recipients[index],
            "submission_id": str(self.payout_submission_ids[index]),
        }
        return json.dumps(obj, sort_keys=True, separators=(",", ":"))
