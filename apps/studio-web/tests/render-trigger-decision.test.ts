import { describe, it, expect } from "@jest/globals";
import { decideLaunch } from "../amplify/functions/render-trigger/decision";

const img = (o: { id?: string; kind?: string; status?: string }) => ({
  id: { S: o.id ?? "job-1" },
  kind: { S: o.kind ?? "render" },
  status: { S: o.status ?? "queued" },
});

describe("render-trigger decideLaunch", () => {
  it("launches for an INSERT of a queued render job", () => {
    expect(decideLaunch({ eventName: "INSERT", dynamodb: { NewImage: img({}) } })).toEqual({ launch: true, jobId: "job-1" });
  });

  it("launches when a job transitions into queued (retry/requeue)", () => {
    const r = decideLaunch({
      eventName: "MODIFY",
      dynamodb: { NewImage: img({}), OldImage: img({ status: "failed" }) },
    });
    expect(r).toEqual({ launch: true, jobId: "job-1" });
  });

  it("does not launch for a MODIFY of a job that was already queued", () => {
    const r = decideLaunch({
      eventName: "MODIFY",
      dynamodb: { NewImage: img({}), OldImage: img({}) },
    });
    expect(r.launch).toBe(false);
  });

  it("does not launch for REMOVE events", () => {
    expect(decideLaunch({ eventName: "REMOVE", dynamodb: { NewImage: img({}) } }).launch).toBe(false);
  });

  it("does not launch for non-render jobs", () => {
    expect(decideLaunch({ eventName: "INSERT", dynamodb: { NewImage: img({ kind: "generate" }) } }).launch).toBe(false);
  });

  it.each(["claimed", "running", "succeeded", "failed", "canceled"])("does not launch for status %s", (status) => {
    expect(decideLaunch({ eventName: "INSERT", dynamodb: { NewImage: img({ status }) } }).launch).toBe(false);
    expect(decideLaunch({ eventName: "MODIFY", dynamodb: { NewImage: img({ status }), OldImage: img({ status: "queued" }) } }).launch).toBe(false);
  });

  it("does not launch without a new image or an id", () => {
    expect(decideLaunch({ eventName: "INSERT", dynamodb: {} }).launch).toBe(false);
    expect(decideLaunch({ eventName: "INSERT", dynamodb: { NewImage: { kind: { S: "render" }, status: { S: "queued" } } } }).launch).toBe(false);
  });

  it("launches a MODIFY into queued when the old image has no status", () => {
    const r = decideLaunch({ eventName: "MODIFY", dynamodb: { NewImage: img({}), OldImage: {} } });
    expect(r.launch).toBe(true);
  });
});
