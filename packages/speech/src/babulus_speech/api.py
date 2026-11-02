"""Typed HTTP client for the Auritus backend API."""

from __future__ import annotations

from typing import Any, Protocol

import httpx

from babulus_speech.auth import (
    AuthError,
    RefreshExpiredError,
    get_access_token,
    refresh_tokens,
)
from babulus_speech.config import load_config


class AuritusApiError(RuntimeError):
    """Raised when the Auritus API returns an error."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


class AuritusSessionExpiredError(AuritusApiError):
    """Raised when the operator refresh token is dead and re-login is required."""


class WorkerAuth(Protocol):
    """How the CLI and worker authenticate to the jobs API.

    This is the one seam for credentials. Today's implementation is
    :class:`OperatorSessionAuth`; milestone M2 replaces it with a
    ``cli-login`` session (and a job-scoped token for cloud workers) by
    passing a different object to :class:`AuritusClient`, with no other
    change to the worker or the API calls.
    """

    def access_token(self) -> str:
        """Return a bearer token valid right now.

        :raises AuritusSessionExpiredError: If the session cannot be renewed.
        :raises AuritusApiError: If no credentials are available.
        """
        ...

    def refresh(self) -> None:
        """Renew the session after the API rejected the token (401)."""
        ...


class OperatorSessionAuth:
    """The Cognito operator session cached by ``babulus login``."""

    def access_token(self) -> str:
        """Return the cached access token, refreshing it when it is stale."""
        try:
            return get_access_token()
        except RefreshExpiredError as exc:
            raise AuritusSessionExpiredError(
                "Session expired. Run `babulus login`."
            ) from exc
        except AuthError as exc:
            raise AuritusApiError(str(exc)) from exc

    def refresh(self) -> None:
        """Force a token refresh."""
        try:
            refresh_tokens()
        except RefreshExpiredError as exc:
            raise AuritusSessionExpiredError(
                "Session expired. Run `babulus login`."
            ) from exc
        except AuthError as exc:
            raise AuritusApiError(str(exc)) from exc


class AuritusClient:
    """HTTP client for Auritus operator and site-management routes."""

    def __init__(
        self,
        base_url: str | None = None,
        token: str | None = None,
        auth: WorkerAuth | None = None,
    ) -> None:
        """Create a client.

        :param base_url: API base URL; defaults to config api_endpoint.
        :param token: Fixed bearer token; overrides ``auth``.
        :param auth: Credential source; defaults to the cached operator session.
        """
        cfg = load_config()
        self.base_url = (base_url or cfg.get("api_endpoint") or "").rstrip("/")
        if not self.base_url:
            raise AuritusApiError(
                "api_endpoint is not set. Run `auritus deploy` or `auritus config set`."
            )
        self._token = token
        self._auth: WorkerAuth = auth or OperatorSessionAuth()

    def _headers(self, site_key: str | None = None) -> dict[str, str]:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if site_key:
            headers["X-Auritus-Site-Key"] = site_key
        else:
            token = self._token or self._auth.access_token()
            headers["Authorization"] = f"Bearer {token}"
        return headers

    def _send(
        self,
        method: str,
        url: str,
        *,
        headers: dict[str, str],
        json_body: dict[str, Any] | None,
    ) -> httpx.Response:
        return httpx.request(
            method,
            url,
            headers=headers,
            json=json_body,
            timeout=60.0,
        )

    def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: dict[str, Any] | None = None,
        site_key: str | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        response = self._send(
            method, url, headers=self._headers(site_key=site_key), json_body=json_body
        )
        if response.status_code == 401 and not site_key:
            self._auth.refresh()
            response = self._send(
                method,
                url,
                headers=self._headers(site_key=site_key),
                json_body=json_body,
            )
        if response.status_code >= 400:
            raise AuritusApiError(
                f"{method} {path} failed: {response.status_code} {response.text}",
                status_code=response.status_code,
            )
        if not response.content:
            return {}
        return response.json()

    def create_job(
        self,
        *,
        text: str,
        site_key: str,
        name: str = "",
        byline: str = "",
        tts_backend: str = "kokoro",
        voice_id: str = "default",
    ) -> dict[str, Any]:
        """Create a generation job; the API computes its content hash.

        :returns: The API response, including the job's ``content_hash``.
        """
        return self._request(
            "POST",
            "/jobs",
            json_body={
                "text": text,
                "name": name,
                "byline": byline,
                "tts_backend": tts_backend,
                "voice_id": voice_id,
            },
            site_key=site_key,
        )

    def create_video_job(
        self,
        *,
        script: dict[str, Any],
        timeline: dict[str, Any] | None = None,
        audio_sha256: str | None = None,
        options: dict[str, Any] | None = None,
        name: str = "",
    ) -> dict[str, Any]:
        """Create a video render job; it waits for a local worker.

        :returns: The API response with ``content_hash``, ``status`` and, for
            a new job, the reason it is waiting.
        """
        return self._request(
            "POST",
            "/jobs",
            json_body={
                "kind": "video",
                "script": script,
                "timeline": timeline,
                "audio_sha256": audio_sha256,
                "options": options or {},
                "name": name,
            },
        )

    def get_job_input(self, content_hash: str) -> dict[str, Any]:
        """Fetch a video job's script, timeline, options and audio URL."""
        return self._request("GET", f"/jobs/{content_hash}/input")

    def store_upload_url(self, sha256: str) -> dict[str, Any]:
        """Ask for a URL to upload one object to the content store.

        :returns: ``{"exists": True}`` when the store already has it.
        """
        return self._request("POST", f"/store/{sha256}/presign-upload", json_body={})

    def store_download_url(self, sha256: str) -> dict[str, Any]:
        """Ask for a URL to download one object from the content store."""
        return self._request("GET", f"/store/{sha256}")

    def publish_voice(self, voice_id: str, manifest_sha256: str) -> dict[str, Any]:
        """Publish a voice whose files and manifest are in the content store.

        :raises AuritusApiError: If the manifest or any file it lists is not
            in the store; the error names what is missing.
        """
        return self._request(
            "POST",
            f"/voices/{voice_id}/publish",
            json_body={"manifest_sha256": manifest_sha256},
        )

    def get_job(self, content_hash: str, *, site_key: str) -> dict[str, Any]:
        """Fetch job status and metadata."""
        return self._request("GET", f"/jobs/{content_hash}", site_key=site_key)

    def list_claimable(self) -> list[dict[str, Any]]:
        """List jobs available for the local worker to claim."""
        data = self._request("GET", "/jobs/claimable")
        return list(data.get("jobs") or [])

    def claim_job(
        self, content_hash: str, owner: str, claim_seconds: int | None = None
    ) -> dict[str, Any]:
        """Claim a job; the response carries the claim's fencing token.

        :returns: The API response, including ``claim_token``. Present that
            token with every later call for this job.
        """
        return self._request(
            "PUT",
            f"/jobs/{content_hash}/claim",
            json_body=(
                {"claim_owner": owner, "claim_seconds": claim_seconds}
                if claim_seconds
                else {"claim_owner": owner}
            ),
        )

    def renew_claim(
        self,
        content_hash: str,
        owner: str,
        claim_token: str,
        claim_seconds: int | None = None,
    ) -> dict[str, Any]:
        """Renew an in-flight claim (heartbeat) for long-running work.

        :raises AuritusApiError: With ``status_code`` 409 when the claim was
            lost, meaning the worker must stop and write nothing.
        """
        return self._request(
            "PUT",
            f"/jobs/{content_hash}/claim",
            json_body={
                "claim_owner": owner,
                "renew": True,
                "claim_token": claim_token,
                **({"claim_seconds": claim_seconds} if claim_seconds else {}),
            },
        )

    def presign_upload(
        self, content_hash: str, claim_token: str | None = None
    ) -> dict[str, Any]:
        """Get a presigned URL for the claim holder's audio upload."""
        return self._request(
            "POST",
            f"/jobs/{content_hash}/presign-upload",
            json_body={"claim_token": claim_token} if claim_token else {},
        )

    def mark_done(
        self,
        content_hash: str,
        *,
        audio_key: str,
        owner: str,
        claim_token: str | None = None,
    ) -> dict[str, Any]:
        """Mark a job done after audio upload."""
        return self._request(
            "PUT",
            f"/jobs/{content_hash}/done",
            json_body={
                "audio_key": audio_key,
                "owner": owner,
                "claim_token": claim_token,
            },
        )

    def complete_job(
        self,
        content_hash: str,
        *,
        audio_key: str,
        owner: str,
        claim_token: str | None = None,
    ) -> dict[str, Any]:
        """Mark a job done after audio upload (alias for :meth:`mark_done`)."""
        return self.mark_done(
            content_hash, audio_key=audio_key, owner=owner, claim_token=claim_token
        )

    def mark_failed(
        self,
        content_hash: str,
        *,
        reason: str,
        owner: str,
        claim_token: str | None = None,
    ) -> dict[str, Any]:
        """Release a claim and mark a job failed after an unrecoverable error.

        :param content_hash: The content hash identifying the job.
        :param reason: A short, human-readable description of the failure.
        :param owner: The claim owner releasing the job.
        :param claim_token: The fencing token from the claim.
        :returns: The API response with the job reset to ``failed``.
        """
        return self._request(
            "PUT",
            f"/jobs/{content_hash}/failed",
            json_body={"reason": reason, "owner": owner, "claim_token": claim_token},
        )

    def create_site(self, *, origin: str, name: str = "") -> dict[str, Any]:
        """Mint a site key for an embed origin."""
        return self._request(
            "POST",
            "/sites",
            json_body={"origin": origin, "name": name},
        )

    def list_sites(self) -> list[dict[str, Any]]:
        """List site keys for the operator."""
        data = self._request("GET", "/sites")
        return list(data.get("sites") or [])

    def revoke_site(self, site_id: str) -> dict[str, Any]:
        """Revoke a site key."""
        return self._request("DELETE", f"/sites/{site_id}")

    def delete_job(self, content_hash: str) -> dict[str, Any]:
        """Delete a generated audio job and its audio artifact.

        :param content_hash: The content hash identifying the job.
        :returns: The API response confirming deletion.
        """
        return self._request("DELETE", f"/admin/jobs/{content_hash}")

    def regenerate_job(self, content_hash: str) -> dict[str, Any]:
        """Force regeneration of a job, resetting it to pending in place.

        :param content_hash: The content hash identifying the job.
        :returns: The API response with the job reset to pending.
        """
        return self._request(
            "POST", f"/admin/jobs/{content_hash}/regenerate", json_body={}
        )

    def retry_job(self, content_hash: str, *, force: bool = False) -> dict[str, Any]:
        """Retry a failed job, or release a stuck claim, resetting it to pending.

        :param content_hash: The content hash identifying the job.
        :param force: Release a live claim rather than only a stale one.
        :returns: The API response with the job reset to pending.
        """
        return self._request(
            "POST",
            f"/admin/jobs/{content_hash}/retry",
            json_body={"force": force} if force else {},
        )

    def disable_batch_queue(self) -> dict[str, Any]:
        """Emergency kill-switch: disable the Batch job queue."""
        return self._request(
            "POST", "/admin/queue/toggle", json_body={"state": "DISABLED"}
        )

    def enable_batch_queue(self) -> dict[str, Any]:
        """Re-enable the Batch job queue after a kill-switch."""
        return self._request(
            "POST", "/admin/queue/toggle", json_body={"state": "ENABLED"}
        )

    def list_jobs(
        self,
        *,
        status: str | None = None,
        limit: int | None = None,
        next_token: str | None = None,
    ) -> dict[str, Any]:
        """List generation jobs with optional status filter and pagination.

        :param status: Filter to a single job status, or ``None`` for all.
        :param limit: Maximum jobs to return per page.
        :param next_token: Pagination cursor from a prior call.
        :returns: ``{"jobs": [...], "next_token": str | None}``.
        """
        params = []
        if status:
            params.append(f"status={status}")
        if limit:
            params.append(f"limit={limit}")
        if next_token:
            params.append(f"next_token={next_token}")
        query = f"?{'&'.join(params)}" if params else ""
        return self._request("GET", f"/admin/jobs{query}")

    def get_admin_job(self, content_hash: str) -> dict[str, Any]:
        """Fetch full admin telemetry for one job.

        :param content_hash: The content hash identifying the job.
        :returns: The job's admin-view fields.
        """
        return self._request("GET", f"/admin/jobs/{content_hash}")

    def get_costs(
        self,
        *,
        site_id: str | None = None,
        from_date: str | None = None,
        to_date: str | None = None,
    ) -> dict[str, Any]:
        """Fetch daily cost rollups, optionally scoped to one site.

        :param site_id: Restrict to one site.
        :param from_date: ISO date (``YYYY-MM-DD``), inclusive range start.
        :param to_date: ISO date (``YYYY-MM-DD``), inclusive range end.
        :returns: ``{"daily": [...], "total": {...}}``.
        """
        params = []
        if site_id:
            params.append(f"site_id={site_id}")
        if from_date:
            params.append(f"from={from_date}")
        if to_date:
            params.append(f"to={to_date}")
        query = f"?{'&'.join(params)}" if params else ""
        return self._request("GET", f"/admin/costs{query}")

    def bulk_delete_jobs(
        self,
        *,
        site_id: str | None = None,
        status: str | None = None,
        older_than_days: int | None = None,
        dry_run: bool = True,
    ) -> dict[str, Any]:
        """Delete jobs matching a filter, dry-run by default.

        :param site_id: Restrict to one site.
        :param status: Restrict to one job status.
        :param older_than_days: Restrict to jobs older than this many days.
        :param dry_run: When True (the default), report matches without deleting.
        :returns: ``{"matched": int, "deleted": int, "dry_run": bool}``.
        """
        body: dict[str, Any] = {"dry_run": dry_run}
        if site_id:
            body["site_id"] = site_id
        if status:
            body["status"] = status
        if older_than_days is not None:
            body["older_than_days"] = older_than_days
        return self._request("POST", "/admin/jobs/bulk-delete", json_body=body)
