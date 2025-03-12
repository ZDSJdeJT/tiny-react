import { describe, expect, it } from "vitest";

import React from "@/core/react";

describe("createElement", () => {
  it("should return vdom", () => {
    const el = React.createElement("div", { id: "app" }, "hi");
    expect(el).toMatchInlineSnapshot(`
      {
        "props": {
          "children": [
            {
              "props": {
                "children": [],
                "nodeValue": "hi",
              },
              "type": "TEXT_ELEMENT",
            },
          ],
          "id": "app",
        },
        "type": "div",
      }
    `);
  });
});
