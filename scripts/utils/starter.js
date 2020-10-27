// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
const bre = require("hardhat");
const readline = require("readline");


const start = (main) => {

	if (bre.network.name !== 'mainnet') {
		main()
			.then(() => console.log('\nFinished'))
			.catch(error => console.error(error));
	} else {
		const rl = readline.createInterface({
		    input: process.stdin,
		    output: process.stdout
		});

		console.log('-------------------------------------------------------------');
		rl.question(`Network: ${bre.network.name}\nGas price: ${parseInt(bre.network.config.gasPrice)/1e9} gwei\nCONFIRM [y]/n: `, function(answer) {
			if (answer === 'y' || answer === '') {
				main()
				  .then(() => rl.close())
				  .catch(error => {
				    console.error(error);
				    rl.close();
				  });
			} else {
				rl.close();
			}
		});

		rl.on("close", function() {
		    console.log("\nFinished");
		    process.exit(0);
		});
	}
}

module.exports = {
	start
}