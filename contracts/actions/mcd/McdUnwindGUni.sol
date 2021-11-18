// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "./helpers/McdHelper.sol";
import "../../interfaces/mcd/IGUniLev.sol";

contract McdUnwindGUni is ActionBase, DSMath,  McdHelper{
    using TokenUtils for address;

    struct Params {
        uint256 minWalletDai;
        address mcdManager;
        uint256 vaultId;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        closeLeveragedPosition(inputData);

        return bytes32(0);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        closeLeveragedPosition(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function closeLeveragedPosition(Params memory _inputData) internal {
        IManager(_inputData.mcdManager).quit(_inputData.vaultId, address(this));

        vat.hope(GUNI_LEV_ADDR);
        IGUniLev(GUNI_LEV_ADDR).unwind(_inputData.minWalletDai);
        vat.nope(GUNI_LEV_ADDR);

        address USDC_ADDR = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
        USDC_ADDR.withdrawTokens(_inputData.to , USDC_ADDR.getBalance(address(this)));
        DAI_ADDR.withdrawTokens(_inputData.to, DAI_ADDR.getBalance(address(this)));
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
