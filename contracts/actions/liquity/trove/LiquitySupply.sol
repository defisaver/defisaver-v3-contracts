// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../helpers/LiquityHelper.sol";
import "../../../utils/TokenUtils.sol";
import "../../ActionBase.sol";

contract LiquitySupply is ActionBase, LiquityHelper {
    using TokenUtils for address;

    struct Params {
        uint256 collAmount; // Amount of WETH tokens to supply
        address from;       // Address where to pull the tokens from
        address upperHint;
        address lowerHint;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.collAmount = _parseParamUint(
            params.collAmount,
            _paramMapping[0],
            _subData,
            _returnValues
        );
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);

        params.collAmount = _liquitySupply(params);
        return bytes32(params.collAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);

        _liquitySupply(params);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    /// @notice Supplies collateral to the users trove
    function _liquitySupply(Params memory _params) internal returns (uint256) {
        if (_params.collAmount == type(uint256).max) {
            _params.collAmount = TokenUtils.WETH_ADDR.getBalance(_params.from);
        }
        TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, _params.collAmount);
        TokenUtils.withdrawWeth(_params.collAmount);

        BorrowerOperations.addColl{value: _params.collAmount}(_params.upperHint, _params.lowerHint);

        logger.Log(
            address(this),
            msg.sender,
            "LiquitySupply",
            abi.encode(_params.collAmount, _params.from)
        );

        return _params.collAmount;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
