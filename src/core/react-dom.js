import React from "@/core/react";

const ReactDOM = {
  createRoot(container) {
    return {
      render(el) {
        React.render(el, container);
      },
    };
  },
};

export default ReactDOM;
