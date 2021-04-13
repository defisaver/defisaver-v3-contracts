// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
// eslint-disable-next-line import/no-extraneous-dependencies
const hre = require('hardhat');
const readline = require('readline');

const start = (main) => {
    if (hre.network.name !== 'mainnet') {
        main()
            .then(() => console.log('\nFinished'))
            .catch((error) => console.error(error));
    } else {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log('-------------------------------------------------------------');
        rl.question(`Network: ${hre.network.name}\nGas price: ${parseInt(hre.network.config.gasPrice, 10) / 1e9} gwei\nCONFIRM [y]/n: `, (answer) => {
            if (answer === 'y' || answer === '') {
                main()
                    .then(() => rl.close())
                    .catch((error) => {
                        console.error(error);
                        rl.close();
                    });
            } else {
                rl.close();
            }
        });

        rl.on('close', () => {
            console.log('\nFinished');
            process.exit(0);
        });
    }
};

module.exports = {
    start,
};
