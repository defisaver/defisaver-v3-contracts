const fs = require('fs');

const { getAllFiles } = require('../scripts/utils/utils.js');
const { getNameId } = require('../test/utils.js');

// doesn't work well for params in errors that have structs (need to be done by hand)
const getErrorsFromContracts = async () => {
    const filePaths = await getAllFiles('./contracts/');

    let errList = [];

    for (let i = 0; i < filePaths.length; i++) {
        const filepath = filePaths[i];

        const isSolFile = filepath.indexOf('.sol') !== -1;

        if (isSolFile) {
            const fileContent = await fs.promises.readFile(filepath, 'utf8');

            const fullPath = filepath.split('/');
            const fileName = fullPath[fullPath.length - 1];

            // extract all errors from the contract
            const errRegex = /^\s*(error\s.*;)$/gm;;
            const errorStrings = fileContent.match(errRegex) || [];

            errorStrings.forEach((err) => {
                // get only error name without the error prefix
                const startIndex = err.indexOf('error');
                err = err.substring(startIndex + 6, err.length - 1);

                const fullString = `${err}`;

                // parse error inputs
                const startParamsIndex = err.indexOf('(');
                let paramString = err.substring(startParamsIndex + 1, err.length - 1);

                // if there are params in the error
                if (paramString.length > 2) {
                    let newParamString = '(';

                    const paramInputs = paramString.split(',');

                    paramInputs.forEach((param, index) => {
                        const inputNames = param.split(' ');

                        // remove named params to properly compute id
                        if (inputNames.length > 1) {
                            newParamString += inputNames[0] === '' ? inputNames[1] : inputNames[0];
                            newParamString += ','
                        } else if (inputNames.length === 1) {
                            newParamString += inputNames[0];
                            newParamString += ','
                        }
                    });

                    newParamString = newParamString.slice(0, -1); 

                    newParamString += ')';

                    err = err.substring(0, startParamsIndex) + newParamString;

                }

                const alreadyIncluded = errList.find((e) => e.fullError === fullString);

                // don't add duplicates
                if (!alreadyIncluded) {
                    errList.push({
                        fullError: fullString,
                        parsedError: err,
                        id: getNameId(err),
                        contractName: fileName
                    });
                }
            });
        }
    }

    console.log(errList);

    // errList = errList.map((err) => err.id);
    // fs.writeFileSync('output.json', JSON.stringify(errList, null, 2));

};

(async () => {
    await getErrorsFromContracts();
})();