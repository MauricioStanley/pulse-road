import fs from "node:fs/promises";
import { build, transform } from "esbuild";
import ts from "typescript";
import { parse } from "acorn";
import { gzipSync } from "node:zlib";
const bundled=await build({entryPoints:["src/lite/main.ts"],bundle:true,write:false,format:"iife",target:"es2015",metafile:true,legalComments:"none"});
if(Object.keys(bundled.metafile.inputs).some(file=>file.includes("node_modules")))
  throw new Error("Ultralight must not bundle third-party runtime dependencies.");
const legacy=ts.transpileModule(bundled.outputFiles[0].text,{compilerOptions:{target:ts.ScriptTarget.ES5,module:ts.ModuleKind.None,removeComments:true}}).outputText;
const compact=await transform(legacy,{target:"es5",minify:true,legalComments:"none"});
parse(compact.code,{ecmaVersion:5});
if(Buffer.byteLength(compact.code)>50000)throw new Error("Ultralight JavaScript exceeded the 50 KB budget.");
await fs.writeFile("public/lite.js",compact.code);
console.log("Ultralight ES5: "+Buffer.byteLength(compact.code)+" bytes; gzip "+gzipSync(compact.code).length+" bytes; zero runtime dependencies.");
