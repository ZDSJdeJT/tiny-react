const TEXT_ELEMENT = "TEXT_ELEMENT";

const UPDATE_EFFECT_TAG = "update";
const UPDATE_PLACEMENT_TAG = "placement";

let nextWorkOfUnit = null;
// Work in progress
let wipRoot = null,
  wipFiber = null;
let currentRoot = null;
const deletions = [];
let stateHooks = null;
let stateIndex = null;
let effectHooks = null;

const isFunction = (arg) => typeof arg === "function";

const isTextNode = (node) => {
  const type = typeof node;
  return type === "string" || type === "number";
};
const isFunctionComponent = (fiber) => isFunction(fiber.type);

const createTextNode = (text) => ({
  type: TEXT_ELEMENT,
  props: {
    nodeValue: text,
    children: [],
  },
});

const createElement = (type, props, ...children) => ({
  type,
  props: {
    ...props,
    children: children.map((child) =>
      isTextNode(child) ? createTextNode(child) : child,
    ),
  },
});

const createDOM = (type) =>
  type === TEXT_ELEMENT
    ? document.createTextNode("")
    : document.createElement(type);

const updateProps = (dom, nextProps, prevProps) => {
  // 删除已经不存在的属性
  Object.entries(prevProps).forEach(([key, value]) => {
    if (key === "children") {
      return;
    }
    if (!(key in nextProps)) {
      if (key.startsWith("on")) {
        const eventType = key.slice(2).toLowerCase();
        dom.removeEventListener(eventType, value);
      } else {
        dom.removeAttribute(key);
      }
    }
  });
  // 修改或添加新属性
  Object.entries(nextProps).forEach(([key, value]) => {
    if (key === "children") {
      return;
    }
    if (value !== prevProps[key]) {
      if (key.startsWith("on")) {
        const eventType = key.slice(2).toLowerCase();
        if (key in prevProps) {
          dom.removeEventListener(eventType, prevProps[key]);
        }
        dom.addEventListener(eventType, value);
      } else {
        dom[key] = value;
      }
    }
  });
};

const reconcileChildren = (fiber, children) => {
  let oldFiber = fiber.alternate ? fiber.alternate.child : null;
  let prevChild = null;
  children.forEach((child, index) => {
    let newFiber = null;
    if (oldFiber && oldFiber.type === child.type) {
      newFiber = {
        type: child.type,
        props: child.props,
        child: null,
        parent: fiber,
        sibling: null,
        dom: oldFiber.dom,
        effectTag: UPDATE_EFFECT_TAG,
        alternate: oldFiber,
      };
    } else {
      if (child) {
        newFiber = {
          type: child.type,
          props: child.props,
          child: null,
          parent: fiber,
          sibling: null,
          dom: null,
          effectTag: UPDATE_PLACEMENT_TAG,
        };
      }
      if (oldFiber) {
        deletions.push(oldFiber);
      }
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    if (index === 0) {
      fiber.child = newFiber;
    } else {
      // 兄弟节点
      prevChild.sibling = newFiber;
    }
    if (newFiber) {
      prevChild = newFiber;
    }
  });
  // 删除多余节点
  while (oldFiber) {
    deletions.push(oldFiber);
    oldFiber = oldFiber.sibling;
  }
};

const updateFunctionComponent = (fiber) => {
  stateHooks = [];
  stateIndex = 0;
  effectHooks = [];
  wipFiber = fiber;
  reconcileChildren(fiber, [fiber.type(fiber.props)]);
};

const updateHostComponent = (fiber) => {
  if (!fiber.dom) {
    // 创建 dom
    const dom = (fiber.dom = createDOM(fiber.type));
    // 处理 props
    updateProps(dom, fiber.props, Object.create(null));
  }
  reconcileChildren(fiber, fiber.props.children);
};

const performWorkOfUnit = (fiber) => {
  if (isFunctionComponent(fiber)) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }
  // 返回下一个要执行的任务
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
};

