// eslint-disable-next-line import/no-extraneous-dependencies
require('dotenv-safe').config();
const fs = require('fs');
const { spawnSync } = require('child_process');

const { program } = require('commander');

const {
    parse,
    stringify,
} = require('envfile');

const path = require('path');
const {
    createFork, topUp,
} = require('../scripts/utils/fork');

program.version('0.0.1');

function setEnv(key, value) {
    const pathToEnv = path.join(__dirname, '/../.env');
    fs.readFile(pathToEnv, 'utf8', (err, data) => {
        const result = parse(data);
        result[key] = value;

        // eslint-disable-next-line consistent-return
        fs.writeFile(pathToEnv, stringify(result), (err2) => {
            if (err) {
                return console.log(err2);
            }
        });
    });
}

(async () => {
    program
        .option('-d, --deploy', 'Deploys all the contracts on the fork')
        .option('-n, --new-fork', 'Created new fork id')
        .option('-g, --gib <user>', 'Gives user fork eth');

    //
    // .option('-s, --sub-raw <strategy-id> <data>', 'Subscribes with raw byte code data')
    // .option('--sub-yearn <ratio> <cdpId>', 'Sub to yearn')

    program.parse(process.argv);

    const options = program.opts();

    if (options.deploy) {
        console.log('This might take a few minutes dont stop the process');

        await spawnSync('npm run deploy fork deploy-on-fork',
            {
                shell: true,
                stdio: [process.stdin, process.stdout, process.stderr],
                encoding: 'utf-8',
            });
    }

    if (options.newFork) {
        const forkId = await createFork();

        console.log(`Fork id: ${forkId}   |   Rpc url https://rpc.tenderly.co/fork/${forkId}`);

        setEnv('FORK_ID', forkId);
    }

    if (options.gib) {
        await topUp(options.gib);
        console.log(`Acc: ${options.gib} credited with 100 Eth`);
    }
})();
