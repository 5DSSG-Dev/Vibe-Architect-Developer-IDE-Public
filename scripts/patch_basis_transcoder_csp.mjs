import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const targetPath = resolve(process.cwd(), process.argv[2] ?? 'public/basis/basis_transcoder.js');
const invokerMarker = '/* AEGIS strict-CSP Embind invoker: no generated JavaScript. */';
const methodCallerMarker = '/* AEGIS strict-CSP Embind method caller: no generated JavaScript. */';
const globalMarker = '/* AEGIS strict-CSP global lookup: no Function-constructor fallback. */';
const original = 'function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc,isAsync){var argCount=argTypes.length;if(argCount<2){throwBindingError("argTypes array size mismatch! Must at least get return value and \'this\' types!")}var isClassMethodFunc=argTypes[1]!==null&&classType!==null;var needsDestructorStack=usesDestructorStack(argTypes);var returns=argTypes[0].name!=="void";var closureArgs=[humanName,throwBindingError,cppInvokerFunc,cppTargetFunc,runDestructors,argTypes[0],argTypes[1]];for(var i=0;i<argCount-2;++i){closureArgs.push(argTypes[i+2])}if(!needsDestructorStack){for(var i=isClassMethodFunc?1:2;i<argTypes.length;++i){if(argTypes[i].destructorFunction!==null){closureArgs.push(argTypes[i].destructorFunction)}}}let[args,invokerFnBody]=createJsInvoker(argTypes,isClassMethodFunc,returns,isAsync);args.push(invokerFnBody);var invokerFn=newFunc(Function,args)(...closureArgs);return createNamedFunction(humanName,invokerFn)}';
const replacement = `${invokerMarker}function craftInvokerFunction(humanName,argTypes,classType,cppInvokerFunc,cppTargetFunc,isAsync){var argCount=argTypes.length;if(argCount<2){throwBindingError("argTypes array size mismatch! Must at least get return value and 'this' types!")}var isClassMethodFunc=argTypes[1]!==null&&classType!==null;var needsDestructorStack=usesDestructorStack(argTypes);var returns=argTypes[0].name!=="void";var invokerFn=function(...args){if(args.length!==argCount-2){throwBindingError("function "+humanName+" called with "+args.length+" arguments, expected "+(argCount-2))}var destructors=needsDestructorStack?[]:null;var wired=[];if(isClassMethodFunc){wired.push(argTypes[1].toWireType(destructors,this))}for(var i=0;i<args.length;++i){wired.push(argTypes[i+2].toWireType(destructors,args[i]))}var rv=cppInvokerFunc(cppTargetFunc,...wired);if(needsDestructorStack){runDestructors(destructors)}else{for(var i=isClassMethodFunc?1:2;i<argTypes.length;++i){var type=argTypes[i];if(type.destructorFunction!==null){var wiredIndex=isClassMethodFunc?i-1:i-2;type.destructorFunction(wired[wiredIndex])}}}if(returns){return argTypes[0].fromWireType(rv)}};return createNamedFunction(humanName,invokerFn)}`;
const originalMethodCaller = 'var __emval_get_method_caller=(argCount,argTypes,kind)=>{var types=emval_lookupTypes(argCount,argTypes);var retType=types.shift();argCount--;var functionBody=`return function (obj, func, destructorsRef, args) {\\n`;var offset=0;var argsList=[];if(kind===0){argsList.push("obj")}var params=["retType"];var args=[retType];for(var i=0;i<argCount;++i){argsList.push("arg"+i);params.push("argType"+i);args.push(types[i]);functionBody+=`  var arg${i} = argType${i}.readValueFromPointer(args${offset?"+"+offset:""});\\n`;offset+=types[i]["argPackAdvance"]}var invoker=kind===1?"new func":"func.call";functionBody+=`  var rv = ${invoker}(${argsList.join(", ")});\\n`;if(!retType.isVoid){params.push("emval_returnValue");args.push(emval_returnValue);functionBody+="  return emval_returnValue(retType, destructorsRef, rv);\\n"}functionBody+="};\\n";params.push(functionBody);var invokerFunction=newFunc(Function,params)(...args);var functionName=`methodCaller<(${types.map(t=>t.name).join(", ")}) => ${retType.name}>`;return emval_addMethodCaller(createNamedFunction(functionName,invokerFunction))}';
const methodCallerReplacement = `${methodCallerMarker}var __emval_get_method_caller=(argCount,argTypes,kind)=>{var types=emval_lookupTypes(argCount,argTypes);var retType=types.shift();argCount--;var invokerFunction=function(obj,func,destructorsRef,args){var offset=0;var values=[];for(var i=0;i<argCount;++i){values.push(types[i].readValueFromPointer(args+offset));offset+=types[i]["argPackAdvance"]}var rv=kind===1?Reflect.construct(func,values):func.call(obj,...values);if(!retType.isVoid){return emval_returnValue(retType,destructorsRef,rv)}};var functionName=\`methodCaller<(\${types.map(t=>t.name).join(", ")}) => \${retType.name}>\`;return emval_addMethodCaller(createNamedFunction(functionName,invokerFunction))}`;
const originalGlobalLookup = 'var emval_get_global=()=>{if(typeof globalThis=="object"){return globalThis}return function(){return Function}()("return this")()}';
const globalLookupReplacement = `${globalMarker}var emval_get_global=()=>globalThis`;

let source = await readFile(targetPath, 'utf8');
if (!source.includes(invokerMarker)) {
  const occurrences = source.split(original).length - 1;
  if (occurrences !== 1) throw new Error(`Expected one official Three.js Embind invoker, found ${occurrences}`);
  source = source.replace(original, replacement);
}
if (!source.includes(methodCallerMarker)) {
  const occurrences = source.split(originalMethodCaller).length - 1;
  if (occurrences !== 1) throw new Error(`Expected one official Three.js Embind method caller, found ${occurrences}`);
  source = source.replace(originalMethodCaller, methodCallerReplacement);
}
if (!source.includes(globalMarker)) {
  const occurrences = source.split(originalGlobalLookup).length - 1;
  if (occurrences !== 1) throw new Error(`Expected one official Three.js Function-constructor global fallback, found ${occurrences}`);
  source = source.replace(originalGlobalLookup, globalLookupReplacement);
}
if (source.includes('newFunc(Function,args)') || source.includes('newFunc(Function,params)')) {
  throw new Error('Basis wrapper still contains a generated-function call site');
}
if (source.includes('function(){return Function}()("return this")()')) {
  throw new Error('Basis wrapper still contains the Function-constructor global fallback');
}
await writeFile(targetPath, source);
process.stdout.write('Basis wrapper carries all strict-CSP patches.\n');
