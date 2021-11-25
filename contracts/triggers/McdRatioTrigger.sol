// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../actions/mcd/helpers/McdRatioHelper.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IMCDPriceVerifier.sol";

contract McdRatioTrigger is ITrigger, AdminAuth, McdRatioHelper {
    address public constant MCD_PRICE_VERIFIER = 0xeAa474cbFFA87Ae0F1a6f68a3aBA6C77C656F72c;

    enum RatioState {
        OVER,
        UNDER
    }

    enum RatioCheck {
        CURR_RATIO,
        NEXT_RATIO,
        BOTH_RATIOS
    }

    error WrongNextPrice(uint256);

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
        view
        override
        returns (bool)
    {
        CallParams memory triggerCallData = parseCallInputs(_callData);
        SubParams memory triggerSubData = parseSubInputs(_subData);

        uint256 checkedRatio;
        if (RatioCheck(triggerCallData.ratioCheck) == RatioCheck.CURR_RATIO){
            checkedRatio = getRatio(triggerSubData.vaultId, 0); // GAS 50k
            
        } else if (RatioCheck(triggerCallData.ratioCheck) == RatioCheck.NEXT_RATIO){
            checkedRatio = getRatio(triggerSubData.vaultId, triggerCallData.nextPrice);

        } else if (RatioCheck(triggerCallData.ratioCheck) == RatioCheck.BOTH_RATIOS){
            uint256 ratioWithCurrPrice = getRatio(triggerSubData.vaultId, 0);
            uint256 ratioWithNextPrice = getRatio(triggerSubData.vaultId, triggerCallData.nextPrice);
            
            if (RatioState(triggerSubData.state) == RatioState.OVER) {
                if (ratioWithCurrPrice > ratioWithNextPrice){
                    checkedRatio = ratioWithCurrPrice;
                }else{
                    checkedRatio = ratioWithNextPrice;
                }

            } else {
                if (ratioWithCurrPrice > ratioWithNextPrice){
                    checkedRatio = ratioWithNextPrice;
                }else{
                    checkedRatio = ratioWithCurrPrice;
                }

            }
        }

        // check next price validity if it's sent
        if (triggerCallData.nextPrice != 0) {
            if (
                !IMCDPriceVerifier(MCD_PRICE_VERIFIER).verifyVaultNextPrice(
                    triggerCallData.nextPrice,
                    triggerSubData.vaultId
                )
            ) {
                revert WrongNextPrice(triggerCallData.nextPrice);
            }
        }

        if (RatioState(triggerSubData.state) == RatioState.OVER) {
            if (checkedRatio > triggerSubData.ratio) return true;
        }

        if (RatioState(triggerSubData.state) == RatioState.UNDER) {
            if (checkedRatio < triggerSubData.ratio) return true;
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
