const path = require('path');
const fs = require('fs');
const prettier = require("prettier");
let Console = require('../../console');
const { python } = require('compile-run');
const { getInputs, cleanStdout } = require('./_utils.js');
const bcActivity = require('../../bcActivity.js');

module.exports = async function({ files, socket }){
    socket.log('compiling',['Compiling...']);

    let entryPath = files.map(f => './'+f.path).find(f => f.indexOf('app.py') > -1);
    Console.info(`Compiling ${entryPath}...`);
    const content = fs.readFileSync(entryPath, "utf8");
    const count = getInputs(/input\((?:["'`]{1}(.*)["'`]{1})?\)/gm, content);
    let inputs = (count.length == 0) ? [] : await socket.ask(count);

    const resultPromise = python.runFile(entryPath, { stdin: inputs.join('\n'), executionPath: 'python3' })
        .then(result => {
            socket.clean();

            if(result.stderr){
              socket.log('compiler-error', [ cleanStdout(result.stdout, count), result.stderr ]);
              bcActivity.error('exercise_error', {
                details: result.stderr,
                framework: null,
                language: 'python3',
                message: result.stderr,
                name: bcActivity.getPythonError(result.stderr),
                data: entryPath,
                compiler: 'python3'
              });
              console.log(cleanStdout(result.stdout, count), result.stderr);
              Console.error("There was an error");
            }
            else{
              socket.log('compiler-success', [ cleanStdout(result.stdout, count) ]);
              Console.clean();
              console.log(result.stdout);
            }
        })
        .catch(err => {
            Console.error(err.message || err);
            socket.log('compiler-error',[ err.stderr ]);
            return;
        });
};
