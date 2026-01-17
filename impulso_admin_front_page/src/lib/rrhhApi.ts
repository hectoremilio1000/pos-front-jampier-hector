const API = import.meta.env.VITE_API_RRHH__BASE as string;

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, init);
  if (!res.ok) {
    let msg = `${res.status} ${res.statusText}`;
    try {
      const j = await res.json();
      msg = j.error ?? j.message ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

/* Candidates */
export function listCandidates(
  q?: string,
  stageId?: number,
  page = 1,
  limit = 20
) {
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (stageId) qs.set("stageId", String(stageId));
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  return http<{ meta: any; data: any[] }>(`/api/candidates?${qs.toString()}`);
}
export function getCandidate(id: number | string) {
  return http<any>(`/api/candidates/${id}`);
}
export function createCandidate(payload: any) {
  return http<any>(`/api/candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function updateCandidate(id: number, payload: any) {
  return http<any>(`/api/candidates/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function setCandidateStage(id: number, payload: any) {
  return http<{ ok: true; candidateId: number; stageId: number }>(
    `/api/candidates/${id}/stage`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );
}

/* CVs */
export function listCandidateCvs(id: number) {
  return http<{ ok: true; files: any[] }>(`/api/candidates/${id}/cv`);
}
export function setPrimaryCv(candidateId: number, cvId: number) {
  return http<{ ok: true }>(
    `/api/candidates/${candidateId}/cv/${cvId}/primary`,
    { method: "PATCH" }
  );
}
export function deleteCv(candidateId: number, cvId: number) {
  return http<{ ok: true }>(`/api/candidates/${candidateId}/cv/${cvId}`, {
    method: "DELETE",
  });
}

/* Address media */
export function listAddressMedia(candidateId: number) {
  return http<{ ok: true; media: any[] }>(
    `/api/candidates/${candidateId}/address-media`
  );
}
export function deleteAddressMedia(candidateId: number, mediaId: number) {
  return http<{ ok: true }>(
    `/api/candidates/${candidateId}/address-media/${mediaId}`,
    { method: "DELETE" }
  );
}

/* Interviews */
export function createInterview(candidateId: number, payload: any) {
  return http<any>(`/api/candidates/${candidateId}/interviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function updateInterview(id: number, payload: any) {
  return http<any>(`/api/interviews/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* Psych tests */
export function createPsychTest(candidateId: number, payload: any) {
  return http<any>(`/api/candidates/${candidateId}/psych-tests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function setPsychTestResult(id: number, payload: any) {
  return http<any>(`/api/psych-tests/${id}/result`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* Offers */
export function createOffer(candidateId: number, payload: any) {
  return http<any>(`/api/candidates/${candidateId}/offers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function updateOffer(id: number, payload: any) {
  return http<any>(`/api/offers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/* Previous jobs */
export function listPreviousJobs(candidateId: number) {
  return http<any[]>(`/api/candidates/${candidateId}/previous-jobs`);
}
export function createPreviousJob(candidateId: number, payload: any) {
  return http<any>(`/api/candidates/${candidateId}/previous-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function updatePreviousJob(jobId: number, payload: any) {
  return http<any>(`/api/previous-jobs/${jobId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function deletePreviousJob(jobId: number) {
  return http<{ ok: true }>(`/api/previous-jobs/${jobId}`, {
    method: "DELETE",
  });
}
/* Public (no auth) */
export async function publicApplyCandidate(form: FormData) {
  const res = await fetch(`${API}/api/public/apply`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export function publicPsychShow(token: string) {
  return http<any>(`/api/public/psych-tests/${token}`);
}
export function publicPsychSubmit(token: string, payload: any) {
  return http<any>(`/api/public/psych-tests/${token}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function publicOfferShow(token: string) {
  return http<any>(`/api/public/offers/${token}`);
}
export function publicOfferRespond(token: string, payload: any) {
  return http<any>(`/api/public/offers/${token}/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
export function publicApplyFull(payload: any) {
  return http<any>(`/api/public/apply-full`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function publicPracticalShow(token: string) {
  return http<any>(`/api/public/practical-tests/${token}`);
}
export function publicPracticalSubmit(token: string, payload: any) {
  return http<any>(`/api/public/practical-tests/${token}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
/* Practical tests (admin) */
export function listPracticalTests(candidateId: number) {
  return http<any[]>(`/api/candidates/${candidateId}/practical-tests`);
}
