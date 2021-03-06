let fs = require('fs')
let shell = require('shelljs')
const fetch = require("node-fetch")
const Console = require('../console')
var sleep = require('sleep')
var readlineSync = require('readline-sync')

module.exports = {
    basePath: __dirname+`/scripts/`,
    boilerplates: {
      projects: null,
      exercises: null
    },
    scripts: [],
    isValidScript(scriptName){
        if (this.scripts.find(s => s === (scriptName+'.js'))) return true
        else return false
    },
    downloadAndInstall(type, name, flags=null){
        Console.debug('Fetching boilerplates...')
        fetch(`https://breatheco-de.github.io/breathecode-cli/src/commands/start/${type}.json`)
        .then(response => {
            response.json().then(boilerplates => {
                if (typeof(boilerplates[name]) === 'undefined') throw new Error('Invalid project: '+name)

                this.boilerplates[type] = boilerplates
                this.install(type, name, flags)

            })
        })
        .catch(error => {
            Console.error(`There was a problem fetching from https://breatheco-de.github.io/breathecode-cli/src/commands/start/${type}.json`)
            Console.fatal(error)
        })

    },
    getScripts(){
        return fs.readdir(this.basePath, (err, files) => {
            this.scripts = files.map(file => {
                return file
            })
        })
    },
    install(type, name, flags=null){

        Console.startLoading()
        Console.log('Verifing git installation')
        if (!shell.which('git')) {
          Console.fatal('Sorry, this script requires git')
          shell.exit(1)
        }

        Console.log('Cloning from '+this.boilerplates[type][name].url)
        if(flags && flags.mode){
            if (shell.exec(`git clone -b ${flags.mode} ${this.boilerplates[type][name].url}`).code !== 0) {
              Console.fatal('Error: Installation failed')
              shell.exit(1)
            }
        }
        else{
            if (shell.exec(`git clone ${this.boilerplates[type][name].url}`).code !== 0) {
              Console.fatal('Error: Installation failed')
              shell.exit(1)
            }
        }

        Console.log('Cleaning installation')
        if (shell.exec(`rm -R -f ./${this.boilerplates[type][name].folder}/.git`).code !== 0) {
          Console.fatal('Error: removing .git directory')
          shell.exit(1)
        }

        let warning = false
        if (flags && flags.root)
        {
            Console.log('Moving to root')

            const commands = [`mv ${this.boilerplates[type][name].folder}/* ./`,`mv ${this.boilerplates[type][name].folder}/.* ./`,`rmdir ${this.boilerplates[type][name].folder}/`]

            var cleanDir = readlineSync.question('This option will clear the entire folder. Continue? (y/n) ');
            cleanDir = cleanDir.toUpperCase();

            if(cleanDir === 'Y'){

                shell.rm('-r', `!(${this.boilerplates[type][name].folder})`);

                commands.forEach((cmd) => {
                    if (shell.exec(cmd).code !== 0) warning = true
                    sleep.sleep(1)
                })

                if(flags.name){
                    const commands = [`mv -f ${flags.name}/* ./`,`mv -f ${flags.name}/.* ./`,`rmdir ${flags.name}/`]
                    commands.forEach((cmd) => {
                        if (shell.exec(cmd).code !== 0) warning = true
                        sleep.sleep(1)
                    })
                }
            }
            else if (cleanDir === 'N'){
                console.log(`Please clear this folder if you would like to use the -r option or create another empty directory. Cleaning files and exiting`);
                shell.rm('-r', `${this.boilerplates[type][name].folder}`);
            }
            else{
                console.log(`${cleanDir} is not a valid option. Cleaning files and exiting.`);
                shell.rm('-r', `${this.boilerplates[type][name].folder}`);
            }
        }
        else{
            if(flags && flags.name){
                const from = this.boilerplates[type][name].folder;
                const to = flags.name;
                if (!shell.test('-d', flags.name)){
                    shell.mkdir('-p', flags.name)
                }
                const commands = [`cp -R ${from}/* ./${to}`,`mv -f ${from}/.* ./${to}`,`rm -R -f ${from}/`]
                commands.forEach((cmd) => {
                    if (shell.exec(cmd).code !== 0) warning = true
                    sleep.sleep(1)
                })
            }
        }
        if (warning) Console.warning(`There seems to be and error when moving the files, make sure there is no ${this.boilerplates[type][name].folder} directory anymore`)

        Console.stopLoading()
        Console.success('Done')
    },
    execute(scriptName, incomingFlags=null){

        return new Promise((resolve, reject) => {

            let flags = ''
            if (incomingFlags) for (var key in incomingFlags) flags += ` --${key} ${(incomingFlags[key]) ? incomingFlags[key] : ''}`
            if (shell.exec(`node ${this.basePath}${scriptName}${flags}`).code !== 0) {
              shell.echo(`Error executing ${scriptName}`)
              shell.exit(1)
              throw `Error executing ${scriptName}`
            }
            else{
                resolve()
            }
        })

    }
}
