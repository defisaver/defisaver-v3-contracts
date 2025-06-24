const { resetForkToBlock } = require('../utils/utils');
const { compRecipesFullTest } = require('./compound/comp-tests');
const { fullInstRecipesTest } = require('./shift/inst/inst-recipes');
const { mcdRecipesFullTest } = require('./mcd/mcd-tests');

describe('Recipes full test', () => {
    it('... should do full Recipes test', async () => {
        await resetForkToBlock();
        await mcdRecipesFullTest();
        await compRecipesFullTest();
        await fullInstRecipesTest();
    });
});
