const lines = [
  "use std::fs;",
  "use reqwest::Client;",
  "pub struct Server {",
  "    port: u16,",
  "}",
  "impl Server {",
  "    pub async fn start(&self) {}",
  "}",
  "fn main() {}"
];

let imports = 0, funcs = 0, classes = 0;

for (const line of lines) {
  const t = line.trim();
  console.log("TESTING:", t);
  if (/^(?:import|from|use|using)\\s/.test(t) || /^#include/.test(t)) {
    console.log("  MATCHED IMPORT");
    imports++;
  }
  if (
    /(?:function |const \\w+\\s*=\\s*(?:\\(|async ))/.test(t) || 
    /^\\s*def\\s+\\w+/.test(t) || 
    /^\\s*(?:pub\\s+)?(?:async\\s+)?fn\\s+\\w+/.test(t) || 
    /^\\s*func\\s+\\w+/.test(t) ||
    /^\\s*(?:public|private|protected|static|virtual|override|async|inline)*\\s*[\\w<>\\[\\]]+\\s+\\w+\\s*\\(/.test(t) && !t.includes(';') && !t.includes('new ')
  ) {
    console.log("  MATCHED FUNC");
    funcs++;
  }
  if (/^(?:export\\s+|public\\s+|private\\s+|pub\\s+)?(?:class|struct|interface|trait|type\\s+\\w+\\s+struct)\\b/.test(t)) {
    console.log("  MATCHED CLASS");
    classes++;
  }
}
console.log({ imports, funcs, classes });
