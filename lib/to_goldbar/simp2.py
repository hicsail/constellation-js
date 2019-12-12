from start_with_dict import Exp, Or, Then, ZeroOrMore, OneOrMore, ZeroOrOne
import copy


# simplifies Then expressions
def simplify_then(exp1, exp2):
	# if the first expression of the Then is a OneOrMore
	if exp1.exp_type == "OneOrMore":
		# if Exp is second
		if exp2.exp_type == "Exp":
			# case of "OneM(a) then nothing"
			if exp2.name == "e":
				return exp1
			# case of "OneM(a) then a"
			elif exp2 == exp1.exp:
				return exp1
		# if the second part is an or-more
		elif exp1.exp == exp2.exp:
			# case of "OneM(a) then OneM(a)"
			if exp2.exp_type == "OneOrMore":
				return Then([exp1.exp, OneOrMore(exp1.exp)])
			# case of "OneM(a) then ZeroM(a)"
			elif exp2.exp_type == "ZeroOrMore":
				return OneOrMore(exp1.exp)
			# case of "OneM(a) then ZeroOne(a)"
			elif exp2.exp_type == "ZeroOrOne":
				return OneOrMore(exp1.exp)

	# if the first expression of the Then is a ZeroOrMore
	if exp1.exp_type == "ZeroOrMore":
		# print(exp1)
		# print(exp2)
		# if Exp is second
		if exp2.exp_type == "Exp":
			# case of "ZeroM(a) then nothing"
			if exp2.name == "e":
				return exp1
			# case of "ZeroM(a) then a"
			elif exp2 == exp1.exp:
				return OneOrMore(exp2)
		elif exp2.exp_type != "Or" and exp2.exp_type != "Then":
			# if the second part is an or-more
			if exp1.exp == exp2.exp:
				# case of "ZeroM(a) then OneM(a)"
				if exp2.exp_type == "OneOrMore":
					return OneOrMore(exp1.exp)
				# case of "ZeroM(a) then ZeroM(a)"
				elif exp2.exp_type == "ZeroOrMore":
					return ZeroOrMore(exp1.exp)
				# case of "ZeroM(a) then ZeroOne(a)"
				elif exp2.exp_type == "ZeroOrOne":
					return ZeroOrMore(exp1.exp)
		
	# if the first expression of the Then is a ZeroOrOne
	if exp1.exp_type == "ZeroOrOne":
		# if Exp is second
		if exp2.exp_type == "Exp":
			# case of "ZeroOne(a) then nothing"
			if exp2.name == "e":
				return exp1
		# if the second part is an or-more
		elif exp1.exp == exp2.exp:
			# case of "ZeroOne(a) then OneM(a)"
			if exp2.exp_type == "OneOrMore":
				return OneOrMore(exp1.exp)
			# case of "ZeroOne(a) then ZeroM(a)"
			elif exp2.exp_type == "ZeroOrMore":
				return ZeroOrMore(exp1.exp)

	# if the first expression of the Then is an Exp
	if exp1.exp_type == "Exp":
		# case of "nothing then something"
		if exp1.name == "e":
			return exp2
		elif exp2.exp_type == "Exp":
			if exp2.name == "e":
				return exp1
		# case of "a then something(a)"
		elif exp2.exp_type == "OneOrMore":
			# case of "a then OneM(a)"
			if exp2.exp == exp1:
				return exp2
		elif exp2.exp_type == "ZeroOrMore":
			# case of "a then ZeroM(a)"
			if exp2.exp == exp1:
				return OneOrMore(exp1)
			
	return [exp1, exp2]


def find_matching_then_entries(then1, then2):
	length = min(len(then1.exps), len(then2.exps))

	idx = -1
	for i in range(length):
		if then1.exps[i] == then2.exps[i]:
			idx = i
	return idx


