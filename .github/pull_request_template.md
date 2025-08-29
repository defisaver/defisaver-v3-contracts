### Summary

_Briefly describe what this change introduces._

### Type of change

- [ ] Breaking Change - A change that is not backward-compatible.
- [ ] New Feature - A change that adds functionality.
- [ ] Tweak - A change that modifies existing features.
- [ ] Bugfix - A change that resolves an issue.

### Details

_Provide any additional details if needed._

### Checks

#### For New Contracts

- [ ] Does the new contract have tests?
- [ ] Does the contract contain all the NatSpec needed (`@title`, `@notice`, `@param`, etc.)?
- [ ] Is the contract deployed and the address added to the JSON file?
- [ ] If the contract is registered, is the waitPeriod set correctly?
- [ ] Is the contract verified and added to the Tenderly dashboard?
- [ ] Is documentation written for the corresponding DFS action and added to GitBook?

#### For Modifications to Existing Contracts

- [ ] If there were existing tests for the contract, are they adapted for the change and executed?
- [ ] Is the contract redeployed and added to the JSON file?
- [ ] If the contract is registered, is the waitPeriod set correctly?
- [ ] Is the contract verified and added to the Tenderly dashboard?
- [ ] If some parameters were changed and a breaking change was introduced, is the documentation updated on GitBook?

#### For Strategies

- [ ] Are new tests added for the strategy?
- [ ] Is the strategy deployed and added to the JSON file?

### References

_Link any existing PRs, such as SDK PRs related to this PR, or any additional references._
