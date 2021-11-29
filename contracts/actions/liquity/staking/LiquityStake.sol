// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

contract LiquityStake is ActionBase, LiquityHelper {
    using TokenUtils for address;

    struct Params {
        uint256 lqtyAmount; // Amount of LQTY tokens to stake
        address from;       // Address where to pull the tokens from
        address wethTo;     // Address that will receive ETH(wrapped) gains
        address lusdTo;     // Address that will receive LUSD token gains
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.lqtyAmount = _parseParamUint(params.lqtyAmount, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.wethTo = _parseParamAddr(params.wethTo, _paramMapping[2], _subData, _returnValues);
        params.lusdTo = _parseParamAddr(params.lusdTo, _paramMapping[3], _subData, _returnValues);

        params.lqtyAmount = _liquityStake(params);
        return bytes32(params.lqtyAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _liquityStake(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Stakes LQTY tokens
    function _liquityStake(Params memory _params) internal returns (uint256) {
        if (_params.lqtyAmount == type(uint256).max) {
            _params.lqtyAmount = LQTY_TOKEN_ADDRESS.getBalance(_params.from);
        }

        uint256 ethGain = LQTYStaking.getPendingETHGain(address(this));
        uint256 lusdGain = LQTYStaking.getPendingLUSDGain(address(this));

        LQTY_TOKEN_ADDRESS.pullTokensIfNeeded(_params.from, _params.lqtyAmount);
        LQTYStaking.stake(_params.lqtyAmount);

        withdrawStaking(ethGain, lusdGain, _params.wethTo, _params.lusdTo);

        logger.Log(
            address(this),
            msg.sender,
            "LiquityStake",
            abi.encode(
                _params,
                ethGain,
                lusdGain
            )
        );

        return _params.lqtyAmount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