# simplifies Or expressions
def simplify_or(exp1, exp2):
	# if the first expression of the Or is a OneOrMore
	if exp1.exp_type == "OneOrMore":
		# if Exp is second
		if exp2.exp_type == "Exp":
			# case of "OneM(a) or nothing"
			if exp2.name == "e":
				return ZeroOrMore(exp1.exp)
			# case of "OneM(a) or a"
			elif exp2 == exp1.exp:
				return exp1
		# if the second expression is a Then
		elif exp2.exp_type == "Then":
			# case of OneM(a) or (OneM(a) then b)
			if len(exp2.exps) == 2 and exp2.exps[0] == exp1:
				return Then([exp1, ZeroOrMore(exp2.exps[1])])
		# if second part is an or-more
		elif exp2.exp_type == "OneOrMore":
			# case of "OneM(a) or OneM(a)"
			if exp1.exp == exp2.exp:
				return OneOrMore(exp1.exp)
		elif exp2.exp_type == "ZeroOrMore":
			# case of "OneM(a) or ZeroM(a)"
			if exp1.exp == exp2.exp:
				return ZeroOrMore(exp1.exp)
		elif exp2.exp_type == "ZeroOrOne":
			# case of "OneM(a) or ZeroOne(a)"
			if exp1.exp == exp2.exp:
				return ZeroOrMore(exp1.exp)

	# if the first expression of the Or is a ZeroOrMore
	if exp1.exp_type == "ZeroOrMore":
		# if Exp is second
		if exp2.exp_type == "Exp":
			# case of "ZeroM(a) or nothing"
			if exp2.name == "e":
				return exp1
		# if second part is an or-more
		elif exp2.exp_type == "OneOrMore":
			# case of "ZeroM(a) or OneM(a)"
			if exp1.exp == exp2.exp:
				return ZeroOrMore(exp1.exp)			
		elif exp2.exp_type == "ZeroOrMore":
			# case of "ZeroM(a) or ZeroM(a)"
			if exp1.exp == exp2.exp:
				return ZeroOrMore(exp1.exp)
		elif exp2.exp_type == "ZeroOrOne":
			# case of "ZeroM(a) or ZeroOne(a)"
			if exp1.exp == exp2.exp:
				return ZeroOrMore(exp1.exp)
		
	# if the first expression of the Or is a ZeroOrOne
	if exp1.exp_type == "ZeroOrOne":
		# if Exp is second
		if exp2.exp_type == "Exp":
			# case of "ZeroOne(a) or nothing"
			if exp2.name == "e":
				return exp1
			# case of "ZeroOne(a) or a"
			elif exp2 == exp1.exp:
				return exp1
		# if second part is an or-more
		elif exp2.exp_type == "OneOrMore":
			# case of "ZeroOne(a) or OneM(a)"
			if exp1.exp == exp2.exp:
				return ZeroOrMore(exp1.exp)			
		elif exp2.exp_type == "ZeroOrMore":
			# case of "ZeroOne(a) or ZeroM(a)"
			if exp1.exp == exp2.exp:
				return ZeroOrMore(exp1.exp)
		elif exp2.exp_type == "ZeroOrOne":
			# case of "ZeroOne(a) or ZeroOne(a)"
			if exp1.exp == exp2.exp:
				return ZeroOrOne(exp1.exp)

	# if the first expression of the Or is an Exp
	if exp1.exp_type == "Exp":
		# case of "nothing or something"
		if exp1.name == "e":
			return ZeroOrOne(exp2)
		elif exp2.exp_type == "Exp":
			# case of "a or nothing"
			if exp2.name == "e":
				return ZeroOrOne(exp1)
			# case of "a or a"
			elif exp2.name == exp1.name:
				return exp1
		elif exp2.exp_type == "OneOrMore":
			# case of "a or OneOrMore(a)"
			if exp2.exp == exp1:
				return exp2
		elif exp2.exp_type == "ZeroOrOne":
			# case of "a or ZeroOrOne(a)"
			if exp2.exp == exp1:
				return exp2
		elif exp2.exp_type == "ZeroOrMore":
			# case of "a or ZeroOrMore(a)"
			if exp2.exp == exp1:
				return exp2


	# if the first expression is a Then (to simplify (a then b) or (a then c))
	if exp1.exp_type == "Then" and exp2.exp_type == "Then":
		if exp1.exps[0] == exp2.exps[0] and len(exp1.exps)==2 and len(exp2.exps)==2:
			return Then([exp1.exps[0]]+[Or(exp1.exps[1:]+exp2.exps[1:])])
	
	return [exp1, exp2]


def simplify_one_more(one_more):
	if one_more.exp.exp_type == "Exp":
		if one_more.exp.name == "e":
			return Exp("e")
	elif one_more.exp.exp_type == "OneOrMore":
		return OneOrMore(one_more.exp.exp)
	elif one_more.exp.exp_type == "ZeroOrMore":
		return ZeroOrMore(one_more.exp.exp)
	elif one_more.exp.exp_type == "ZeroOrOne":
		return ZeroOrMore(one_more.exp.exp)
	elif one_more.exp.exp_type == "Or":
		return simplify_or_helper(one_more.exp)
	elif one_more.exp.exp_type == "Then":
		return simplify_then_helper(one_more.exp)
	return one_more


