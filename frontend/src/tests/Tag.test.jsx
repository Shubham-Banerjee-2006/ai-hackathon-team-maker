import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Tag from "../components/Tag";

describe("Tag", () => {
  it("renders its children text", () => {
    render(<Tag>React</Tag>);
    expect(screen.getByText("React")).toBeInTheDocument();
  });

  it("applies the moss/default tone class by default", () => {
    render(<Tag>Python</Tag>);
    expect(screen.getByText("Python")).toHaveClass("bg-ink/5");
  });

  it("applies the gold tone class when requested", () => {
    render(<Tag tone="gold">Healthcare</Tag>);
    expect(screen.getByText("Healthcare")).toHaveClass("bg-gold/10");
  });
});
