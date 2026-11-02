/**
 * Which job, if any, should lock the video editor and keep it polling.
 *
 * Only a job some worker will actually finish may do that. Rendering and
 * generation run on the user's own computer, so no Studio job kind has a
 * consumer; a leftover queued, claimed or running job of any kind would
 * otherwise lock the editor and poll forever.
 */
export const JOB_KINDS_WITH_A_CONSUMER: readonly string[] = [];

const IN_FLIGHT = ["queued", "claimed", "running"];

export type EditorJob = { kind?: string | null; status?: string | null; inputJson?: string | null };

export function findActiveJob<T extends EditorJob>(jobs: readonly T[], videoId: string): T | undefined {
  return jobs.find((job) => {
    if (!JOB_KINDS_WITH_A_CONSUMER.includes(String(job.kind))) return false;
    let input: { videoId?: string } = {};
    try {
      input = job.inputJson ? JSON.parse(job.inputJson) : {};
    } catch {
      // an unreadable input cannot belong to this video
    }
    return input.videoId === videoId && IN_FLIGHT.includes(String(job.status));
  });
}
