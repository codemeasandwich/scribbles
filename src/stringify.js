

function getOwnEnumPropSymbols (object) {
	return Object
    .getOwnPropertySymbols(object)
    .filter((keySymbol) => Object.prototype.propertyIsEnumerable.call(object, keySymbol));
}

function isRegexp(value) {
	return toString.call(value) === '[object RegExp]';
}

function isObject(value) {
	const type = typeof value;
	return value !== null && (type === 'object' || type === 'function');
}

function getObjName(val){
  if(val.constructor
  && "Object" !== val.constructor.name){
    return val.constructor.name + " "
  }
  return ""
} // END getObjName

module.exports = function stringify(input, options, pad) {
	const seen = [];
//console.log(input)
	return (function stringify(input, options = {}, pad = '',name="") {
		const indent = options.indent || '\t';
    		const currentDepth = options.depth ? pad.split(indent).length : null
		let tokens;
		if (options.inlineCharacterLimit === undefined) {
			tokens = {
				newline: '\n',
				newlineOrSpace: '\n',
				pad,
				indent: pad + indent,
			};
		} else {
			tokens = {
				newline: '@@__STRINGIFY_OBJECT_NEW_LINE__@@',
				newlineOrSpace: '@@__STRINGIFY_OBJECT_NEW_LINE_OR_SPACE__@@',
				pad: '@@__STRINGIFY_OBJECT_PAD__@@',
				indent: '@@__STRINGIFY_OBJECT_INDENT__@@',
			};
		}

		const expandWhiteSpace = (string, reGenArrayWithIndexs) => {
			if (options.inlineCharacterLimit === undefined) {
				return string;
			}

			const oneLined = string
				.replace(new RegExp(tokens.newline, 'g'), '')
				.replace(new RegExp(tokens.newlineOrSpace, 'g'), ' ')
				.replace(new RegExp(tokens.pad + '|' + tokens.indent, 'g'), '');

			if (oneLined.length <= options.inlineCharacterLimit) {
				return oneLined;
			}

			return (reGenArrayWithIndexs ? reGenArrayWithIndexs() : string)
				.replace(new RegExp(tokens.newline + '|' + tokens.newlineOrSpace, 'g'), '\n')
				.replace(new RegExp(tokens.pad, 'g'), pad)
				.replace(new RegExp(tokens.indent, 'g'), pad + indent);
		}; // END expandWhiteSpace

		if (seen.includes(input)) {
			if (Array.isArray(input)) {
                return '[ ...! ]';
            }
			return `{ ...${getObjName(input)||"!"} }`;
		}

		if (
			input === null
			|| input === undefined
			|| typeof input === 'number'
			|| typeof input === 'boolean'
		//	|| typeof input === 'function'
			|| typeof input === 'symbol'
			|| isRegexp(input)
		) {
			return String(input);
		}
		if("function" === typeof input){
			const [start]   = input.toString().split(")");
			const isArrow   = ! start.includes("function")
			const [nameA,argsB] = start.replace("function",'')
									 .replace(/ /g,'')
									 .split("(")

			  let realName = name

			  if(isArrow){
				if(realName !=input.name)
				  realName = input.name
				else
				  realName = ""
			  } else {
				if(realName === input.name)
				  realName = "ƒ"
				else
				  realName = input.name
			  }

			  return `${realName}(${argsB})${
				isArrow?"=>":""
			  }{-}`
		  }
		if (input instanceof Error) {
			return `${input.name}("${input.message}")`
		}
		if (input instanceof Date) {
			return `Date(${input.toJSON()})`;
		}
		if( Buffer.isBuffer(input)){
			return `Buffer[ ${Array.from(input).join()} ]`;
		}

		if (Array.isArray(input)
		|| input instanceof Set) {

      let typeOfObj = ""
      if(input instanceof Set){
				typeOfObj = "Set"
				input = Array.from(input.values())
      }

			if (input.length === 0) {
				return typeOfObj+'[ ]';
			}
		    if(currentDepth > options.depth){
			return typeOfObj+'[ + ]';
		      }
			seen.push(input);

			const doWork = (addIndexs)=>{
				return `${typeOfObj}[ ` + tokens.newline + input.map((element, i) => {
					const eol = input.length - 1 === i ?       tokens.newline
													   : ',' + tokens.newlineOrSpace;

					let value = stringify(element, options, pad + indent);
					if (options.transform) {
						value = options.transform(input, i, value);
					}

					return tokens.indent + (addIndexs ? i+":" : "")+value + eol;
				}).join('') + tokens.pad + (tokens.pad.includes(" ") ? "" : " ") +']';
			}

			const returnValue = doWork()
			seen.pop();

			return expandWhiteSpace(returnValue,()=>doWork(true));
		}

		if (isObject(input)) {
			let objectKeys = [], getVal = (key)=>input[key], typeOfObj = getObjName(input)
		  if(input instanceof Map){
				getVal = (key)=>input.get(key)
				objectKeys = Array.from(input.keys())
				typeOfObj = "Map"
		  } else {
				//typeOfObj = getObjName(input)
				objectKeys = [
				 ...Object.keys(input),
				 ...getOwnEnumPropSymbols(input),
			       ];
				 if("Promise" === typeOfObj.trim()){
					 ["then","catch","finally"].forEach( key => {
					 	if("function" === typeof input[key]){
							objectKeys.push(key)
						}
					 })
	      }
			}

			if (options.filter) {
				// eslint-disable-next-line unicorn/no-array-callback-reference, unicorn/no-array-method-this-argument
				objectKeys = objectKeys.filter(element => options.filter(input, element));
			}

			if (objectKeys.length === 0) {
				return typeOfObj+'{ }';
			}
			   if(currentDepth > options.depth){
				return typeOfObj+'{ + }';
			      }
			seen.push(input);

			const returnValue = `${typeOfObj}{ ` + tokens.newline + objectKeys.map((element, i) => {
				const eol = objectKeys.length - 1 === i ? tokens.newline : ',' + tokens.newlineOrSpace;
				const isSymbol = typeof element === 'symbol';
				const isClassic = !isSymbol && /^[a-z$_][$\w]*$/i.test(element);
				const key = isSymbol || isClassic ? element : stringify(element, options);

				let value = stringify(getVal(element), options, pad + indent,key);
				if (options.transform) {
					value = options.transform(input, element, value);
				}

				return tokens.indent + String(key) + ':' + value + eol;
			}).join('') + tokens.pad + (tokens.pad.includes(" ") ? "" : " ") +'}';

			seen.pop();

			return expandWhiteSpace(returnValue);
		}

		input = input.replace(/\\/g, '\\\\');
		input = String(input).replace(/[\r\n]/g, x => x === '\n' ? '\\n' : '\\r');

		if (options.singleQuotes === false) {
			input = input.replace(/"/g, '\\"');
			return `"${input}"`;
		}

		input = input.replace(/'/g, '\\\'');
		return `'${input}'`;
	})(input, options, pad);
}