def simplify_zero_more(zero_more):
	if zero_more.exp.exp_type == "Exp":
		if zero_more.exp.name == "e":
			return Exp("e")
	elif zero_more.exp.exp_type == "OneOrMore":
		return ZeroOrMore(zero_more.exp.exp)
	elif zero_more.exp.exp_type == "ZeroOrMore":
		return ZeroOrMore(zero_more.exp.exp)
	elif zero_more.exp.exp_type == "ZeroOrOne":
		return ZeroOrMore(zero_more.exp.exp)
	elif zero_more.exp.exp_type == "Or":
		return simplify_or_helper(zero_more.exp)
	elif zero_more.exp.exp_type == "Then":
		return simplify_then_helper(zero_more.exp)
	return zero_more


def simplify_zero_one(zero_one):
	if zero_one.exp.exp_type == "Exp":
		if zero_one.exp.name == "e":
			return Exp("e")
	elif zero_one.exp.exp_type == "OneOrMore":
		return ZeroOrMore(zero_one.exp.exp)
	elif zero_one.exp.exp_type == "ZeroOrMore":
		return ZeroOrMore(zero_one.exp.exp)
	elif zero_one.exp.exp_type == "ZeroOrOne":
		return ZeroOrOne(zero_one.exp.exp)
	elif zero_one.exp.exp_type == "Or":
		return simplify_or_helper(zero_one.exp)
	elif zero_one.exp.exp_type == "Then":
		return simplify_then_helper(zero_one.exp)
	return zero_one


def simplify_or_helper(or_exp):
	for i in range(len(or_exp.exps)):
		or_exp.exps[i] = simplify_helper(or_exp.exps[i])

		# print(root.exps)
	changed = {}
	for i in range(len(or_exp.exps)):
		for j in range(i, len(or_exp.exps)):
			if i == j:
				continue
			parts = simplify_or(or_exp.exps[i], or_exp.exps[j])
			if type(parts) != list:
				if i not in changed:
					changed[i] = (j, parts)
			else:
				if i in changed:
					del changed[i]

	omit = []
	new_parts = []
	for x in range(len(or_exp.exps)):
		if x in changed:
			if x not in omit:
				omit += [x]
			if changed[x][0] not in omit:
				omit += [changed[x][0]]
			new_parts += [changed[x][1]]
		else:
			if x in omit:
				continue
			else:
				new_parts += [or_exp.exps[x]]

	ret = Exp("e")

	if len(new_parts) == 0:
		ret = Exp("e")
	elif len(new_parts) == 1:
		ret = new_parts[0]
	else:
		ret = Or(new_parts)

	return ret


def simplify_then_helper(then_exp):
	# if len(root.exps) == 1 and root.exps[0].exp_type == "Exp":
	# 	return root.exps[0]
	for i in range(len(then_exp.exps)):
		then_exp.exps[i] = simplify_helper(then_exp.exps[i])

	# print(root.exps)
	changed = {}
	# for i, j in root.exps:
	for i, j in zip(range(len(then_exp.exps)-1), range(1, len(then_exp.exps))):
		parts = simplify_then(then_exp.exps[i], then_exp.exps[j])
		if type(parts) != list:
			changed[(i,j)] = parts
		else:
			if (i, j) in changed:
				del changed[i, j]

	new_parts = []
	k = 0
	while k < len(then_exp.exps):
		if (k, k+1) in changed:
			new_parts += [changed[k, k+1]]
			k += 2
		else:
			new_parts += [then_exp.exps[k]]
			k += 1

	ret = Exp("e")

	if len(new_parts) == 0:
		ret = Exp("e")
	elif len(new_parts) == 1:
		ret = new_parts[0]
	else:
		ret = Then(new_parts)

	return ret


def simplify_helper(root):
	# print(root)
	if root.exp_type == "Exp":
		return root

	elif root.exp_type == "OneOrMore":
		root.exp = simplify_helper(root.exp)
		root = simplify_one_more(root)
		# print("--- AFTER OneM --- ", root)
		return root

	elif root.exp_type == "ZeroOrMore":
		root.exp = simplify_helper(root.exp)
		root = simplify_zero_more(root)
		# print("--- AFTER ZM --- ", root)
		return root

	elif root.exp_type == "ZeroOrOne":
		root.exp = simplify_helper(root.exp)
		root = simplify_zero_one(root)
		# print("--- AFTER ZOne --- ", root)
		return root


	elif root.exp_type == "Or":
		return simplify_or_helper(root)

	elif root.exp_type == "Then":
		return simplify_then_helper(root)


	else:
		return root



def simplify_regex(root):
	new_root = simplify_helper(copy.deepcopy(root))
	count = 0
	while new_root != root:
		# print("iteration # ", count)
		root = new_root
		new_root = simplify_helper(copy.deepcopy(root))
		count += 1

	return new_root

