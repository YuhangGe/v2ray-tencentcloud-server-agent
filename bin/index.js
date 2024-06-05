const { processDocx, logger } = require('../dist/index.cjs');

logger.debug = require('debug')('docxer');
const fs = require('fs');
const path = require('path');

function panic(err) {
  console.error(err);
  process.exit(-1);
}

if (process.argv.length < 4) {
  panic(`参数错误！
使用说明：docxer (inputDocxFile) (inputDataFile) [outputDocxFile]
使用示例：docxer /var/some_path/template.docx /var/some_path/render_data.json /var/some_path/output.docx`);
}

let [inputDocxFile, inputDataFile, outputDocxFile] = process.argv.slice(2).map((v) => path.resolve(process.cwd(), v));
if (!inputDocxFile.endsWith('.docx')) {
  panic('输入文件只支持 .docx 后缀名');
}
if (!outputDocxFile) {
  outputDocxFile = inputDocxFile.replace('.docx', '.render.docx');
}
console.log(outputDocxFile);
const inputDocxBuf = fs.readFileSync(inputDocxFile);
const inputData = JSON.parse(fs.readFileSync(inputDataFile, 'utf-8'));
processDocx({
  docxFileBuf: inputDocxBuf,
  renderData: inputData,
}).then(
  (result) => {
    fs.writeFileSync(outputDocxFile, result);
  },
  (err) => {
    console.error(err.message);
    process.exit(-1);
  },
);
