// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../auth/AdminAuth.sol";
import "../actions/mcd/helpers/McdRatioHelper.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IMCDPriceVerifier.sol";
import "../utils/TempStorage.sol";
import "../core/helpers/CoreHelper.sol";
import "../core/DFSRegistry.sol";

contract McdRatioTrigger is ITrigger, AdminAuth, McdRatioHelper, CoreHelper {
    address public constant MCD_PRICE_VERIFIER = 0xeAa474cbFFA87Ae0F1a6f68a3aBA6C77C656F72c;

    bytes4 constant TEMP_STORAGE_ID = bytes4(keccak256("TempStorage"));

    DFSRegistry public constant registry = DFSRegistry(REGISTRY_ADDR);

    error WrongNextPrice(uint256);

    enum RatioState {
        OVER,
        UNDER
    }

    enum RatioCheck {
        CURR_RATIO,
        NEXT_RATIO,
        BOTH_RATIOS
    }

    struct CallParams {
        uint256 nextPrice;
        uint8 ratioCheck;
    }

    struct SubParams {
        uint256 vaultId;
        uint256 ratio;
        uint8 state;
    }

    function isTriggered(bytes memory _callData, bytes memory _subData)
        public
        override
        returns (bool)
    {
        CallParams memory triggerCallData = parseCallInputs(_callData);
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 checkedRatio;
        bool shouldTriggerCurr;
        bool shouldTriggerNext;

        if (RatioCheck(triggerCallData.ratioCheck) == RatioCheck.CURR_RATIO || RatioCheck(triggerCallData.ratioCheck) == RatioCheck.BOTH_RATIOS){
            checkedRatio = getRatio(triggerSubData.vaultId, 0);
            shouldTriggerCurr = shouldTrigger(triggerSubData.state, checkedRatio, triggerSubData.ratio);
        }

        if (RatioCheck(triggerCallData.ratioCheck) == RatioCheck.NEXT_RATIO || RatioCheck(triggerCallData.ratioCheck) == RatioCheck.BOTH_RATIOS){
            checkedRatio = getRatio(triggerSubData.vaultId, triggerCallData.nextPrice);
            
            shouldTriggerNext = shouldTrigger(triggerSubData.state, checkedRatio, triggerSubData.ratio);

            if (
                !IMCDPriceVerifier(MCD_PRICE_VERIFIER).verifyVaultNextPrice(
                    triggerCallData.nextPrice,
                    triggerSubData.vaultId
                )
            ) {
                revert WrongNextPrice(triggerCallData.nextPrice);
            }
        }

        address tempStorageAddr = registry.getAddr(TEMP_STORAGE_ID);
        TempStorage(tempStorageAddr).set("MCD_RATIO", bytes32(checkedRatio));

        return shouldTriggerCurr || shouldTriggerNext;
    }
    
    function shouldTrigger(uint8 state, uint256 checkedRatio, uint256 subbedToRatio) internal pure returns (bool){
        if (RatioState(state) == RatioState.OVER) {
            if (checkedRatio > subbedToRatio) return true;
        }
        if (RatioState(state) == RatioState.UNDER) {
            if (checkedRatio < subbedToRatio) return true;
        }

        return false;
    }

    function changedSubData(bytes memory _subData) public pure override returns (bytes memory) {}

    function isChangeable() public pure override returns (bool) {
        return false;
    }

    function parseCallInputs(bytes memory _callData)
        internal
        pure
        returns (CallParams memory params)
    {
        params = abi.decode(_callData, (CallParams));
    }

    function parseSubInputs(bytes memory _subData) internal pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
