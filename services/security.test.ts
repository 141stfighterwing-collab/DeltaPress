import { describe, expect, it } from "bun:test";
import { normalizeYouTubeEmbeds } from "./security";

describe("normalizeYouTubeEmbeds", () => {
  it("should return empty string for empty input", () => {
    expect(normalizeYouTubeEmbeds("")).toBe("");
  });

  it("should return the same string if there are no iframes", () => {
    const html = "<p>Hello world</p>";
    expect(normalizeYouTubeEmbeds(html)).toBe(html);
  });

  it("should not modify non-YouTube iframes", () => {
    const html = '<iframe src="https://example.com/video" width="500" height="300"></iframe>';
    expect(normalizeYouTubeEmbeds(html)).toBe(html);
  });

  it("should normalize a standard YouTube iframe", () => {
    const html = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>';
    const expected = '<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
    expect(normalizeYouTubeEmbeds(html)).toBe(expected);
  });

  it("should normalize a youtu.be iframe", () => {
    const html = '<iframe src="https://youtu.be/dQw4w9WgXcQ"></iframe>';
    const expected = '<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
    expect(normalizeYouTubeEmbeds(html)).toBe(expected);
  });

  it("should normalize a youtube iframe with extra attributes", () => {
    const html = '<iframe width="560" height="315" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
    const expected = '<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
    expect(normalizeYouTubeEmbeds(html)).toBe(expected);
  });

  it("should normalize multiple YouTube iframes", () => {
    const html = `
      <p>First video:</p>
      <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
      <p>Second video:</p>
      <iframe src="https://www.youtube.com/embed/abcdefghijk"></iframe>
    `;
    const expected = `
      <p>First video:</p>
      <div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
      <p>Second video:</p>
      <div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
    `;
    expect(normalizeYouTubeEmbeds(html)).toBe(expected);
  });

  it("should ignore malformed iframes", () => {
    const html = '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"';
    expect(normalizeYouTubeEmbeds(html)).toBe(html);
  });

  it("should normalize a shorts URL", () => {
    const html = '<iframe src="https://www.youtube.com/shorts/dQw4w9WgXcQ"></iframe>';
    const expected = '<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>';
    expect(normalizeYouTubeEmbeds(html)).toBe(expected);
  });
});
