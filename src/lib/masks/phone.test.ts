import { describe, expect, it } from "vitest";
import { maskPhone } from "./phone";

describe("maskPhone", () => {
  it("formats as the digits come in", () => {
    expect(maskPhone("")).toBe("");
    expect(maskPhone("1")).toBe("(1");
    expect(maskPhone("119")).toBe("(11) 9");
    expect(maskPhone("1198765")).toBe("(11) 9876-5");
    expect(maskPhone("1134567890")).toBe("(11) 3456-7890");
    expect(maskPhone("11987654321")).toBe("(11) 98765-4321");
    expect(maskPhone("(11) 98765-43219")).toBe("(11) 98765-4321");
  });

  it("drops a pasted country code or trunk 0", () => {
    expect(maskPhone("+55 11 98765-4321")).toBe("(11) 98765-4321");
    expect(maskPhone("5511987654321")).toBe("(11) 98765-4321");
    expect(maskPhone("+55 11 3456-7890")).toBe("(11) 3456-7890");
    expect(maskPhone("011 98765-4321")).toBe("(11) 98765-4321");
    // An area code that happens to be 55 (Rio Grande do Sul) stays.
    expect(maskPhone("55987654321")).toBe("(55) 98765-4321");
  });
});
