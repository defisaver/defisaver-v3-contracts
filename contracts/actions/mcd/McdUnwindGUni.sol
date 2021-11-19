// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "./../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "./helpers/McdHelper.sol";
import "../../interfaces/mcd/IGUniLev.sol";

/// @title Fully deleverage a GUNI vault
contract McdUnwindGUni is ActionBase, DSMath,  McdHelper{
    using TokenUtils for address;

    /// @param minWalletDai minimum amount of tokens you want to receive after deleverage
    /// @param mcdManager mcdManager address
    /// @param vaultId id of the leveraged vault
    /// @param gUniLevAddr GUniLev contract address
    /// @param to Address to receive all tokens after deleverage
    struct Params {
        uint256 minWalletDai;
        address mcdManager;
        uint256 vaultId;
        address gUniLevAddr;
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
        vat.hope(_inputData.mcdManager);
        IManager(_inputData.mcdManager).quit(_inputData.vaultId, address(this));
        vat.nope(_inputData.mcdManager);

        vat.hope(_inputData.gUniLevAddr);
        IGUniLev(_inputData.gUniLevAddr).unwind(_inputData.minWalletDai);
        vat.nope(_inputData.gUniLevAddr);

        USDC_ADDR.withdrawTokens(_inputData.to , USDC_ADDR.getBalance(address(this)));
        DAI_ADDR.withdrawTokens(_inputData.to, DAI_ADDR.getBalance(address(this)));
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