const commitWork = (fiber) => {
  if (!fiber) {
    return;
  }
  let fiberParent = fiber.parent;
  while (!fiberParent.dom) {
    fiberParent = fiberParent.parent;
  }
  if (fiber.effectTag === UPDATE_EFFECT_TAG && fiber.dom) {
    updateProps(
      fiber.dom,
      fiber.props,
      fiber.alternate ? fiber.alternate.props : Object.create(null),
    );
  } else if (fiber.effectTag === UPDATE_PLACEMENT_TAG) {
    if (fiber.dom) {
      fiberParent.dom.append(fiber.dom);
    }
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
};

const commitDeletion = (fiber) => {
  if (fiber.dom) {
    let fiberParent = fiber.parent;
    while (!fiberParent.dom) {
      fiberParent = fiberParent.parent;
    }
    fiberParent.dom.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child);
  }
};

const commitEffectHooks = () => {
  const run = (fiber) => {
    if (!fiber) {
      return;
    }
    if (fiber.alternate) {
      // 更新阶段
      fiber.effectHooks?.forEach((newHook, index) => {
        if (newHook.deps.length === 0) {
          return;
        }
        // 判断 deps 是否改变
        const oldEffectHook = fiber.alternate.effectHooks[index];
        const needUpdate = oldEffectHook.deps.some(
          (oldDep, idx) => oldDep !== newHook.deps[idx],
        );
        if (needUpdate) {
          newHook.cleanup = newHook.callback();
        }
      });
    } else {
      // 初始化阶段
      fiber.effectHooks?.forEach((hook) => {
        hook.cleanup = hook.callback();
      });
    }
    run(fiber.child);
    run(fiber.sibling);
  };
  const runCleanup = (fiber) => {
    if (!fiber) {
      return;
    }
    // 执行之前节点的清理函数
    fiber.alternate?.effectHooks?.forEach((hook) => {
      if (hook.deps.length === 0) {
        return;
      }
      hook?.cleanup?.();
    });
    runCleanup(fiber.child);
    runCleanup(fiber.sibling);
  };
  runCleanup(wipRoot);
  run(wipRoot);
};

const commitRoot = () => {
  deletions.forEach(commitDeletion);
  commitWork(wipRoot.child);
  commitEffectHooks();
  currentRoot = wipRoot;
  wipRoot = null;
  deletions.length = 0;
};

const workLoop = (deadline) => {
  let shouldYield = false;
  while (!shouldYield && nextWorkOfUnit) {
    nextWorkOfUnit = performWorkOfUnit(nextWorkOfUnit);
    if (wipRoot?.sibling?.type === nextWorkOfUnit?.type) {
      nextWorkOfUnit = null;
      break;
    }
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextWorkOfUnit && wipRoot) {
    commitRoot();
  }
  if (nextWorkOfUnit && !wipRoot) {
    wipRoot = currentRoot;
  }
  requestIdleCallback(workLoop);
};

const render = (el, container = document.body) => {
  wipRoot = {
    dom: container,
    props: {
      children: [el],
    },
  };
  nextWorkOfUnit = wipRoot;
  requestIdleCallback(workLoop);
};

const useState = (initial) => {
  const currentFiber = wipFiber;
  const oldHooks = currentFiber.alternate
    ? currentFiber.alternate.stateHooks
    : null;
  const stateHook = oldHooks
    ? {
        state: oldHooks[stateIndex].state,
        queue: oldHooks[stateIndex].queue,
      }
    : {
        state: initial,
        queue: [],
      };
  stateHook.queue.forEach((action) => {
    stateHook.state = action(stateHook.state);
  });
  stateHook.queue.length = 0;
  stateIndex++;
  stateHooks.push(stateHook);
  currentFiber.stateHooks = stateHooks;
  const setState = (action) => {
    // 提前检测状态是否发生变化
    if (isFunction(action)) {
      if (action(stateHook.state) === stateHook.state) {
        return;
      }
      stateHook.queue.push(action);
    } else {
      if (action === stateHook.state) {
        return;
      }
      stateHook.queue.push(() => action);
    }
    wipRoot = {
      ...currentFiber,
      alternate: currentFiber,
    };
    nextWorkOfUnit = wipRoot;
  };
  return [stateHook.state, setState];
};

const useEffect = (callback, deps = []) => {
  const effectHook = {
    callback,
    deps,
    cleanup: null,
  };
  effectHooks.push(effectHook);
  wipFiber.effectHooks = effectHooks;
};

const React = {
  createTextNode,
  createElement,
  render,
  useState,
  useEffect,
};

export default React;
