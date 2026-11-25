# assets/

Images, video, audio and PDF scores used by lessons. Served at `/assets/...`.

Suggested layout — one folder per lesson, matching the `src` in each lesson's ```media block:

```
assets/
  giao-vien/            teacher-guide photos (camera setup, etc.)
  cap-1/bai-01/         Level 1, lesson 1
  cap-1/bai-02/
  ...
  cap-4/bai-12/
  phu-luc/              appendix files (chord charts, printable forms)
```

Workflow:
1. Run `cargo run -- report` (or `cargo run -- report --csv > media.csv`) to get the list of media to record.
2. Record / export the file and save it at exactly the listed path.
3. Reload the preview: the yellow "Media cần bổ sung" box turns into a real player/image.

Tips:
- Video: MP4 (H.264 + AAC), 720p is enough, keep clips short (30 s – 3 min).
- Large videos: upload as unlisted YouTube and use `type = "youtube"` with the video id.
- Scores: PDF; only public-domain works or your own arrangements.
