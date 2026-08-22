(function () {
  "use strict";
 
  //make variable//
  const expressionEl = document.getElementById("expression");
  const resultEl = document.getElementById("result");
  const keysEl = document.getElementById("keys");
 
  let expression = "";   // raw expression, e.g. "12*4-3"
  let justEvaluated = false;
 
  const OPERATORS = new Set(["+", "-", "*", "/", "^"]);
 
  function updateDisplay() {
    expressionEl.textContent = expression ? formatForDisplay(expression) : "\u00A0";
  }
 
  //make function for replace expression
  function formatForDisplay(expr) {
    return expr
      .replace(/\*/g, "×")
      .replace(/\//g, "÷");
  }
   //make a function for checking ch is no or digit
  function isDigit(ch) {
    return ch >= "0" && ch <= "9";
  }
 
  
  function lastChar() {
    return expression.length ? expression[expression.length - 1] : "";
  }
 
  // ---- Input handlers ----
 
  function appendDigit(digit) {
    if (justEvaluated) {
      expression = "";
      justEvaluated = false;
    }
    expression += digit;
    resultEl.textContent = expression;
    updateDisplay();
  }
 
  function appendDot() {
    if (justEvaluated) {
      expression = "";
      justEvaluated = false;
    }
    // find the current number segment (after the last operator)
    const match = expression.match(/(-?\d*\.?\d*)$/);
    const currentNumber = match ? match[0] : "";
    if (currentNumber.includes(".")) return; // already has a dot
    expression += currentNumber === "" ? "0." : ".";
    resultEl.textContent = expression;
    updateDisplay();
  }
 
  function appendOperator(op) {
    if (expression === "" && op !== "-") return; // can't start with * / ^
    justEvaluated = false;
 
    if (OPERATORS.has(lastChar())) {
      // replace the trailing operator instead of stacking two
      expression = expression.slice(0, -1) + op;
    } else {
      expression += op;
    }
    resultEl.textContent = expression;
    updateDisplay();
  }
 
  function clearAll() {
    expression = "";
    justEvaluated = false;
    resultEl.textContent = "0";
    updateDisplay();
  }
 
  function deleteLast() {
    if (justEvaluated) {
      clearAll();
      return;
    }
    expression = expression.slice(0, -1);
    resultEl.textContent = expression || "0";
    updateDisplay();
  }
 
  function applyPercent() {
    const match = expression.match(/(-?\d*\.?\d+)$/);
    if (!match) return;
    const num = parseFloat(match[0]);
    if (Number.isNaN(num)) return;
    const percentValue = num / 100;
    expression = expression.slice(0, match.index) + percentValue;
    resultEl.textContent = expression;
    updateDisplay();
  }
 
  function equals() {
    if (!expression) return;
    try {
      const value = evaluateExpression(expression);
      resultEl.textContent = formatResult(value);
      expression = String(value);
      justEvaluated = true;
    } catch (err) {
      resultEl.textContent = "Error";
      expression = "";
      justEvaluated = true;
    }
  }
 
  function formatResult(value) {
    if (!Number.isFinite(value)) return "Error";
    // trim floating point noise, keep up to 10 significant digits
    const rounded = parseFloat(value.toPrecision(10));
    return String(rounded);
  }
 
  // ---- Expression evaluation (no eval) ----
  // Tokenize -> Shunting-yard (to RPN) -> evaluate RPN
 
  function tokenize(expr) {
    const tokens = [];
    let i = 0;
 
    while (i < expr.length) {
      const ch = expr[i];
 
      if (ch === " ") {
        i++;
        continue;
      }
 
      if (isDigit(ch) || ch === ".") {
        let numStr = ch;
        i++;
        while (i < expr.length && (isDigit(expr[i]) || expr[i] === ".")) {
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: "number", value: parseFloat(numStr) });
        continue;
      }
 
      if (OPERATORS.has(ch)) {
        // unary minus: at start, or right after another operator
        const prevToken = tokens[tokens.length - 1];
        const isUnaryMinus =
          ch === "-" && (!prevToken || prevToken.type === "operator");
 
        if (isUnaryMinus) {
          let numStr = "-";
          i++;
          while (i < expr.length && (isDigit(expr[i]) || expr[i] === ".")) {
            numStr += expr[i];
            i++;
          }
          tokens.push({ type: "number", value: parseFloat(numStr) });
          continue;
        }
 
        tokens.push({ type: "operator", value: ch });
        i++;
        continue;
      }
 
      throw new Error("Unexpected character: " + ch);
    }
 
    return tokens;
  }
 
  function precedence(op) {
    switch (op) {
      case "+":
      case "-":
        return 1;
      case "*":
      case "/":
        return 2;
      case "^":
        return 3;
      default:
        return 0;
    }
  }
 
  function isRightAssociative(op) {
    return op === "^";
  }
 
  function toRPN(tokens) {
    const output = [];
    const opStack = [];
 
    for (const token of tokens) {
      if (token.type === "number") {
        output.push(token);
        continue;
      }
 
      // operator
      while (
        opStack.length &&
        opStack[opStack.length - 1].type === "operator" &&
        (precedence(opStack[opStack.length - 1].value) > precedence(token.value) ||
          (precedence(opStack[opStack.length - 1].value) === precedence(token.value) &&
            !isRightAssociative(token.value)))
      ) {
        output.push(opStack.pop());
      }
      opStack.push(token);
    }
 
    while (opStack.length) {
      output.push(opStack.pop());
    }
 
    return output;
  }
 
  function evaluateRPN(rpn) {
    const stack = [];
 
    for (const token of rpn) {
      if (token.type === "number") {
        stack.push(token.value);
        continue;
      }
 
      const b = stack.pop();
      const a = stack.pop();
 
      if (a === undefined || b === undefined) {
        throw new Error("Malformed expression");
      }
 
      let outcome;
      switch (token.value) {
        case "+":
          outcome = a + b;
          break;
        case "-":
          outcome = a - b;
          break;
        case "*":
          outcome = a * b;
          break;
        case "/":
          if (b === 0) throw new Error("Division by zero");
          outcome = a / b;
          break;
        case "^":
          outcome = Math.pow(a, b);
          break;
        default:
          throw new Error("Unknown operator: " + token.value);
      }
 
      stack.push(outcome);
    }
 
    if (stack.length !== 1) throw new Error("Malformed expression");
    return stack[0];
  }
 
  function evaluateExpression(expr) {
    const tokens = tokenize(expr);
    if (!tokens.length) throw new Error("Empty expression");
    const rpn = toRPN(tokens);
    return evaluateRPN(rpn);
  }
 
  // ---- Event delegation ----
 
  keysEl.addEventListener("click", function (event) {
    const btn = event.target.closest("button");
    if (!btn) return;
 
    const action = btn.dataset.action;
    const value = btn.dataset.value;
 
    if (action) {
      switch (action) {
        case "clear":
          clearAll();
          break;
        case "delete":
          deleteLast();
          break;
        case "percent":
          applyPercent();
          break;
        case "equals":
          equals();
          break;
        default:
          break;
      }
      return;
    }
 
    if (value === undefined) return;
 
    switch (true) {
      case isDigit(value):
        appendDigit(value);
        break;
      case value === ".":
        appendDot();
        break;
      case OPERATORS.has(value):
        appendOperator(value);
        break;
      default:
        break;
    }
  });
 
  // Optional keyboard support
  document.addEventListener("keydown", function (event) {
    const key = event.key;
 
    if (isDigit(key)) {
      appendDigit(key);
    } else if (key === ".") {
      appendDot();
    } else if (OPERATORS.has(key)) {
      appendOperator(key);
    } else if (key === "Enter" || key === "=") {
      event.preventDefault();
      equals();
    } else if (key === "Backspace") {
      deleteLast();
    } else if (key === "Escape") {
      clearAll();
    } else if (key === "%") {
      applyPercent();
    }
  });
 
  clearAll();
})();