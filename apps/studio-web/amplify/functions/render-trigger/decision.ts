/**
 * Pure decision logic for the render trigger: should a DynamoDB stream record launch a Fargate task?
 *
 * A task is launched only when a render job ENTERS the 'queued' status:
 * - INSERT with status 'queued', or
 * - MODIFY where the new status is 'queued' and the old status was something else
 *   (a retry re-queue or a manual requeue).
 * Any other write to a job that is still 'queued' (heartbeats, progress, field edits) must NOT launch another task.
 */

export type StreamRecordLike = {
  eventName?: string;
  dynamodb?: {
    NewImage?: Record<string, any>;
    OldImage?: Record<string, any>;
  };
};

export type LaunchDecision =
  | { launch: true; jobId: string }
  | { launch: false; reason: string };

const str = (attr: any): string | undefined => (attr && typeof attr.S === 'string' ? attr.S : undefined);

export function decideLaunch(record: StreamRecordLike): LaunchDecision {
  const event = record.eventName;
  if (event !== 'INSERT' && event !== 'MODIFY') {
    return { launch: false, reason: `ignored event ${event ?? 'unknown'}` };
  }

  const next = record.dynamodb?.NewImage;
  if (!next) return { launch: false, reason: 'no new image' };

  const jobId = str(next.id);
  if (!jobId) return { launch: false, reason: 'no job id' };
  if (str(next.kind) !== 'render') return { launch: false, reason: 'not a render job' };
  if (str(next.status) !== 'queued') return { launch: false, reason: 'job is not queued' };

  if (event === 'MODIFY' && str(record.dynamodb?.OldImage?.status) === 'queued') {
    return { launch: false, reason: 'job was already queued (not a transition)' };
  }

  return { launch: true, jobId };
}
