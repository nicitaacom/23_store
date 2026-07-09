"use strict";

// Rule: no-inner-component
// Disallow defining functional components or render helper functions (renderXxx) inside other components.
// Normal handlers (handleXxx, onClick, etc.) are allowed.
// This prevents unnecessary re-creations and potential remount issues.
//
// Bad:
//   export const ApplicationCard = memo(function ApplicationCard(...) {
//     const renderButton = (...) => { ... }   // or function renderButton() {}
//   });
//
// Good:
//   function renderButton(showTooltips, onClick, label, borderClass, tooltipText) { ... }
//   export const ApplicationCard = memo(function ApplicationCard(...) {
//     ...
//     {renderButton(showTooltips, ...)}
//   });

function isCapitalized(name) {
  return /^[A-Z]/.test(name);
}

function isRenderHelper(name) {
  return /^render[A-Z]/.test(name);
}

function findEnclosingComponent(node) {
  let current = node.parent;
  while (current) {
    if (current.type === "FunctionDeclaration" && current.id && isCapitalized(current.id.name)) {
      return current.id.name;
    }
    if (current.type === "VariableDeclarator" &&
        current.id.type === "Identifier" &&
        isCapitalized(current.id.name)) {
      return current.id.name;
    }
    if (current.type === "CallExpression" &&
        current.callee.type === "Identifier" &&
        (current.callee.name === "memo" || current.callee.name === "forwardRef")) {
      const arg = current.arguments[0];
      if (arg) {
        if (arg.type === "FunctionExpression" && arg.id && isCapitalized(arg.id.name)) {
          return arg.id.name;
        }
        if (arg.type === "ArrowFunctionExpression" || arg.type === "FunctionExpression") {
          let parent = current.parent;
          while (parent && parent.type !== "VariableDeclarator") {
            parent = parent.parent;
          }
          if (parent && parent.id && parent.id.type === "Identifier" && isCapitalized(parent.id.name)) {
            return parent.id.name;
          }
          return "AnonymousMemoComponent";
        }
      }
    }
    current = current.parent;
  }
  return null;
}

module.exports = {
  "no-inner-component": {
    meta: {
      type: "problem",
      docs: {
        description: "disallow defining functional components or render helpers inside other components",
      },
      schema: [],
      messages: {
        noInnerComponent:
          "Do not define \"{{name}}\" inside component \"{{parent}}\". Hoist the function to module scope above the component (see no-inner-component rule).",
        noInnerRender:
          "Do not define render helper \"{{name}}\" inside component \"{{parent}}\". Declare function renderXxx(...) outside the component.",
      },
    },
    create(context) {
      return {
        FunctionDeclaration(node) {
          if (!node.id) return;
          const name = node.id.name;
          if (/^use[A-Z]/.test(name)) return; // hooks allowed

          const parentComponent = findEnclosingComponent(node);
          if (parentComponent && (isCapitalized(name) || isRenderHelper(name))) {
            context.report({
              node: node.id,
              messageId: isCapitalized(name) ? "noInnerComponent" : "noInnerRender",
              data: { name, parent: parentComponent },
            });
          }
        },

        VariableDeclarator(node) {
          if (node.id.type !== "Identifier" || !node.init) return;

          const name = node.id.name;
          if (/^use[A-Z]/.test(name)) return; // hooks ok

          const isFunction =
            node.init.type === "ArrowFunctionExpression" ||
            node.init.type === "FunctionExpression";

          if (!isFunction) return;

          const shouldFlag = isCapitalized(name) || isRenderHelper(name);
          if (!shouldFlag) return;

          const parentComponent = findEnclosingComponent(node);
          if (parentComponent) {
            context.report({
              node: node.id,
              messageId: isRenderHelper(name) ? "noInnerRender" : "noInnerComponent",
              data: { name, parent: parentComponent },
            });
          }
        },
      };
    },
  },
};
