import { findActiveJob } from "../active-job";

const job = (kind: string, status: string, videoId = "video-1") => ({
  kind,
  status,
  inputJson: JSON.stringify({ videoId }),
});

describe("findActiveJob", () => {
  it.each(["queued", "claimed", "running"])("ignores a leftover %s render job", (status) => {
    expect(findActiveJob([job("render", status)], "video-1")).toBeUndefined();
  });

  it.each(["queued", "claimed", "running"])("ignores a leftover %s generate job", (status) => {
    expect(findActiveJob([job("generate", status)], "video-1")).toBeUndefined();
  });

  it("finds nothing for an empty list or unreadable input", () => {
    expect(findActiveJob([], "video-1")).toBeUndefined();
    expect(findActiveJob([{ kind: "render", status: "queued", inputJson: "{" }], "video-1")).toBeUndefined();
  });
});
