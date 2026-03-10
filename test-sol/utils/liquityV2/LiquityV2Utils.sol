// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { Tokens } from "../../utils/Tokens.sol";

contract LiquityV2Utils is Tokens {
    function _simulateCollGain(
        address _stabilityPool,
        uint256 _simulatedCollGain,
        address _collToken,
        address _walletAddr
    ) internal {
        uint256 collBalanceStorageSlot = 3;
        uint256 stashedCollMappingSlot = 9;
        vm.store(_stabilityPool, bytes32(collBalanceStorageSlot), bytes32(_simulatedCollGain));
        vm.store(
            _stabilityPool,
            keccak256(abi.encode(_walletAddr, stashedCollMappingSlot)),
            bytes32(_simulatedCollGain)
        );
        give(_collToken, _stabilityPool, _simulatedCollGain * 2);
    }
}
