const { utilsActionsFullTest, changeOwnerTest, automationV2UnsubTest } = require('./utils-actions-tests');

describe('Utils full test', () => {
    it('... should do full Utils test', async () => {
        await utilsActionsFullTest();
        await changeOwnerTest();
        await automationV2UnsubTest();
    });
});
