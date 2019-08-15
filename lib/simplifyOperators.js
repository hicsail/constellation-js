if (typeof(window) === 'undefined') {
  graph = require('./graphDataOnEdges');
}

function simplifyTree(parsed) {

  if (parsed.Atom) {
    return parsed;
  } else if (parsed.Or) {
    // simplify Or
    let exp1 = simplifyTree(parsed.Or[0]);
    let exp2 = simplifyTree(parsed.Or[1]);
    return simplifyOr(exp1, exp2);
  } else if (parsed.Then) {
    // simplify Then
    let exp1 = simplifyTree(parsed.Then[0]);
    let exp2 = simplifyTree(parsed.Then[1]);
    return simplifyThen(exp1, exp2);
  } else if (parsed.OneOrMore) {
    // simplify OneOrMore
    let exp = simplifyTree(parsed.OneOrMore[0]);
    return simplifyOneOrMore(exp);
  } else if (parsed.ZeroOrMore) {
    // simplify ZeroOrMore
    let exp = simplifyTree(parsed.ZeroOrMore[0]);
    return simplifyZeroOrMore(exp);
  }
}

function simplifyOr(exp1, exp2) {
  // ... or ...
  if (equalExps(exp1, exp2)) {
    return exp1;
  } else if (exp1.OneOrMore && exp2.OneOrMore && equalExps(exp1.OneOrMore, exp2.OneOrMore)) {
    // one-or-more ... or one-or-more ... --> one-or-more ...
    return exp1;
  } else if (exp1.OneOrMore && exp2.ZeroOrMore && equalExps(exp1.OneOrMore, exp2.ZeroOrMore)) {
    // one-or-more ... or zero-or-more ... --> zero-or-more ...
    return exp2;
  }  else if (exp1.OneOrMore && equalExps(exp1.OneOrMore[0], exp2)) {
    // one-or-more ... or ... --> one-or-more ...
    return exp1;
  } else if (exp2.OneOrMore && equalExps(exp1, exp2.OneOrMore[0])) {
    // ... or one-or-more --> one-or-more ...
    return exp2;
  } else if (exp1.ZeroOrMore && exp2.OneOrMore && equalExps(exp1.ZeroOrMore, exp2.OneOrMore)) {
    // zero-or-more ... or one-or-more ... --> zero-or-more ...
    return exp1;
  } else if (exp1.ZeroOrMore && exp2.ZeroOrMore && equalExps(exp1.ZeroOrMore, exp2.ZeroOrMore)) {
    // zero-or-more ... or zero-or-more ... --> zero-or-more ...
    return exp1;
  } else if (exp1.ZeroOrMore && equalExps(exp1.ZeroOrMore[0], exp2)) {
    // zero-or-more ... or ... --> zero-or-more ...
    return exp1;
  } else if (exp2.ZeroOrMore && equalExps(exp1, exp2.ZeroOrMore[0])) {
    // ... or ZeroOrMore ... --> zero-or-more ...
    return exp2;
  } else {
    return Or(exp1, exp2);
  }
}

function simplifyThen(exp1, exp2) {
  // console.log("exp1 then exp2", JSON.stringify(exp1), "\n", JSON.stringify(exp2));
  if (exp1.OneOrMore && exp2.OneOrMore && equalExps(exp1.OneOrMore, exp2.OneOrMore)) {
    // one-or-more ... then one-or-more ... --> ... then one-or-more ...
    return Then(exp1.OneOrMore, exp2);
  } else if (exp1.OneOrMore && exp2.ZeroOrMore && equalExps(exp1.OneOrMore, exp2.ZeroOrMore)) {
    // one-or-more ... then zero-or-more ... --> one-or-more ...
    return exp1;
  } else if (exp1.ZeroOrMore && exp2.OneOrMore && equalExps(exp1.ZeroOrMore, exp2.OneOrMore)) {
    // zero-or-more ... then one-or-more ... --> one-or-more ...
    return exp2;
  } else if (exp1.ZeroOrMore && exp2.ZeroOrMore && equalExps(exp1.ZeroOrMore, exp2.ZeroOrMore)) {
    // zero-or-more ... then zero-or-more ... --> zero-or-more ...
    return exp1;
  } else if (exp1.ZeroOrMore && equalExps(exp1.ZeroOrMore[0], exp2)) {
    // zero-or-more ... then ... --> one-or-more ...
    return OneOrMore(exp2);
  } else if (exp2.ZeroOrMore && equalExps(exp1, exp2.ZeroOrMore[0])) {
    // atom then zero-or-more atom --> one-or-more atom
    return OneOrMore(exp1);
  }
  return Then(exp1, exp2);
}

function simplifyOneOrMore(exp) {
  // one-or-more(zero-or-more) => zero-or-more
  // one-or-more(one-or-more) => one-or-more
  // hence, we just return inner exp
  if (exp.ZeroOrMore || exp.OneOrMore) {
    return exp;
  } else {
    return OneOrMore(exp);
  }
}

function simplifyZeroOrMore(exp) {
  if (exp.OneOrMore) {
    return ZeroOrMore(exp.OneOrMore[0]);
  } else if (exp.ZeroOrMore) {
    return exp;
  } else {
    return ZeroOrMore(exp);
  }
}

function equalExps(exp1, exp2) {
  // console.log(JSON.stringify(exp1), JSON.stringify(exp2));
  return JSON.stringify(exp1) === JSON.stringify((exp2));
}

function Or(exp1, exp2) {
  return {Or: [exp1, exp2]};
}

function Then(exp1, exp2) {
  return {Then: [exp1, exp2]};
}

function OneOrMore(exp) {
  return {OneOrMore: [exp]};
}

function ZeroOrMore(exp) {
  return {ZeroOrMore: [exp]};
}


if (typeof window === 'undefined') {
  module.exports = {
    simplifyTree
  };
}
