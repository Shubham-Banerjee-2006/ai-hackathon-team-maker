import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ScoreMeter from "../components/ScoreMeter";

describe("ScoreMeter", () => {
  it("renders the label and rounded percentage", () => {
    render(<ScoreMeter label="Compatibility" value={0.734} />);
    expect(screen.getByText("Compatibility")).toBeInTheDocument();
    expect(screen.getByText("73")).toBeInTheDocument();
  });

  it("clamps values above 1 to 100%", () => {
    render(<ScoreMeter label="Coverage" value={1.5} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("clamps negative values to 0%", () => {
    render(<ScoreMeter label="Coverage" value={-0.2} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
